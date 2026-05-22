<?php
/**
 * Pipeline LLM + envio WhatsApp (Evolution) + GCal compartilhado entre webhook HTTP e worker CLI LiteSpeed.
 */
declare(strict_types=1);

function auvvo_webhook_run_ai_pipeline(
    PDO $pdo,
    array $agent,
    array $settings,
    string $llmApiKey,
    string $canonical_jid,
    string $remote_jid,
    string $peer_digits,
    string $body,
    ?int $pending_log_id,
    string $evolution_instance_label
): void {
    if (function_exists('set_time_limit')) {
        @set_time_limit(0);
    }
    ignore_user_abort(true);

    $history = getConversationHistory($pdo, (int) $agent['id'], $canonical_jid, 10, $remote_jid, $peer_digits);

    $settings['google_calendar_connected'] = false;
    if (!empty($settings['google_calendar_enabled']) && GoogleCalendar::isConfigured($pdo, (int) $agent['user_id'])) {
        try {
            $stmt = $pdo->prepare("SELECT id FROM google_calendar_tokens WHERE user_id=? LIMIT 1");
            $stmt->execute([(int) $agent['user_id']]);
            $settings['google_calendar_connected'] = (bool) $stmt->fetch();
        } catch (PDOException $e) {
            $settings['google_calendar_connected'] = false;
        }
    }
    if (!empty($settings['google_calendar_enabled'])
        && GoogleCalendar::isConfigured($pdo, (int) $agent['user_id'])
        && !empty($settings['google_calendar_connected'])) {
        $settings['google_calendar_calendar_id'] = GoogleCalendar::getEffectiveCalendarId($pdo, (int) $agent['user_id']);
    }

    $agentForPrompt = $agent;
    $agentForPrompt['_contact_jid'] = $canonical_jid;
    $builder       = new MasterPromptBuilder($pdo);
    $system_prompt = $builder->build($agentForPrompt, $settings);

    // Modelo: usa o configurado no agente, ou o padrão do .env, ou gpt-4o-mini como último recurso.
    $resolvedModel = trim((string)($agent['model'] ?? ''));
    if ($resolvedModel === '') {
        $resolvedModel = defined('OPENROUTER_DEFAULT_MODEL') ? OPENROUTER_DEFAULT_MODEL : 'openrouter/openai/gpt-4o-mini';
    }

    $orUser = 'auvvo-' . substr(hash('sha256', (string)($agent['id'] ?? 0) . "\x1e" . $canonical_jid), 0, 40);
    $nativeToolCalls = [];
    $ai_response = callOpenAI(
        $llmApiKey,
        $resolvedModel,
        $system_prompt,
        $body,
        $history,
        intval($agent['max_tokens'] ?? 1000),
        floatval($agent['temperature'] ?? 0.7),
        $orUser,
        $nativeToolCalls
    );
    auvvo_webhook_tracelog('llm_result', [
        'ok'           => ($ai_response !== null && trim((string) $ai_response) !== '') || $nativeToolCalls !== [],
        'response_len' => $ai_response ? mb_strlen($ai_response) : 0,
        'tool_calls'   => count($nativeToolCalls),
        'model'        => $resolvedModel,
    ]);

    $hasLlmOutput = ($ai_response !== null && trim((string) $ai_response) !== '') || $nativeToolCalls !== [];
    if ($hasLlmOutput) {
        if (defined('IS_DEV') && IS_DEV) {
            file_put_contents(__DIR__ . '/webhook_debug.log', date('Y-m-d H:i:s') . ' AI_RESPONSE SUCCESS: ' . substr((string) $ai_response, 0, 100) . "...\n", FILE_APPEND);
        }

        require_once __DIR__ . '/auvvo_brain_tools.inc.php';
        $ai_response = auvvo_brain_process_llm_response(
            $pdo,
            (int) $agent['user_id'],
            $agent,
            $settings,
            (string) ($ai_response ?? ''),
            $canonical_jid,
            null,
            $nativeToolCalls !== [] ? $nativeToolCalls : null
        );
        if (trim((string) $ai_response) === '') {
            auvvo_webhook_tracelog('pipeline_empty_after_brain', []);

            return;
        }

        if (function_exists('auvvo_pdo_ping') && !auvvo_pdo_ping($pdo)) {
            auvvo_webhook_tracelog('pdo_ping_failed_post_llm', []);
            error_log('[Auvvo Webhook] PDO ping falhou logo após a LLM — risco de conexão perdida antes de gravar/enviar.');
        }

        try {
            if (!empty($pending_log_id)) {
                finalizeConversationLog($pdo, (int) $pending_log_id, (int) $agent['id'], $ai_response, 'ai');
            } else {
                logConversation($pdo, (int) $agent['id'], $canonical_jid, $body, $ai_response, 'ai');
            }

            $delay = intval($agent['response_delay'] ?? 2);
            $elapsed = time() - ($GLOBALS['auvvo_worker_start_time'] ?? time());
            // Se a IA já demorou mais de 10s, pular qualquer sleep adicional para evitar timeouts do servidor
            if ($elapsed < 10) {
                $remaining_delay = $delay - $elapsed;
                if ($remaining_delay > 0) {
                    sleep(min($remaining_delay, 5));
                }
            }

            if (!empty($agent['audio_enabled']) && !empty($settings['elevenlabs_key'])) {
                auvvo_webhook_tracelog('elevenlabs_start', ['voice_id' => $agent['audio_voice'] ?? 'pNInz6obpgDQGcFmaJcg']);
                $voice_id = !empty($agent['audio_voice']) ? $agent['audio_voice'] : 'pNInz6obpgDQGcFmaJcg';

                $el_ch = curl_init("https://api.elevenlabs.io/v1/text-to-speech/{$voice_id}");
                curl_setopt_array($el_ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_HTTPHEADER     => [
                        'xi-api-key: ' . $settings['elevenlabs_key'],
                        'Content-Type: application/json',
                    ],
                    CURLOPT_POST           => true,
                    CURLOPT_POSTFIELDS     => json_encode([
                        'text'           => $ai_response,
                        'model_id'       => 'eleven_multilingual_v2',
                        'voice_settings' => ['stability' => 0.5, 'similarity_boost' => 0.75],
                    ]),
                    CURLOPT_SSL_VERIFYPEER => true,
                    CURLOPT_TIMEOUT        => 10,
                    CURLOPT_CONNECTTIMEOUT => 5,
                ]);

                $audio_data = curl_exec($el_ch);
                $el_status  = curl_getinfo($el_ch, CURLINFO_HTTP_CODE);
                curl_close($el_ch);

                if ($el_status == 200 && $audio_data) {
                    $base64_audio = 'data:audio/mpeg;base64,' . base64_encode($audio_data);
                    $res          = sendEvolutionAudio($agent['evolution_token'], $evolution_instance_label, $remote_jid, $base64_audio);
                    if (defined('IS_DEV') && IS_DEV) {
                        file_put_contents(__DIR__ . '/webhook_debug.log', date('Y-m-d H:i:s') . ' SEND AUDIO RES: ' . json_encode($res) . "\n", FILE_APPEND);
                    }
                } else {
                    error_log("[Auvvo] Falha ElevenLabs: HTTP $el_status");
                    $res = sendEvolutionMessage($agent['evolution_token'], $evolution_instance_label, $remote_jid, $ai_response);
                    if (defined('IS_DEV') && IS_DEV) {
                        file_put_contents(__DIR__ . '/webhook_debug.log', date('Y-m-d H:i:s') . ' SEND FALLBACK TEXT RES: ' . json_encode($res) . "\n", FILE_APPEND);
                    }
                }
            } else {
                $res = sendEvolutionMessage($agent['evolution_token'], $evolution_instance_label, $remote_jid, $ai_response);
                if (defined('IS_DEV') && IS_DEV) {
                    file_put_contents(__DIR__ . '/webhook_debug.log', date('Y-m-d H:i:s') . ' SEND TEXT RES: ' . json_encode($res) . "\n", FILE_APPEND);
                }
            }
            auvvo_webhook_tracelog('evolution_send_done', [
                'remote_jid'       => $remote_jid,
                'send_ok'          => isset($res) && empty($res['error']),
                'send_code'        => $res['code'] ?? null,
                'send_msg_preview' => mb_substr((string) (($res['message'] ?? '') !== '' ? $res['message'] : json_encode($res)), 0, 400),
            ]);
        } catch (Throwable $e) {
            error_log('[Auvvo Webhook] Erro após LLM antes do envio Evolution: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
            auvvo_webhook_tracelog('pipeline_post_llm_exception', [
                'class' => get_class($e),
                'msg'   => mb_substr($e->getMessage(), 0, 400),
            ]);
            try {
                $res = sendEvolutionMessage($agent['evolution_token'], $evolution_instance_label, $remote_jid, $ai_response);
                auvvo_webhook_tracelog('evolution_send_done', [
                    'remote_jid'       => $remote_jid,
                    'send_ok'          => empty($res['error']),
                    'send_code'        => $res['code'] ?? null,
                    'send_msg_preview' => 'recovery_after_pipeline_error',
                    'recovery_send'    => true,
                ]);
            } catch (Throwable $sendEx) {
                error_log('[Auvvo Webhook] Falha recuperação Evolution após erro pós-LLM: ' . $sendEx->getMessage());
                auvvo_webhook_tracelog('pipeline_post_llm_recovery_send_failed', [
                    'class' => get_class($sendEx),
                    'msg'   => mb_substr($sendEx->getMessage(), 0, 200),
                ]);
            }
            try {
                if (!empty($pending_log_id)) {
                    finalizeConversationLog($pdo, (int) $pending_log_id, (int) $agent['id'], $ai_response, 'ai');
                } else {
                    logConversation($pdo, (int) $agent['id'], $canonical_jid, $body, $ai_response, 'ai');
                }
            } catch (Throwable $_recLog) {
                // empty
            }
        }
    } else {
        if (defined('IS_DEV') && IS_DEV) {
            file_put_contents(__DIR__ . '/webhook_debug.log', date('Y-m-d H:i:s') . " AI_RESPONSE FAILED (NULL)\n", FILE_APPEND);
        }
        error_log('[Auvvo Webhook] Resposta nula da IA para agente #' . $agent['id'] . ' — fallback acionado.');
        auvvo_webhook_tracelog('llm_null_fallback', ['agent_id' => (int) $agent['id']]);

        $fallback = 'Entendi! Só um instante que vou acionar um especialista para te ajudar. 🙏';
        $sent     = false;
        $throttleDuplicate = false;
        $bucket   = '10m_' . date('Ymd_Hi', floor(time() / 600) * 600);
        try {
            $st = $pdo->prepare(
                'INSERT INTO webhook_fallback_throttle (agent_id, contact_jid, bucket) VALUES (?, ?, ?)'
            );
            if ($st instanceof PDOStatement) {
                try {
                    $okExe = $st->execute([(int) $agent['id'], $canonical_jid, $bucket]);
                    if ($okExe) {
                        $sent = true;
                    } else {
                        $ei                = $st->errorInfo();
                        $throttleDuplicate = isset($ei[1]) && (int) $ei[1] === 1062;
                    }
                } catch (PDOException $insEx) {
                    $drv               = isset($insEx->errorInfo[1]) ? (int) $insEx->errorInfo[1] : 0;
                    $throttleDuplicate = ($drv === 1062 || str_contains(mb_strtolower($insEx->getMessage()), 'duplicate'));
                }
            }
        } catch (Throwable $e) {
            if ($e instanceof PDOException) {
                $drv               = isset($e->errorInfo[1]) ? (int) $e->errorInfo[1] : 0;
                $throttleDuplicate = ($drv === 1062 || str_contains(mb_strtolower($e->getMessage()), 'duplicate'));
            }
            $sent = false;
        }

        if ($sent) {
            sendEvolutionMessage($agent['evolution_token'], $evolution_instance_label, $remote_jid, $fallback);
            auvvo_webhook_tracelog('fallback_message_sent', []);
            if (!empty($pending_log_id)) {
                finalizeConversationLog($pdo, (int) $pending_log_id, (int) $agent['id'], $fallback, 'fallback');
            } else {
                logConversation($pdo, (int) $agent['id'], $canonical_jid, $body, $fallback, 'fallback');
            }
        } elseif ($throttleDuplicate && !empty($pending_log_id)) {
            // Já há fallback registado neste bucket: não repetir WhatsApp — mas grave e não apague o turno.
            finalizeConversationLog($pdo, (int) $pending_log_id, (int) $agent['id'], $fallback, 'fallback');
            auvvo_webhook_tracelog('fallback_throttled_logged_only', [
                'pending_log_id' => $pending_log_id,
                'bucket'         => $bucket,
            ]);
        } elseif ($throttleDuplicate && empty($pending_log_id)) {
            logConversation($pdo, (int) $agent['id'], $canonical_jid, $body, $fallback, 'fallback');
            auvvo_webhook_tracelog('fallback_throttled_logged_only', ['bucket' => $bucket]);
        } else {
            sendEvolutionMessage($agent['evolution_token'], $evolution_instance_label, $remote_jid, $fallback);
            auvvo_webhook_tracelog('fallback_message_sent_without_throttle', []);
            if (!empty($pending_log_id)) {
                finalizeConversationLog($pdo, (int) $pending_log_id, (int) $agent['id'], $fallback, 'fallback');
            } else {
                logConversation($pdo, (int) $agent['id'], $canonical_jid, $body, $fallback, 'fallback');
            }
        }
    }
}
