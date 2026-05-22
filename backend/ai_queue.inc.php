<?php
/**
 * Fila MySQL — webhook enfileira; auvvo-worker (Node) consome.
 */
declare(strict_types=1);

require_once __DIR__ . '/migrations.php';

function auvvo_webhook_debounce_seconds(): int
{
    return max(1, min(30, (int) ($_ENV['WEBHOOK_DEBOUNCE_SEC'] ?? 4)));
}

function auvvo_ai_jobs_ensure_table(PDO $pdo): void
{
    auvvo_run_migrations($pdo);
}

/**
 * Enfileira mensagem com debounce por (agent_id, lock_peer).
 *
 * @return array{ok:bool, merged?:bool, job_id?:int, error?:string}
 */
function auvvo_ai_enqueue_inbound_message(PDO $pdo, array $p): array
{
    auvvo_ai_jobs_ensure_table($pdo);

    $agentId   = (int) ($p['agent_id'] ?? 0);
    $lockPeer  = (string) ($p['lock_peer'] ?? '');
    $body      = (string) ($p['body'] ?? '');
    $debounce  = auvvo_webhook_debounce_seconds();

    if ($agentId <= 0 || $lockPeer === '' || trim($body) === '') {
        return ['ok' => false, 'error' => 'invalid_params'];
    }

    $peerKey = 'peer:' . $lockPeer;

    try {
        $stmt = $pdo->prepare(
            "SELECT id, body, pending_log_id FROM auvvo_ai_jobs
             WHERE agent_id = ? AND lock_peer = ? AND status IN ('debouncing','pending')
             ORDER BY id DESC LIMIT 1 FOR UPDATE"
        );
        $stmt->execute([$agentId, $lockPeer]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $mergedBody = trim((string) $existing['body']) . "\n" . trim($body);
            $connId = (int) ($p['whatsapp_connection_id'] ?? 0);
            if ($connId > 0 && auvvo_migration_column_exists($pdo, 'auvvo_ai_jobs', 'whatsapp_connection_id')) {
                $pdo->prepare(
                    "UPDATE auvvo_ai_jobs SET
                        body = ?,
                        remote_jid = ?,
                        canonical_jid = ?,
                        peer_digits = ?,
                        evolution_instance_label = ?,
                        trace_id = ?,
                        whatsapp_connection_id = ?,
                        status = 'debouncing',
                        flush_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
                        updated_at = NOW()
                     WHERE id = ?"
                )->execute([
                    $mergedBody,
                    (string) ($p['remote_jid'] ?? ''),
                    (string) ($p['canonical_jid'] ?? ''),
                    (string) ($p['peer_digits'] ?? ''),
                    (string) ($p['evolution_instance_label'] ?? ''),
                    (string) ($p['trace_id'] ?? ''),
                    $connId,
                    $debounce,
                    (int) $existing['id'],
                ]);
            } else {
                $pdo->prepare(
                    "UPDATE auvvo_ai_jobs SET
                        body = ?,
                        remote_jid = ?,
                        canonical_jid = ?,
                        peer_digits = ?,
                        evolution_instance_label = ?,
                        trace_id = ?,
                        status = 'debouncing',
                        flush_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
                        updated_at = NOW()
                     WHERE id = ?"
                )->execute([
                    $mergedBody,
                    (string) ($p['remote_jid'] ?? ''),
                    (string) ($p['canonical_jid'] ?? ''),
                    (string) ($p['peer_digits'] ?? ''),
                    (string) ($p['evolution_instance_label'] ?? ''),
                    (string) ($p['trace_id'] ?? ''),
                    $debounce,
                    (int) $existing['id'],
                ]);
            }

            return ['ok' => true, 'merged' => true, 'job_id' => (int) $existing['id']];
        }

        $pendingLogId = $p['pending_log_id'] ?? null;
        $dedupeKey    = (string) ($p['dedupe_key'] ?? $peerKey);
        $connId       = (int) ($p['whatsapp_connection_id'] ?? 0);
        $hasConnCol   = auvvo_migration_column_exists($pdo, 'auvvo_ai_jobs', 'whatsapp_connection_id');

        if ($hasConnCol) {
            $ins = $pdo->prepare(
                "INSERT INTO auvvo_ai_jobs (
                    agent_id, whatsapp_connection_id, pending_log_id, canonical_jid, remote_jid, peer_digits, body,
                    evolution_instance_label, lock_peer, dedupe_key, trace_id, status, flush_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?, 'debouncing', DATE_ADD(NOW(), INTERVAL ? SECOND))"
            );
            $ins->execute([
                $agentId,
                $connId > 0 ? $connId : null,
                $pendingLogId,
                (string) ($p['canonical_jid'] ?? ''),
                (string) ($p['remote_jid'] ?? ''),
                (string) ($p['peer_digits'] ?? ''),
                $body,
                (string) ($p['evolution_instance_label'] ?? ''),
                $lockPeer,
                $dedupeKey,
                (string) ($p['trace_id'] ?? ''),
                $debounce,
            ]);
        } else {
            $ins = $pdo->prepare(
                'INSERT INTO auvvo_ai_jobs (
                    agent_id, pending_log_id, canonical_jid, remote_jid, peer_digits, body,
                    evolution_instance_label, lock_peer, dedupe_key, trace_id, status, flush_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,\'debouncing\', DATE_ADD(NOW(), INTERVAL ? SECOND))'
            );
            $ins->execute([
                $agentId,
                $pendingLogId,
                (string) ($p['canonical_jid'] ?? ''),
                (string) ($p['remote_jid'] ?? ''),
                (string) ($p['peer_digits'] ?? ''),
                $body,
                (string) ($p['evolution_instance_label'] ?? ''),
                $lockPeer,
                $dedupeKey,
                (string) ($p['trace_id'] ?? ''),
                $debounce,
            ]);
        }

        return ['ok' => true, 'merged' => false, 'job_id' => (int) $pdo->lastInsertId()];
    } catch (PDOException $e) {
        $dup = isset($e->errorInfo[1]) && (int) $e->errorInfo[1] === 1062;
        if ($dup) {
            return ['ok' => true, 'merged' => true, 'error' => 'duplicate'];
        }
        error_log('[Auvvo] enqueue: ' . $e->getMessage());

        return ['ok' => false, 'error' => $e->getMessage()];
    }
}

/** Promove jobs debouncing prontos para pending (worker também pode filtrar por flush_at). */
function auvvo_ai_promote_debounced_jobs(PDO $pdo, int $limit = 50): int
{
    try {
        $stmt = $pdo->prepare(
            "UPDATE auvvo_ai_jobs SET status = 'pending', updated_at = NOW()
             WHERE status = 'debouncing' AND (flush_at IS NULL OR flush_at <= NOW())
             ORDER BY flush_at ASC, id ASC
             LIMIT ?"
        );
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount();
    } catch (PDOException $e) {
        return 0;
    }
}

function auvvo_ai_queue_stats(PDO $pdo, ?int $userId = null): array
{
    auvvo_ai_jobs_ensure_table($pdo);
    $where = '';
    $params = [];
    if ($userId !== null && $userId > 0) {
        $where = ' WHERE agent_id IN (SELECT id FROM agents WHERE user_id = ?)';
        $params[] = $userId;
    }
    try {
        $sql = "SELECT status, COUNT(*) AS c FROM auvvo_ai_jobs{$where} GROUP BY status";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $out = ['debouncing' => 0, 'pending' => 0, 'processing' => 0, 'done' => 0, 'failed' => 0];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $out[$row['status']] = (int) $row['c'];
        }

        return $out;
    } catch (PDOException $e) {
        return [];
    }
}
