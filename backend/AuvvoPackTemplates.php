<?php
declare(strict_types=1);

require_once __DIR__ . '/AgentTemplates.php';
require_once __DIR__ . '/migrations.php';

/**
 * Pacotes (stacks): vários agentes + metadados para fluxos vinculados no frontend.
 */
class AuvvoPackTemplates
{
    /** @return list<array<string, mixed>> */
    public static function listForUi(): array
    {
        return [
            [
                'id'          => 'agencia_stack',
                'sector'      => 'Agência',
                'name'        => 'Agência digital — equipe IA',
                'description' => '3 agentes + 3 fluxos (primeiro contato, estágio proposta, tag suporte). Cérebro IA para proposta/Calendar.',
                'icon'        => 'ph-megaphone',
                'color'       => '#6366f1',
                'agent_count' => 3,
                'flow_count'  => 3,
                'highlights'    => ['Primeiro contato', 'Estágio proposta', 'Tag suporte', 'Memória interesse', 'Missão cérebro'],
                'agent_labels'  => ['Recepção — Agência (Auvvo)', 'Comercial — Agência (Vendas)', 'Suporte — Agência (Técnico)'],
            ],
            [
                'id'          => 'clinica_stack',
                'sector'      => 'Clínica',
                'name'        => 'Clínica — jornada do paciente',
                'description' => '2 agentes + lembrete por estágio, triagem por tag e NPS pós-consulta com missão IA.',
                'icon'        => 'ph-heartbeat',
                'color'       => '#ec4899',
                'agent_count' => 2,
                'flow_count'  => 3,
                'highlights'    => ['Lembrete 24h', 'Tag triagem', 'NPS cérebro', 'Agendamento no agente'],
                'agent_labels'  => ['Secretária — Clínica', 'Pós-consulta — Clínica'],
            ],
            [
                'id'          => 'ecommerce_stack',
                'sector'      => 'E-commerce',
                'name'        => 'Loja online — vendas e recuperação',
                'description' => '2 agentes + A/B primeiro contato, carrinho por tag e pós-compra por tag (sem keyword).',
                'icon'        => 'ph-shopping-cart',
                'color'       => '#f59e0b',
                'agent_count' => 2,
                'flow_count'  => 3,
                'highlights'    => ['Primeiro contato A/B', 'Tag carrinho', 'Tag comprou', 'Recuperação IA'],
                'agent_labels'  => ['Vendas — Loja', 'Recuperação — Loja (carrinho)'],
            ],
            [
                'id'          => 'saas_stack',
                'sector'      => 'SaaS / B2B',
                'name'        => 'SaaS — SDR até Customer Success',
                'description' => '4 agentes + primeiro contato BANT, demo por tag com Calendar e CS por tag urgente.',
                'icon'        => 'ph-rocket-launch',
                'color'       => '#0ea5e9',
                'agent_count' => 4,
                'flow_count'  => 3,
                'highlights'    => ['Primeiro contato', 'Tag demo', 'Missão Calendar', 'Tag suporte CS'],
                'agent_labels'  => ['SDR — Qualificação', 'Demo — Pré-vendas', 'Onboarding — CS', 'Customer Success'],
            ],
            [
                'id'          => 'restaurante_stack',
                'sector'      => 'Restaurante',
                'name'        => 'Delivery — pedidos automáticos',
                'description' => '1 agente + horário comercial e confirmação por tag pedido-confirmado (agente marca a tag).',
                'icon'        => 'ph-pizza',
                'color'       => '#ef4444',
                'agent_count' => 1,
                'flow_count'  => 2,
                'highlights'    => ['Horário 18h–23h', 'Tag pedido', 'Memória pedido', 'Cardápio no agente'],
                'agent_labels'  => ['Atendente — Delivery'],
            ],
        ];
    }

    public static function getPackId(string $packId): ?array
    {
        foreach (self::listForUi() as $p) {
            if ($p['id'] === $packId) {
                return $p;
            }
        }

        return null;
    }

    /**
     * @return array{agents: array<string, int>, agent_names: array<string, string>, agent_rows: list<array>}
     */
    public static function provisionAgents(PDO $pdo, int $userId, string $packId): array
    {
        auvvo_run_migrations($pdo);
        $specs = self::agentSpecsForPack($packId);
        if ($specs === []) {
            throw new InvalidArgumentException('Pacote inválido.');
        }

        $company = '';
        $niche = '';
        try {
            $st = $pdo->prepare('SELECT company_name, company_niche FROM settings WHERE user_id = ? LIMIT 1');
            $st->execute([$userId]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $company = trim((string) ($row['company_name'] ?? ''));
                $niche = trim((string) ($row['company_niche'] ?? ''));
            }
        } catch (PDOException $e) {
        }

        $map = [];
        $names = [];
        $rows = [];
        $partners = [];

        foreach ($specs as $spec) {
            $key = (string) $spec['key'];
            $type = (string) $spec['agent_type'];
            $name = (string) $spec['name'];
            $role = (string) ($spec['role'] ?? 'Atendente');
            $custom = (string) ($spec['prompt_base'] ?? '');
            $prompt = AgentTemplates::get($type, $name, $company, $niche, $custom);
            $prompt .= self::brainPlaybookAppend($packId, $key);

            $handoffRules = (string) ($spec['handoff_rules'] ?? 'humano, atendente, especialista');
            $handoffMsg = (string) ($spec['handoff_message'] ?? 'Vou chamar um especialista para continuar com você. Um momento! 🙂');

            $stmt = $pdo->prepare(
                'INSERT INTO agents (user_id, agent_type, name, role, prompt_base, type_config, model, temperature,
                    max_tokens, response_delay, audio_enabled, audio_voice, handoff_rules, handoff_enabled,
                    handoff_message, bot_language, flow_mode, flow_config, status)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,\'waiting_qr\')'
            );
            $stmt->execute([
                $userId,
                $type,
                $name,
                $role,
                $prompt,
                isset($spec['type_config']) ? json_encode($spec['type_config'], JSON_UNESCAPED_UNICODE) : null,
                (string) ($spec['model'] ?? 'gpt-4o'),
                (float) ($spec['temperature'] ?? 0.7),
                (int) ($spec['max_tokens'] ?? 1200),
                (int) ($spec['response_delay'] ?? 2),
                0,
                '',
                $handoffRules,
                1,
                $handoffMsg,
                'pt-BR',
                'easy',
                '{}',
            ]);

            $id = (int) $pdo->lastInsertId();
            $map[$key] = $id;
            $names[$key] = $name;
            $rows[] = ['id' => $id, 'name' => $name, 'key' => $key, 'agent_type' => $type];
            if (!empty($spec['partner_key'])) {
                $partners[$key] = (string) $spec['partner_key'];
            }
        }

        foreach ($partners as $fromKey => $toKey) {
            if (!isset($map[$fromKey], $map[$toKey])) {
                continue;
            }
            $flowConfig = json_encode([
                'partner_agent_id' => $map[$toKey],
                'steps'            => [],
            ], JSON_UNESCAPED_UNICODE);
            $pdo->prepare('UPDATE agents SET flow_config = ? WHERE id = ? AND user_id = ?')
                ->execute([$flowConfig, $map[$fromKey], $userId]);
        }

        return ['agents' => $map, 'agent_names' => $names, 'agent_rows' => $rows];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function agentSpecsForPack(string $packId): array
    {
        switch ($packId) {
            case 'agencia_stack':
                return [
                    [
                        'key'             => 'recepcao',
                        'name'            => 'Recepção — Agência',
                        'agent_type'      => 'Auvvo',
                        'role'            => 'Recepção',
                        'partner_key'     => 'comercial',
                        'prompt_base'     => "Direcione orçamentos e propostas para o agente Comercial. Dúvidas técnicas de projeto para Suporte.\nMencione que a agência atende: tráfego pago, social media, sites e branding.",
                    ],
                    [
                        'key'             => 'comercial',
                        'name'            => 'Comercial — Agência',
                        'agent_type'      => 'vendedor',
                        'role'            => 'Vendas',
                        'partner_key'     => 'suporte',
                        'prompt_base'     => "Foco em briefings e propostas. Pergunte orçamento mensal, prazo e canais desejados.\nApós fechar escopo, o Suporte técnico pode detalhar implementação.",
                    ],
                    [
                        'key'             => 'suporte',
                        'name'            => 'Suporte — Agência',
                        'agent_type'      => 'suporte',
                        'role'            => 'Suporte técnico',
                        'prompt_base'     => "Ajude com dúvidas de campanha, pixel, criativos e prazos de entrega.\nEscale para humano se o cliente pedir reunião presencial ou contrato jurídico.",
                    ],
                ];

            case 'clinica_stack':
                return [
                    [
                        'key'         => 'secretaria',
                        'name'        => 'Secretária — Clínica',
                        'agent_type'  => 'atendente',
                        'role'        => 'Secretária',
                        'partner_key' => 'pos',
                        'prompt_base' => "Agende consultas, informe horários e convênios.\nNão dê diagnóstico médico — apenas orientações administrativas.",
                    ],
                    [
                        'key'         => 'pos',
                        'name'        => 'Pós-consulta — Clínica',
                        'agent_type'  => 'atendente',
                        'role'        => 'Pós-atendimento',
                        'prompt_base' => "Acompanhe satisfação após consulta, lembretes de retorno e exames.\nTom acolhedor e profissional.",
                    ],
                ];

            case 'ecommerce_stack':
                return [
                    [
                        'key'             => 'vendas',
                        'name'            => 'Vendas — Loja',
                        'agent_type'      => 'vendedor',
                        'role'            => 'Vendas online',
                        'partner_key'     => 'recuperacao',
                        'prompt_base'     => "Ajude na escolha de produtos, frete e formas de pagamento.\nOfereça cupom BEMVINDO10 na primeira compra quando fizer sentido.",
                    ],
                    [
                        'key'         => 'recuperacao',
                        'name'        => 'Recuperação — Loja',
                        'agent_type'  => 'vendedor',
                        'role'        => 'Recuperação de carrinho',
                        'prompt_base' => "Foco em carrinho abandonado e reativação. Tom persuasivo mas respeitoso.\nNão pressione mais de 2 vezes seguidas.",
                    ],
                ];

            case 'saas_stack':
                return [
                    [
                        'key'             => 'sdr',
                        'name'            => 'SDR — Qualificação',
                        'agent_type'      => 'sdr',
                        'role'            => 'SDR',
                        'partner_key'     => 'demo',
                        'prompt_base'     => "Qualifique com BANT. Meta: agendar demo de 20 min.\nICP: empresas 10–200 funcionários com dor em automação de atendimento.",
                    ],
                    [
                        'key'             => 'demo',
                        'name'            => 'Demo — Especialista',
                        'agent_type'      => 'vendedor',
                        'role'            => 'Pré-vendas',
                        'partner_key'     => 'onboarding',
                        'prompt_base'     => "Conduza demonstração do produto, tire objeções de preço e integração.\nApós assinatura, passe contexto ao Onboarding.",
                    ],
                    [
                        'key'             => 'onboarding',
                        'name'            => 'Onboarding — CS',
                        'agent_type'      => 'atendente',
                        'role'            => 'Onboarding',
                        'partner_key'     => 'cs',
                        'prompt_base'     => "Guie primeiros passos: conectar WhatsApp, criar agente, publicar fluxo.\nChecklist de go-live em 7 dias.",
                    ],
                    [
                        'key'         => 'cs',
                        'name'        => 'Customer Success',
                        'agent_type'  => 'suporte',
                        'role'        => 'Suporte & retenção',
                        'prompt_base' => "Suporte contínuo, renovação e upsell.\nEscale bugs críticos para humano com resumo em {{mensagens_hoje}}.",
                    ],
                ];

            case 'restaurante_stack':
                return [
                    [
                        'key'         => 'delivery',
                        'name'        => 'Atendente — Delivery',
                        'agent_type'  => 'restaurante',
                        'role'        => 'Pedidos',
                        'prompt_base' => "Cardápio, taxa de entrega e horário de funcionamento seg–dom 18h–23h.\nPIX e cartão na entrega. Sempre confirme endereço completo.",
                    ],
                ];

            default:
                return [];
        }
    }

    /**
     * Instruções do cérebro + tags que disparam fluxos do pacote (append ao prompt_base).
     */
    private static function brainPlaybookAppend(string $packId, string $agentKey): string
    {
        $tags = match ($packId) {
            'agencia_stack' => match ($agentKey) {
                'recepcao'  => 'lead-agencia | suporte-tecnico (escala técnico)',
                'comercial' => 'proposta-em-andamento | briefing-capturado — use crm.add_tag ao fechar escopo',
                'suporte'   => 'suporte-tecnico | ticket-aberto',
                default     => 'lead-agencia',
            },
            'clinica_stack' => match ($agentKey) {
                'secretaria' => 'paciente-novo | triagem-clinica | agendar-consulta → consulta-agendada (Calendar)',
                'pos'        => 'consulta-realizada (NPS) — tag dispara fluxo pós-consulta',
                default      => 'agendar-consulta',
            },
            'ecommerce_stack' => match ($agentKey) {
                'vendas'      => 'lead-loja | comprou',
                'recuperacao' => 'carrinho-abandonado — use crm.add_tag quando detectar abandono',
                default       => 'lead-loja',
            },
            'saas_stack' => match ($agentKey) {
                'sdr'        => 'lead-saas | demo-agendada — qualifique BANT na memória',
                'demo'       => 'demo-agendada | demo-confirmada — calendar.create_event após confirmar',
                'onboarding' => 'onboarding-ativo',
                'cs'         => 'suporte-urgente — crm.add_tag se caso crítico',
                default      => 'lead-saas',
            },
            'restaurante_stack' => 'pedido-confirmado — confirme pedido na sessão antes da tag',
            default => 'lead-novo',
        };

        return "\n\n--- CÉREBRO AUVVO (backend executa; cliente não vê o JSON) ---\n"
            . "Quando precisar gravar no CRM, agendar, planilha ou webhook, inclua na ÚLTIMA LINHA:\n"
            . "[[AUVO_ACTIONS]]\n"
            . '[ {"tool":"crm.add_tag","payload":{"tag":"NOME"}}, ... ]' . "\n"
            . "Ferramentas: crm.add_tag, crm.move_stage, crm.set_memory, calendar.create_event (se conectado), "
            . "sheets.append_row, webhook.outbound, http.preset, crm.clear_mission (ao concluir missão).\n"
            . "Tags úteis neste pacote: {$tags}.\n"
            . 'Ao concluir objetivo da conversa, use tag de conclusão (ex.: consulta-agendada, demo-confirmada, missao-concluida) ou crm.clear_mission.';
    }
}
