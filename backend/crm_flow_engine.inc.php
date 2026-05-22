<?php
declare(strict_types=1);

require_once __DIR__ . '/migrations.php';
require_once __DIR__ . '/crm_automation.inc.php';
require_once __DIR__ . '/crm_automation_motor.inc.php';
require_once __DIR__ . '/crm_automation_dedupe.inc.php';
require_once __DIR__ . '/crm_automation_runs.inc.php';
require_once __DIR__ . '/crm_flow_agent.inc.php';
require_once __DIR__ . '/crm_flow_wait_reply.inc.php';

/**
 * @return array<string, array>
 */
function auvvo_flow_parse_nodes(?string $flowDataJson): array
{
    if ($flowDataJson === null || $flowDataJson === '') {
        return [];
    }
    $data = json_decode($flowDataJson, true);
    if (!is_array($data)) {
        return [];
    }
    $home = $data['drawflow']['Home']['data'] ?? $data['Home']['data'] ?? null;
    if (!is_array($home)) {
        return [];
    }

    return $home;
}

function auvvo_flow_trigger_matches(array $nodeData, string $triggerType, string $triggerValue): bool
{
    $nt = trim((string) ($nodeData['trigger_type'] ?? ''));
    if ($nt === '' || $nt !== $triggerType) {
        return false;
    }
    $nv = trim((string) ($nodeData['trigger_value'] ?? '*'));
    if ($nv === '' || $nv === '*') {
        return true;
    }
    if ($nv === $triggerValue) {
        return true;
    }
    if (in_array($nt, ['whatsapp_first', 'whatsapp_message'], true) && ctype_digit($nv) && ctype_digit($triggerValue)) {
        return (int) $nv === (int) $triggerValue;
    }

    return false;
}

/**
 * @return list<string>
 */
function auvvo_flow_next_node_ids(array $node, string $outputKey): array
{
    $ids = [];
    $conns = $node['outputs'][$outputKey]['connections'] ?? [];
    if (!is_array($conns)) {
        return $ids;
    }
    foreach ($conns as $conn) {
        if (!empty($conn['node'])) {
            $ids[] = (string) $conn['node'];
        }
    }

    return $ids;
}

function auvvo_flow_bump_stats(PDO $pdo, int $flowId, string $field): void
{
    $allowed = ['stats_entered' => 1, 'stats_success' => 1, 'stats_error' => 1];
    if (!isset($allowed[$field])) {
        return;
    }
    try {
        $pdo->prepare("UPDATE crm_automation_flows SET {$field} = {$field} + 1 WHERE id = ?")->execute([$flowId]);
    } catch (PDOException $e) {
    }
}

/**
 * @return 'ok'|'paused'|'skip'
 */
function auvvo_flow_walk(
    PDO $pdo,
    int $userId,
    int $flowId,
    array $nodes,
    string $startNodeId,
    array &$contact,
    string $triggerType,
    string $triggerValue,
    array $context = [],
    int $depth = 0
): string {
    if ($depth > 64 || $startNodeId === '' || !isset($nodes[$startNodeId])) {
        return 'skip';
    }

    $node = $nodes[$startNodeId];
    $class = (string) ($node['class'] ?? '');
    $data = is_array($node['data'] ?? null) ? $node['data'] : [];
    $nodeLabel = auvvo_automation_node_label($node);

    switch ($class) {
        case 'flow_trigger':
            auvvo_automation_run_log_step($pdo, $context, $startNodeId, $class, $nodeLabel, 'ok', 'Gatilho: ' . ($data['trigger_type'] ?? ''));
            $next = auvvo_flow_next_node_ids($node, 'output_1');
            return auvvo_flow_walk_many($pdo, $userId, $flowId, $nodes, $next, $contact, $triggerType, $triggerValue, $context, $depth + 1);

        case 'flow_condition':
            $ok = auvvo_crm_contact_passes_conditions($data, $contact, $context, $pdo);
            $outKey = $ok ? 'output_1' : 'output_2';
            auvvo_automation_run_log_step(
                $pdo,
                $context,
                $startNodeId,
                $class,
                $nodeLabel,
                $ok ? 'ok' : 'branch_no',
                $ok ? 'Condição passou' : 'Condição não passou',
                $outKey
            );
            $next = auvvo_flow_next_node_ids($node, $outKey);
            return auvvo_flow_walk_many($pdo, $userId, $flowId, $nodes, $next, $contact, $triggerType, $triggerValue, $context, $depth + 1);

        case 'flow_randomizer':
            $pctA = max(1, min(99, (int) ($data['pct_a'] ?? 50)));
            $outKey = random_int(1, 100) <= $pctA ? 'output_1' : 'output_2';
            auvvo_automation_run_log_step(
                $pdo,
                $context,
                $startNodeId,
                $class,
                $nodeLabel,
                'ok',
                $outKey === 'output_1' ? 'Ramificação A' : 'Ramificação B',
                $outKey
            );
            $next = auvvo_flow_next_node_ids($node, $outKey);
            return auvvo_flow_walk_many($pdo, $userId, $flowId, $nodes, $next, $contact, $triggerType, $triggerValue, $context, $depth + 1);

        case 'flow_delay':
            $mins = max(1, (int) ($data['delay_minutes'] ?? 5));
            $next = auvvo_flow_next_node_ids($node, 'output_1');
            if ($next === []) {
                auvvo_automation_run_log_step($pdo, $context, $startNodeId, $class, $nodeLabel, 'ok', "Espera {$mins} min (fim do fluxo)");
                return 'ok';
            }
            if (auvvo_automation_is_simulate($context)) {
                auvvo_automation_run_log_step(
                    $pdo,
                    $context,
                    $startNodeId,
                    $class,
                    $nodeLabel,
                    'simulated',
                    "Espera {$mins} min (simulado — pulado)"
                );
                return auvvo_flow_walk_many($pdo, $userId, $flowId, $nodes, $next, $contact, $triggerType, $triggerValue, $context, $depth + 1);
            }
            auvvo_crm_enqueue_single(
                $pdo,
                $userId,
                $flowId,
                $contact,
                $triggerType,
                $triggerValue,
                'flow_resume',
                ['flow_id' => $flowId, 'node_ids' => $next],
                $mins,
                $context
            );
            return 'paused';

        case 'flow_message':
            $cfg = [
                'connection_id' => (int) ($data['connection_id'] ?? $context['whatsapp_connection_id'] ?? 0),
                'agent_id'      => auvvo_crm_resolve_agent_id((int) ($data['agent_id'] ?? 0), $contact, $context),
                'message'       => (string) ($data['message'] ?? ''),
                '_node_id'      => $startNodeId,
                '_node_label'   => $nodeLabel,
            ];
            if ($cfg['message'] !== '') {
                auvvo_crm_execute_action($pdo, $userId, 'send_whatsapp', $cfg, $contact, $triggerType, $triggerValue, $context);
                if (!auvvo_automation_is_simulate($context) && auvvo_automation_run_ctx($context)) {
                    auvvo_automation_run_log_step($pdo, $context, $startNodeId, 'flow_message', $nodeLabel, 'ok', 'Mensagem enviada');
                }
            }
            $next = auvvo_flow_next_node_ids($node, 'output_1');
            return auvvo_flow_walk_many($pdo, $userId, $flowId, $nodes, $next, $contact, $triggerType, $triggerValue, $context, $depth + 1);

        case 'flow_memory':
            $memKey = trim((string) ($data['memory_key'] ?? ''));
            if ($memKey !== '') {
                $val = auvvo_crm_flow_memory_value($pdo, $userId, $data, $contact, $context);
                if ($val !== '') {
                    auvvo_crm_execute_action(
                        $pdo,
                        $userId,
                        'set_memory',
                        ['key' => $memKey, 'value' => $val],
                        $contact,
                        $triggerType,
                        $triggerValue,
                        $context
                    );
                    $contact = auvvo_crm_hydrate_contact($pdo, $userId, $contact);
                }
            }
            $next = auvvo_flow_next_node_ids($node, 'output_1');
            return auvvo_flow_walk_many($pdo, $userId, $flowId, $nodes, $next, $contact, $triggerType, $triggerValue, $context, $depth + 1);

        case 'flow_agent':
            $result = auvvo_flow_run_agent_node($pdo, $userId, $data, $contact, $context, $startNodeId, $nodeLabel);
            $st = ($result['ok'] ?? false) ? (auvvo_automation_is_simulate($context) ? 'simulated' : 'ok') : 'error';
            $detail = (string) ($result['detail'] ?? '');
            if (!empty($result['response'])) {
                $detail .= ($detail !== '' ? "\n" : '') . (string) $result['response'];
            }
            auvvo_automation_run_log_step($pdo, $context, $startNodeId, 'flow_agent', $nodeLabel, $st, $detail);
            if (!($result['ok'] ?? false) && !auvvo_automation_is_simulate($context)) {
                auvvo_flow_bump_stats($pdo, $flowId, 'stats_error');
            }
            $next = auvvo_flow_next_node_ids($node, 'output_1');
            return auvvo_flow_walk_many($pdo, $userId, $flowId, $nodes, $next, $contact, $triggerType, $triggerValue, $context, $depth + 1);

        case 'flow_wait_reply':
            $context['_flow_nodes'] = $nodes;
            return auvvo_flow_wait_reply_pause(
                $pdo,
                $userId,
                $flowId,
                $startNodeId,
                $nodeLabel,
                $data,
                $contact,
                $triggerType,
                $triggerValue,
                $context
            );

        case 'flow_action':
            $actionType = trim((string) ($data['action_type'] ?? ''));
            if ($actionType !== '') {
                $exec = auvvo_crm_flow_action_config($data);
                if (in_array($actionType, ['send_whatsapp', 'invoke_agent', 'assign_agent', 'pause_ai', 'resume_ai'], true)) {
                    $exec['agent_id'] = auvvo_crm_resolve_agent_id((int) ($exec['agent_id'] ?? 0), $contact, $context);
                }
                $exec['_node_id'] = $startNodeId;
                $exec['_node_label'] = $nodeLabel;
                auvvo_crm_execute_action($pdo, $userId, $actionType, $exec, $contact, $triggerType, $triggerValue, $context);
                if (!auvvo_automation_is_simulate($context) && auvvo_automation_run_ctx($context)) {
                    auvvo_automation_run_log_step($pdo, $context, $startNodeId, 'flow_action', $nodeLabel, 'ok', $actionType . ' executado');
                }
                if (in_array($actionType, ['assign_agent', 'invoke_agent', 'set_memory', 'brain_mission', 'clear_brain_mission'], true)) {
                    $contact = auvvo_crm_hydrate_contact($pdo, $userId, $contact);
                }
            }
            $next = auvvo_flow_next_node_ids($node, 'output_1');
            return auvvo_flow_walk_many($pdo, $userId, $flowId, $nodes, $next, $contact, $triggerType, $triggerValue, $context, $depth + 1);

        default:
            return 'skip';
    }
}

/**
 * @param list<string> $nodeIds
 * @return 'ok'|'paused'|'skip'
 */
function auvvo_flow_walk_many(
    PDO $pdo,
    int $userId,
    int $flowId,
    array $nodes,
    array $nodeIds,
    array &$contact,
    string $triggerType,
    string $triggerValue,
    array $context,
    int $depth
): string {
    if ($nodeIds === []) {
        return 'ok';
    }
    $paused = false;
    foreach ($nodeIds as $nid) {
        $r = auvvo_flow_walk($pdo, $userId, $flowId, $nodes, $nid, $contact, $triggerType, $triggerValue, $context, $depth);
        if ($r === 'paused') {
            $paused = true;
        }
    }

    return $paused ? 'paused' : 'ok';
}

function auvvo_flow_resume_from_queue(
    PDO $pdo,
    int $userId,
    array $config,
    array $contact,
    string $triggerType,
    string $triggerValue
): void {
    $flowId = (int) ($config['flow_id'] ?? 0);
    $nodeIds = $config['node_ids'] ?? [];
    $ctx = is_array($config['_trigger_context'] ?? null) ? $config['_trigger_context'] : [];
    if ($flowId <= 0 || !is_array($nodeIds) || $nodeIds === []) {
        return;
    }

    try {
        $st = $pdo->prepare('SELECT flow_data FROM crm_automation_flows WHERE id = ? AND user_id = ? AND is_active = 1 LIMIT 1');
        $st->execute([$flowId, $userId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return;
        }
        $nodes = auvvo_flow_parse_nodes((string) ($row['flow_data'] ?? ''));
        if ($nodes === []) {
            return;
        }
        $contact = auvvo_crm_hydrate_contact($pdo, $userId, $contact);
        $r = auvvo_flow_walk_many($pdo, $userId, $flowId, $nodes, array_map('strval', $nodeIds), $contact, $triggerType, $triggerValue, $ctx, 0);
        if ($r !== 'paused') {
            auvvo_flow_bump_stats($pdo, $flowId, 'stats_success');
        }
    } catch (Throwable $e) {
        auvvo_flow_bump_stats($pdo, $flowId, 'stats_error');
        throw $e;
    }
}

/**
 * Fluxos ativos do usuário para o pipeline do contato (NULL/0 = qualquer funil).
 *
 * @return list<array>
 */
function auvvo_flow_list_active_for_contact(PDO $pdo, int $userId, array $contact, string $triggerType = ''): array
{
    $contactPipelineId = (int) ($contact['pipeline_id'] ?? 0);
    try {
        if (auvvo_crm_trigger_skips_pipeline_filter($triggerType)) {
            $stmt = $pdo->prepare(
                'SELECT id, flow_data, pipeline_id FROM crm_automation_flows
                 WHERE user_id = ? AND is_active = 1'
            );
            $stmt->execute([$userId]);
        } else {
            $stmt = $pdo->prepare(
                'SELECT id, flow_data, pipeline_id FROM crm_automation_flows
                 WHERE user_id = ? AND is_active = 1
                 AND (pipeline_id IS NULL OR pipeline_id = 0 OR pipeline_id = ?)'
            );
            $stmt->execute([$userId, $contactPipelineId]);
        }

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return [];
    }
}

/**
 * Fluxos visuais com gatilho LTV (worker). Dedupe 7 dias por fluxo+contato.
 */
function auvvo_crm_run_ltv_visual_flows(PDO $pdo, int $userId, array $contact): int
{
    $fired = 0;
    $contactId = (int) ($contact['id'] ?? 0);
    if ($userId <= 0 || $contactId <= 0) {
        return 0;
    }

    auvvo_run_migrations($pdo);
    $contact = auvvo_crm_hydrate_contact($pdo, $userId, $contact);
    $flows = auvvo_flow_list_active_for_contact($pdo, $userId, $contact);
    if ($flows === []) {
        return 0;
    }

    foreach ($flows as $flow) {
        $flowId = (int) $flow['id'];
        $nodes = auvvo_flow_parse_nodes((string) ($flow['flow_data'] ?? ''));
        if ($nodes === []) {
            continue;
        }

        foreach ($nodes as $nodeId => $node) {
            if ((string) ($node['class'] ?? '') !== 'flow_trigger') {
                continue;
            }
            $data = is_array($node['data'] ?? null) ? $node['data'] : [];
            if (!auvvo_flow_trigger_matches($data, 'ltv_inactive', (string) ($data['trigger_value'] ?? 'default'))) {
                continue;
            }
            if (auvvo_crm_ltv_already_fired($pdo, $userId, $contactId, $flowId, 'flow')) {
                continue;
            }

            auvvo_crm_ltv_mark_fired($pdo, $userId, $contactId, $flowId, 'flow');
            auvvo_flow_bump_stats($pdo, $flowId, 'stats_entered');
            try {
                $r = auvvo_flow_walk(
                    $pdo,
                    $userId,
                    $flowId,
                    $nodes,
                    (string) $nodeId,
                    $contact,
                    'ltv_inactive',
                    (string) ($data['trigger_value'] ?? 'default'),
                    [],
                    0
                );
                if ($r !== 'paused') {
                    auvvo_flow_bump_stats($pdo, $flowId, 'stats_success');
                }
                $fired++;
            } catch (Throwable $e) {
                auvvo_flow_bump_stats($pdo, $flowId, 'stats_error');
                error_log('[Auvvo] ltv flow ' . $flowId . ': ' . $e->getMessage());
            }
        }
    }

    return $fired;
}

function auvvo_crm_run_visual_flows(
    PDO $pdo,
    int $userId,
    string $triggerType,
    string $triggerValue,
    array $contact,
    array $context = []
): void {
    auvvo_run_migrations($pdo);
    $contact = auvvo_crm_hydrate_contact($pdo, $userId, $contact);

    require_once __DIR__ . '/crm_flow_wait_reply.inc.php';
    $resume = auvvo_flow_wait_reply_try_resume($pdo, $userId, $contact, (string) ($context['message_body'] ?? ''));
    if (!empty($resume['handled']) && !empty($resume['resumed'])) {
        return;
    }

    $flows = auvvo_flow_list_active_for_contact($pdo, $userId, $contact, $triggerType);
    if ($flows === []) {
        return;
    }

    foreach ($flows as $flow) {
        $flowId = (int) $flow['id'];
        $flowPipelineId = (int) ($flow['pipeline_id'] ?? 0);
        $nodes = auvvo_flow_parse_nodes((string) ($flow['flow_data'] ?? ''));
        if ($nodes === []) {
            continue;
        }

        foreach ($nodes as $nodeId => $node) {
            if ((string) ($node['class'] ?? '') !== 'flow_trigger') {
                continue;
            }
            $data = is_array($node['data'] ?? null) ? $node['data'] : [];
            if (!auvvo_flow_trigger_matches($data, $triggerType, $triggerValue)) {
                continue;
            }
            $syncPipeline = !isset($data['sync_pipeline_on_enter']) || !empty($data['sync_pipeline_on_enter']);
            if ($flowPipelineId > 0 && auvvo_crm_trigger_skips_pipeline_filter($triggerType) && $syncPipeline) {
                auvvo_crm_sync_contact_to_pipeline($pdo, $userId, $contact, $flowPipelineId);
            }
            if (auvvo_crm_dedupe_should_skip_source($pdo, $userId, $contact, 'flow', $flowId, $triggerType, $triggerValue)) {
                continue;
            }
            if (auvvo_flow_trigger_cooldown_skip($pdo, $userId, $flowId, $nodes, (string) $nodeId, $contact, $triggerType)) {
                continue;
            }
            $runId = 0;
            if (!auvvo_automation_is_simulate($context)) {
                $runId = auvvo_automation_run_start(
                    $pdo,
                    $userId,
                    $flowId,
                    !empty($contact['id']) ? (int) $contact['id'] : null,
                    'live',
                    $triggerType,
                    $triggerValue,
                    (string) ($context['message_body'] ?? ''),
                    ['connection_id' => (int) ($context['whatsapp_connection_id'] ?? 0)]
                );
                if ($runId > 0) {
                    $context['automation_run'] = [
                        'id' => $runId,
                        'simulate' => false,
                        'step_order' => 0,
                    ];
                }
            }
            auvvo_flow_bump_stats($pdo, $flowId, 'stats_entered');
            try {
                $context['_flow_nodes'] = $nodes;
                $r = auvvo_flow_walk($pdo, $userId, $flowId, $nodes, (string) $nodeId, $contact, $triggerType, $triggerValue, $context, 0);
                if ($r !== 'paused') {
                    auvvo_flow_bump_stats($pdo, $flowId, 'stats_success');
                }
                if ($runId > 0) {
                    auvvo_automation_run_finish($pdo, $runId, $r === 'paused' ? 'paused' : 'done');
                }
                auvvo_crm_dedupe_mark_source($pdo, $userId, $contact, 'flow', $flowId, $triggerType, $triggerValue);
                auvvo_flow_trigger_cooldown_mark($pdo, $userId, $flowId, $nodes, (string) $nodeId, $contact, $triggerType);
            } catch (Throwable $e) {
                auvvo_flow_bump_stats($pdo, $flowId, 'stats_error');
                if ($runId > 0) {
                    auvvo_automation_run_finish($pdo, $runId, 'failed', $e->getMessage());
                }
                error_log('[Auvvo] flow ' . $flowId . ': ' . $e->getMessage());
            }
            continue;
        }
    }
}
