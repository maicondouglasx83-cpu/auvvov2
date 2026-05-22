<?php
declare(strict_types=1);

require_once __DIR__ . '/migrations.php';
require_once __DIR__ . '/crm_automation_runs.inc.php';
require_once __DIR__ . '/crm_automation_motor.inc.php';
require_once __DIR__ . '/whatsapp_connections.inc.php';

function auvvo_automation_mark_ai_handled(): void
{
    $GLOBALS['auvvo_automation_ai_handled'] = true;
}

function auvvo_automation_ai_was_handled(): bool
{
    return !empty($GLOBALS['auvvo_automation_ai_handled']);
}

/**
 * @return array{openai:bool,gemini:bool,openrouter:bool,model:string,key:string}
 */
function auvvo_flow_agent_resolve_llm(PDO $pdo, array $agent, array $settings): array
{
    $modelStr = trim((string) ($agent['model'] ?? ''));
    if ($modelStr === '') {
        $modelStr = defined('OPENROUTER_DEFAULT_MODEL') ? OPENROUTER_DEFAULT_MODEL : 'openrouter/openai/gpt-4o-mini';
    }
    $isGemini = strpos($modelStr, 'gemini') === 0;
    $isOpenRouter = !$isGemini && (
        $modelStr === 'auvvo-ai'
        || strpos($modelStr, 'openrouter/') === 0
        || strpos($modelStr, '/') !== false
    );
    $geminiUserKey = trim($settings['gemini_key'] ?? '');
    $geminiEnvKey = defined('GEMINI_API_KEY') ? trim((string) GEMINI_API_KEY) : '';
    $effectiveGeminiKey = $geminiUserKey !== '' ? $geminiUserKey : $geminiEnvKey;
    $openRouterPlatformKey = defined('OPENROUTER_API_KEY') ? trim((string) OPENROUTER_API_KEY) : '';

    if ($isGemini) {
        return ['openai' => false, 'gemini' => true, 'openrouter' => false, 'model' => $modelStr, 'key' => $effectiveGeminiKey];
    }
    if ($isOpenRouter) {
        return ['openai' => false, 'gemini' => false, 'openrouter' => true, 'model' => $modelStr, 'key' => $openRouterPlatformKey];
    }

    return ['openai' => true, 'gemini' => false, 'openrouter' => false, 'model' => $modelStr, 'key' => trim($settings['openai_key'] ?? '')];
}

/**
 * Preview LLM (simulador) — não envia WhatsApp.
 */
function auvvo_flow_agent_preview_llm(
    PDO $pdo,
    array $agent,
    array $settings,
    string $body,
    string $canonicalJid,
    string $mission = ''
): string {
    if (!defined('AUVVO_WEBHOOK_SKIP_HTTP_ROUTER')) {
        define('AUVVO_WEBHOOK_SKIP_HTTP_ROUTER', true);
    }
    require_once __DIR__ . '/webhook_evolution.php';

    $llm = auvvo_flow_agent_resolve_llm($pdo, $agent, $settings);
    if ($llm['key'] === '') {
        return '[Simulação] Chave de IA não configurada para este agente.';
    }

    if ($mission !== '') {
        require_once __DIR__ . '/context_memory.inc.php';
        auvvo_contact_memory_merge($pdo, (int) $agent['user_id'], $canonicalJid, ['_brain_mission' => $mission]);
    }

    $agentForPrompt = $agent;
    $agentForPrompt['_contact_jid'] = $canonicalJid;
    $builder = new MasterPromptBuilder($pdo);
    $systemPrompt = $builder->build($agentForPrompt, $settings);
    $history = getConversationHistory($pdo, (int) $agent['id'], $canonicalJid, 6);

    $response = callOpenAI(
        $llm['key'],
        $llm['model'],
        $systemPrompt,
        $body,
        $history,
        (int) ($agent['max_tokens'] ?? 800),
        (float) ($agent['temperature'] ?? 0.7),
        'auvvo-sim-' . (int) $agent['id']
    );

    if ($response === null || trim((string) $response) === '') {
        return '[Simulação] IA não retornou texto.';
    }

    require_once __DIR__ . '/auvvo_brain_tools.inc.php';
    $processed = auvvo_brain_process_llm_response(
        $pdo,
        (int) $agent['user_id'],
        $agent,
        $settings,
        (string) $response,
        $canonicalJid,
        null,
        null
    );

    return trim((string) $processed) !== '' ? (string) $processed : (string) $response;
}

/**
 * Executa nó Agente IA no fluxo.
 *
 * @param array<string,mixed> $data
 * @param array<string,mixed> $contact
 * @param array<string,mixed> $context
 * @return array{ok:bool,detail:string,response?:string}
 */
function auvvo_flow_run_agent_node(
    PDO $pdo,
    int $userId,
    array $data,
    array &$contact,
    array $context,
    string $nodeId,
    string $nodeLabel
): array {
    $agentId = auvvo_crm_resolve_agent_id((int) ($data['agent_id'] ?? 0), $contact, $context);
    $connectionId = (int) ($data['connection_id'] ?? $context['whatsapp_connection_id'] ?? 0);
    $mission = trim((string) ($data['mission'] ?? ''));
    $mode = (string) ($data['mode'] ?? 'respond');
    $body = trim((string) ($context['message_body'] ?? ''));
    $simulate = auvvo_automation_is_simulate($context);
    $useLlm = !empty($context['simulate_use_llm']);

    if ($agentId <= 0) {
        return ['ok' => false, 'detail' => 'Agente IA não configurado'];
    }

    $brain = auvvo_whatsapp_load_agent_brain($pdo, $userId, $agentId);
    if (!$brain) {
        return ['ok' => false, 'detail' => 'Agente #' . $agentId . ' não encontrado'];
    }

    if ($connectionId > 0) {
        $conn = auvvo_whatsapp_connection_get($pdo, $userId, $connectionId);
        if ($conn) {
            $brain = auvvo_whatsapp_attach_connection_to_agent($brain, $conn);
        }
    }

    $canonicalJid = (string) ($contact['jid'] ?? '');
    if ($canonicalJid === '') {
        $phone = preg_replace('/\D/', '', (string) ($contact['phone'] ?? ''));
        $canonicalJid = $phone !== '' ? ($phone . '@s.whatsapp.net') : '5511999998888@s.whatsapp.net';
    }

    $agentName = (string) ($brain['name'] ?? 'Agente');

    if ($simulate && !$useLlm) {
        $detail = 'Agente IA (simulado): ' . $agentName;
        if ($mission !== '') {
            $detail .= ' — missão: ' . mb_substr($mission, 0, 200);
        }
        if ($body !== '') {
            $detail .= ' — receberia: «' . mb_substr($body, 0, 120) . '»';
        }
        if ($mode === 'tools_only') {
            $detail .= ' [modo: só ferramentas]';
        }

        return ['ok' => true, 'detail' => $detail, 'response' => '[Resposta IA simulada — ative «Usar IA real» no teste]'];
    }

    $stmt = $pdo->prepare(
        'SELECT openai_key, gemini_key, elevenlabs_key, company_name, company_niche, company_site,
                google_calendar_enabled, google_calendar_calendar_id
         FROM settings WHERE user_id = ? LIMIT 1'
    );
    $stmt->execute([$userId]);
    $settings = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

    if ($mission !== '' && !empty($contact['jid'])) {
        require_once __DIR__ . '/context_memory.inc.php';
        auvvo_contact_memory_merge($pdo, $userId, (string) $contact['jid'], ['_brain_mission' => $mission]);
        $contact = auvvo_crm_hydrate_contact($pdo, $userId, $contact);
    }

    if ($simulate && $useLlm) {
        try {
            $text = auvvo_flow_agent_preview_llm($pdo, $brain, $settings, $body !== '' ? $body : 'Olá', $canonicalJid, $mission);
            return ['ok' => true, 'detail' => 'Agente IA (preview LLM): ' . $agentName, 'response' => $text];
        } catch (Throwable $e) {
            return ['ok' => false, 'detail' => 'Erro IA simulada: ' . $e->getMessage()];
        }
    }

    if (empty($brain['evolution_token'])) {
        return ['ok' => false, 'detail' => 'Conexão WhatsApp sem token para enviar resposta'];
    }

    $llm = auvvo_flow_agent_resolve_llm($pdo, $brain, $settings);
    if ($llm['key'] === '') {
        return ['ok' => false, 'detail' => 'Chave de IA não configurada'];
    }

    if ($body === '') {
        return ['ok' => false, 'detail' => 'Sem mensagem de gatilho para responder'];
    }

    require_once __DIR__ . '/ai_reply.inc.php';

    $peerDigits = auvvo_whatsapp_peer_digits($canonicalJid);
    $instanceLabel = (string) ($brain['evolution_instance'] ?? '');
    $GLOBALS['auvvo_worker_start_time'] = time();

    try {
        auvvo_run_ai_reply(
            $pdo,
            $brain,
            $settings,
            $llm['key'],
            $canonicalJid,
            $canonicalJid,
            $peerDigits,
            $body,
            null,
            $instanceLabel
        );
        auvvo_automation_mark_ai_handled();

        return [
            'ok' => true,
            'detail' => 'Agente IA respondeu via WhatsApp: ' . $agentName . ($mission !== '' ? ' (missão ativa)' : ''),
        ];
    } catch (Throwable $e) {
        return ['ok' => false, 'detail' => 'Falha agente IA: ' . $e->getMessage()];
    }
}

/** @return array<string, array{in:int,ok:int,err:int}> */
function auvvo_automation_node_stats(PDO $pdo, int $userId, int $flowId): array
{
    if ($userId <= 0 || $flowId <= 0) {
        return [];
    }
    auvvo_run_migrations($pdo);
    try {
        $st = $pdo->prepare(
            'SELECT s.node_id,
                    COUNT(*) AS cnt_in,
                    SUM(CASE WHEN s.status IN (\'ok\',\'simulated\') THEN 1 ELSE 0 END) AS cnt_ok,
                    SUM(CASE WHEN s.status = \'error\' THEN 1 ELSE 0 END) AS cnt_err
             FROM crm_automation_run_steps s
             INNER JOIN crm_automation_runs r ON r.id = s.run_id
             WHERE r.user_id = ? AND r.flow_id = ?
             GROUP BY s.node_id'
        );
        $st->execute([$userId, $flowId]);
        $out = [];
        while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
            $nid = (string) ($row['node_id'] ?? '');
            if ($nid === '') {
                continue;
            }
            $out[$nid] = [
                'in' => (int) ($row['cnt_in'] ?? 0),
                'ok' => (int) ($row['cnt_ok'] ?? 0),
                'err' => (int) ($row['cnt_err'] ?? 0),
            ];
        }

        return $out;
    } catch (PDOException $e) {
        return [];
    }
}
