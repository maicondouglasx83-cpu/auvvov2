<?php
declare(strict_types=1);

/**
 * Evita disparos duplicados de automações (ex.: vários fluxos de boas-vindas no primeiro WhatsApp).
 */
require_once __DIR__ . '/migrations.php';

function auvvo_crm_dedupe_global_key(string $triggerType, string $triggerValue): ?string
{
    if ($triggerType === 'whatsapp_first') {
        return 'global:whatsapp_first';
    }
    if ($triggerType === 'contact_created' && in_array($triggerValue, ['whatsapp', '*'], true)) {
        return 'global:first_contact';
    }
    return null;
}

function auvvo_crm_dedupe_source_key(
    string $sourceType,
    int $sourceId,
    string $triggerType,
    string $triggerValue
): string {
    return $sourceType . ':' . $sourceId . ':' . $triggerType . ':' . $triggerValue;
}

function auvvo_crm_dedupe_is_blocked(
    PDO $pdo,
    int $userId,
    int $contactId,
    ?string $globalKey,
    ?string $sourceKey
): bool {
    if ($userId <= 0 || $contactId <= 0) {
        return true;
    }
    try {
        if ($globalKey !== null && $globalKey !== '') {
            $st = $pdo->prepare(
                'SELECT id FROM crm_automation_dedupe
                 WHERE user_id = ? AND contact_id = ? AND dedupe_key = ? LIMIT 1'
            );
            $st->execute([$userId, $contactId, $globalKey]);

            if ($st->fetchColumn()) {
                return true;
            }
        }
        if ($sourceKey !== null && $sourceKey !== '') {
            $st = $pdo->prepare(
                'SELECT id FROM crm_automation_dedupe
                 WHERE user_id = ? AND contact_id = ? AND dedupe_key = ? LIMIT 1'
            );
            $st->execute([$userId, $contactId, $sourceKey]);

            return (bool) $st->fetchColumn();
        }
    } catch (PDOException $e) {
        error_log('[Auvvo] dedupe_is_blocked: ' . $e->getMessage());

        return true;
    }

    return false;
}

function auvvo_crm_dedupe_mark(
    PDO $pdo,
    int $userId,
    int $contactId,
    ?string $globalKey,
    ?string $sourceKey
): void {
    if ($userId <= 0 || $contactId <= 0) {
        return;
    }
    $keys = [];
    if ($globalKey !== null && $globalKey !== '') {
        $keys[] = $globalKey;
    }
    if ($sourceKey !== null && $sourceKey !== '' && !in_array($sourceKey, $keys, true)) {
        $keys[] = $sourceKey;
    }
    if ($keys === []) {
        return;
    }
    try {
        $ins = $pdo->prepare(
            'INSERT IGNORE INTO crm_automation_dedupe (user_id, contact_id, dedupe_key) VALUES (?,?,?)'
        );
        foreach ($keys as $k) {
            $ins->execute([$userId, $contactId, $k]);
        }
    } catch (PDOException $e) {
        error_log('[Auvvo] dedupe_mark: ' . $e->getMessage());
    }
}

/**
 * @param 'rule'|'flow' $sourceType
 */
function auvvo_crm_dedupe_should_skip_source(
    PDO $pdo,
    int $userId,
    array $contact,
    string $sourceType,
    int $sourceId,
    string $triggerType,
    string $triggerValue
): bool {
    $contactId = (int) ($contact['id'] ?? 0);
    if ($contactId <= 0) {
        return true;
    }
    $globalKey = auvvo_crm_dedupe_global_key($triggerType, $triggerValue);
    $sourceKey = $sourceId > 0
        ? auvvo_crm_dedupe_source_key($sourceType, $sourceId, $triggerType, $triggerValue)
        : null;

    return auvvo_crm_dedupe_is_blocked($pdo, $userId, $contactId, $globalKey, $sourceKey);
}

/**
 * @param 'rule'|'flow' $sourceType
 */
function auvvo_crm_dedupe_mark_source(
    PDO $pdo,
    int $userId,
    array $contact,
    string $sourceType,
    int $sourceId,
    string $triggerType,
    string $triggerValue
): void {
    $contactId = (int) ($contact['id'] ?? 0);
    if ($contactId <= 0) {
        return;
    }
    $globalKey = auvvo_crm_dedupe_global_key($triggerType, $triggerValue);
    $sourceKey = $sourceId > 0
        ? auvvo_crm_dedupe_source_key($sourceType, $sourceId, $triggerType, $triggerValue)
        : null;
    auvvo_crm_dedupe_mark($pdo, $userId, $contactId, $globalKey, $sourceKey);
}
