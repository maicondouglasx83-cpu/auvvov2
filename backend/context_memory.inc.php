<?php
declare(strict_types=1);

require_once __DIR__ . '/migrations.php';

function auvvo_conversation_summary_get(PDO $pdo, int $agentId, string $contactJid): string
{
    auvvo_run_migrations($pdo);
    try {
        $stmt = $pdo->prepare(
            'SELECT summary_text FROM conversation_summaries WHERE agent_id = ? AND contact_jid = ? LIMIT 1'
        );
        $stmt->execute([$agentId, $contactJid]);

        return trim((string) ($stmt->fetchColumn() ?: ''));
    } catch (PDOException $e) {
        return '';
    }
}

function auvvo_contact_memory_get(PDO $pdo, int $userId, string $jid): array
{
    try {
        $stmt = $pdo->prepare('SELECT memory_json FROM contacts WHERE user_id = ? AND jid = ? LIMIT 1');
        $stmt->execute([$userId, $jid]);
        $raw = $stmt->fetchColumn();
        if (!$raw) {
            return [];
        }
        $decoded = json_decode((string) $raw, true);

        return is_array($decoded) ? $decoded : [];
    } catch (PDOException $e) {
        return [];
    }
}

function auvvo_contact_memory_merge(PDO $pdo, int $userId, string $jid, array $facts): void
{
    if ($facts === []) {
        return;
    }
    $current = auvvo_contact_memory_get($pdo, $userId, $jid);
    foreach ($facts as $k => $v) {
        $key = (string) $k;
        if ($v === null) {
            unset($current[$key]);
            continue;
        }
        if ($v !== '') {
            $current[$key] = $v;
        }
    }
    try {
        $pdo->prepare('UPDATE contacts SET memory_json = ? WHERE user_id = ? AND jid = ?')
            ->execute([json_encode($current, JSON_UNESCAPED_UNICODE), $userId, $jid]);
    } catch (PDOException $e) {
        error_log('[Auvvo] memory_merge: ' . $e->getMessage());
    }
}

/**
 * Conta turnos completos da conversa.
 */
function auvvo_conversation_turn_count(PDO $pdo, int $agentId, string $contactJid): int
{
    try {
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) FROM conversation_logs
             WHERE agent_id = ? AND contact_jid = ?
               AND type = 'ai' AND response_msg IS NOT NULL AND TRIM(response_msg) != ''"
        );
        $stmt->execute([$agentId, $contactJid]);

        return (int) $stmt->fetchColumn();
    } catch (PDOException $e) {
        return 0;
    }
}

/**
 * Agenda sumarização após resposta (chamada leve; LLM no internal summarize).
 */
function auvvo_maybe_schedule_summarization(PDO $pdo, int $agentId, string $contactJid, int $userId): void
{
    $threshold = max(10, (int) ($_ENV['CONTEXT_SUMMARIZE_AFTER_TURNS'] ?? 15));
    $turns     = auvvo_conversation_turn_count($pdo, $agentId, $contactJid);
    if ($turns < $threshold || $turns % 5 !== 0) {
        return;
    }
    try {
        $pdo->prepare(
            "INSERT INTO auvvo_ai_jobs (
                agent_id, pending_log_id, canonical_jid, remote_jid, peer_digits, body,
                evolution_instance_label, lock_peer, dedupe_key, trace_id, status, flush_at
            ) VALUES (?, NULL, ?, ?, '', ?, '', ?, ?, '', 'pending', NOW())"
        )->execute([
            $agentId,
            $contactJid,
            $contactJid,
            json_encode(['action' => 'summarize', 'contact_jid' => $contactJid], JSON_UNESCAPED_UNICODE),
            'summarize:' . md5($contactJid),
            'summarize:' . substr(md5($contactJid . (string) $turns), 0, 16),
        ]);
    } catch (PDOException $e) {
    }
}
