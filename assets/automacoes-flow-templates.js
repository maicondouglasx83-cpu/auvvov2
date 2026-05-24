/**
 * Templates de fluxo — playbooks prontos alinhados ao motor atual.
 * Gatilhos WhatsApp usam ID da conexão (linha), não do agente.
 */
(function () {
  const SECTOR_ORDER = [
    '⭐ Recomendados',
    'WhatsApp',
    'IA & conversação',
    'CRM & funil',
    'Por segmento',
    'Integrações',
    'Personalizado',
  ];

  function cardHtml(type, data) {
    const titles = {
      flow_trigger: ['Início', 'Gatilho'],
      flow_condition: ['Condição', 'Filtro'],
      flow_randomizer: ['Randomizador', 'A/B'],
      flow_delay: ['Espera', 'Atraso'],
      flow_action: ['Ação', 'CRM'],
      flow_message: ['Mensagem', 'WhatsApp'],
      flow_memory: ['Memória IA', 'CRM'],
      flow_agent: ['Agente IA', 'Cérebro'],
      flow_think: ['Pensar', 'IA'],
      flow_wait_reply: ['Aguardar', 'Chat'],
      flow_converse: ['Atendimento', 'Fluido'],
    };
    const t = titles[type] || ['Nó', ''];
    const body = (data && data._preview) || 'Configure no painel →';
    const fnClass = type.replace('flow_', '');
    return `<div class="fn-node fn-${fnClass}"><div class="fn-head"><div class="fn-icon"></div><div><div class="fn-title">${t[0]}</div><div class="fn-sub">${t[1]}</div></div></div><div class="fn-body">${body}</div><div class="fn-stats"><div class="fn-stat"><span>Entraram</span><em>0</em></div><div class="fn-stat"><span>Sucesso</span><em>0</em></div><div class="fn-stat"><span>Erro</span><em>0</em></div></div></div>`;
  }

  function makeGraph(nodes) {
    const data = {};
    nodes.forEach((n) => {
      const ins = n.ins || 0;
      const outs = n.outCount || 1;
      const inputs = {};
      const outputs = {};
      for (let i = 1; i <= ins; i++) inputs['input_' + i] = { connections: [] };
      for (let o = 1; o <= outs; o++) outputs['output_' + o] = { connections: [] };
      data[n.id] = {
        id: n.id,
        name: n.class,
        data: n.data || {},
        class: n.class,
        html: cardHtml(n.class, n.data),
        typenode: false,
        inputs,
        outputs,
        pos_x: n.x,
        pos_y: n.y,
      };
    });
    nodes.forEach((n) => {
      (n.links || []).forEach((lnk) => {
        const from = data[n.id];
        const to = data[lnk.to];
        if (!from || !to) return;
        from.outputs[lnk.fromOut || 'output_1'].connections.push({ node: String(lnk.to), output: lnk.toIn || 'input_1' });
        to.inputs[lnk.toIn || 'input_1'].connections.push({ node: String(n.id), input: lnk.fromOut || 'output_1' });
      });
    });
    return { drawflow: { Home: { data } } };
  }

  function ctx(agents, connections) {
    const ag = agents && agents[0] ? parseInt(agents[0].id, 10) : 0;
    const ag2 = agents && agents[1] ? parseInt(agents[1].id, 10) : ag;
    const conn = connections && connections[0] ? parseInt(connections[0].id, 10) : 0;
    const connKey = conn > 0 ? String(conn) : '*';
    return { ag, ag2, conn, connKey };
  }

  window.AUVVO_FLOW_TEMPLATES = [
    {
      id: 'starter_atendimento_fluido',
      sector: '⭐ Recomendados',
      featured: true,
      icon: 'ph-chats-circle',
      color: '#7c3aed',
      name: 'Atendimento fluido (IA contínua)',
      description: 'Boas-vindas → IA responde com contexto em todas as mensagens seguintes. Ideal para atendente real.',
      build(agents, connections) {
        const { ag, conn, connKey } = ctx(agents, connections);
        return {
          name: 'Atendimento fluido',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 140, ins: 0, data: { trigger_type: 'whatsapp_first', trigger_value: connKey, _preview: '<strong>Primeira msg</strong>' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_message', x: 280, y: 120, ins: 1, data: { connection_id: conn, agent_id: ag, message: 'Olá {{nome}}! 👋 Sou o assistente virtual.\n\nPode me contar como posso ajudar?', _preview: 'Boas-vindas' }, links: [{ to: 3 }] },
            { id: 3, class: 'flow_converse', x: 560, y: 120, ins: 1, data: { connection_id: conn, agent_id: ag, instructions: 'Conduza um atendimento natural: entenda a necessidade, faça perguntas curtas, tire dúvidas e convide para o próximo passo quando fizer sentido. Seja humano e objetivo.', max_turns: 30, end_keywords: 'tchau,obrigado,encerrar', end_tag: 'atendido', _preview: 'IA contínua' } },
          ]),
        };
      },
    },
    {
      id: 'starter_primeiro_contato',
      sector: '⭐ Recomendados',
      featured: true,
      icon: 'ph-whatsapp-logo',
      color: '#059669',
      name: 'Primeiro contato completo',
      description: 'Boas-vindas fixas → tag → agente IA responde. Ideal para começar hoje.',
      build(agents, connections) {
        const { ag, conn, connKey } = ctx(agents, connections);
        return {
          name: 'Primeiro contato',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 140, ins: 0, data: { trigger_type: 'whatsapp_first', trigger_value: connKey, _preview: '<strong>Primeira msg</strong>' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_message', x: 300, y: 120, ins: 1, data: { connection_id: conn, agent_id: ag, message: 'Olá {{nome}}! 👋 Obrigado por falar conosco.\n\nEm instantes continuamos.', _preview: 'Boas-vindas' }, links: [{ to: 3 }] },
            { id: 3, class: 'flow_action', x: 560, y: 120, ins: 1, data: { action_type: 'add_tag', tag: 'lead-novo', _preview: 'Tag lead-novo' }, links: [{ to: 4 }] },
            { id: 4, class: 'flow_agent', x: 820, y: 120, ins: 1, data: { connection_id: conn, agent_id: ag, mission: 'Qualifique o interesse em 2 perguntas curtas.', mode: 'respond', _preview: 'Agente qualifica' } },
          ]),
        };
      },
    },
    {
      id: 'starter_qualificacao_chat',
      sector: '⭐ Recomendados',
      featured: true,
      icon: 'ph-chat-teardrop-dots',
      color: '#0d9488',
      name: 'Qualificação com resposta',
      description: 'Mensagem → IA pensa → aguarda resposta → tag qualificado ou timeout.',
      build(agents, connections) {
        const { ag, conn, connKey } = ctx(agents, connections);
        return {
          name: 'Qualificação conversacional',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 160, ins: 0, data: { trigger_type: 'whatsapp_first', trigger_value: connKey, _preview: 'Primeira msg' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_message', x: 280, y: 140, ins: 1, data: { connection_id: conn, agent_id: ag, message: 'Oi {{nome}}! Posso te fazer 2 perguntas rápidas?', _preview: 'Abertura' }, links: [{ to: 3 }] },
            { id: 3, class: 'flow_think', x: 540, y: 120, ins: 1, data: { connection_id: conn, agent_id: ag, instructions: 'Faça 2 perguntas de qualificação (necessidade + prazo). Seja objetivo.', message_count: 2, include_context: 1, send_whatsapp: 1, _preview: '2 msgs IA' }, links: [{ to: 4 }] },
            { id: 4, class: 'flow_wait_reply', x: 800, y: 120, ins: 1, outCount: 2, data: { timeout_hours: 24, keyword_contains: '', _preview: '24h timeout' }, links: [{ to: 5, fromOut: 'output_1' }, { to: 6, fromOut: 'output_2' }] },
            { id: 5, class: 'flow_action', x: 1060, y: 60, ins: 1, data: { action_type: 'add_tag', tag: 'qualificado', _preview: 'Respondeu' } },
            { id: 6, class: 'flow_action', x: 1060, y: 220, ins: 1, data: { action_type: 'add_tag', tag: 'sem-resposta', _preview: 'Timeout' } },
          ]),
        };
      },
    },
    {
      id: 'starter_só_mensagem',
      sector: '⭐ Recomendados',
      icon: 'ph-paper-plane-tilt',
      color: '#047857',
      name: 'Só mensagem fixa',
      description: 'Mínimo: primeira mensagem → texto fixo com variáveis. Teste rápido.',
      build(agents, connections) {
        const { ag, conn, connKey } = ctx(agents, connections);
        return {
          name: 'Mensagem fixa',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 80, y: 140, ins: 0, data: { trigger_type: 'whatsapp_first', trigger_value: connKey, _preview: 'Primeira msg' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_message', x: 380, y: 120, ins: 1, data: { connection_id: conn, agent_id: ag, message: 'Olá {{nome}}! Recebemos sua mensagem: «{{mensagem}}»\n\nRetornamos em breve.', _preview: 'Texto fixo' } },
          ]),
        };
      },
    },
    {
      id: 'wa_toda_mensagem',
      sector: 'WhatsApp',
      icon: 'ph-chats-circle',
      color: '#0d9488',
      name: 'Toda mensagem + condição',
      description: 'Dispara a cada mensagem. Filtra palavra-chave ou horário comercial.',
      build(agents, connections) {
        const { ag, conn, connKey } = ctx(agents, connections);
        return {
          name: 'Msg com filtro',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 160, ins: 0, data: { trigger_type: 'whatsapp_message', trigger_value: connKey, cooldown_mode: 'once_per_day', _preview: 'Toda msg · 1x/dia' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_condition', x: 280, y: 140, ins: 1, outCount: 2, data: { keyword_contains: 'preço, valor, orçamento', _preview: 'Contém preço?' }, links: [{ to: 3, fromOut: 'output_1' }] },
            { id: 3, class: 'flow_agent', x: 540, y: 100, ins: 1, data: { connection_id: conn, agent_id: ag, mission: 'Envie tabela de preços e convide para demo.', mode: 'respond', _preview: 'Agente preços' } },
          ]),
        };
      },
    },
    {
      id: 'wa_horario',
      sector: 'WhatsApp',
      icon: 'ph-clock',
      color: '#0891b2',
      name: 'Horário comercial',
      description: 'Aberto → atendimento. Fechado → mensagem automática.',
      build(agents, connections) {
        const { ag, conn, connKey } = ctx(agents, connections);
        return {
          name: 'Horário comercial',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 160, ins: 0, data: { trigger_type: 'whatsapp_message', trigger_value: connKey, _preview: 'Toda msg' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_condition', x: 280, y: 140, ins: 1, outCount: 2, data: { business_hours_only: 1, bh_start: '08:00', bh_end: '18:00', bh_weekdays: '1,2,3,4,5', _preview: 'Seg–Sex 8–18h' }, links: [{ to: 3, fromOut: 'output_1' }, { to: 4, fromOut: 'output_2' }] },
            { id: 3, class: 'flow_agent', x: 540, y: 60, ins: 1, data: { connection_id: conn, agent_id: ag, mode: 'respond', _preview: 'Atendimento' } },
            { id: 4, class: 'flow_message', x: 540, y: 220, ins: 1, data: { connection_id: conn, agent_id: ag, message: 'Oi {{nome}}! Estamos fora do horário (8h–18h). Retornamos no próximo dia útil.', _preview: 'Fora do horário' } },
          ]),
        };
      },
    },
    {
      id: 'ia_pensar_responder',
      sector: 'IA & conversação',
      icon: 'ph-lightbulb',
      color: '#b45309',
      name: 'Pensar & responder (3 msgs)',
      description: 'IA gera até 3 mensagens com instruções customizadas — sem depender do webhook.',
      build(agents, connections) {
        const { ag, conn, connKey } = ctx(agents, connections);
        return {
          name: 'Pensar & responder',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 140, ins: 0, data: { trigger_type: 'whatsapp_first', trigger_value: connKey, _preview: 'Primeira msg' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_think', x: 300, y: 120, ins: 1, data: { connection_id: conn, agent_id: ag, instructions: 'Apresente a empresa, faça 2 perguntas de qualificação e convide para próximo passo.', message_count: 3, include_context: 1, send_whatsapp: 1, memory_key: 'qualificacao', _preview: '3 msgs IA' } },
          ]),
        };
      },
    },
    {
      id: 'ia_missao_tag',
      sector: 'IA & conversação',
      icon: 'ph-brain',
      color: '#6d28d9',
      name: 'Tag → missão no cérebro',
      description: 'Tag dispara missão temporária — Calendar, CRM e ferramentas na próxima resposta IA.',
      build(agents, connections) {
        const { ag, conn } = ctx(agents, connections);
        return {
          name: 'Missão por tag',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 140, ins: 0, data: { trigger_type: 'tag_added', trigger_value: 'agendar-demo', _preview: 'Tag agendar-demo' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_action', x: 300, y: 120, ins: 1, data: { action_type: 'brain_mission', mission: 'Confirmar horário com o lead. Se aceitar, criar evento 30min no Calendar, tag demo-agendada, estágio qualified.', _preview: 'Missão Calendar' }, links: [{ to: 3 }] },
            { id: 3, class: 'flow_message', x: 560, y: 120, ins: 1, data: { connection_id: conn, agent_id: ag, message: '{{nome}}, vou confirmar o melhor horário agora.', _preview: 'Transição' } },
          ]),
        };
      },
    },
    {
      id: 'crm_estagio_handoff',
      sector: 'CRM & funil',
      icon: 'ph-columns',
      color: '#4338ca',
      name: 'Estágio → handoff agente',
      description: 'Lead entra em Proposta: troca agente + mensagem de abertura.',
      build(agents, connections) {
        const { ag, ag2, conn } = ctx(agents, connections);
        return {
          name: 'Handoff por estágio',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 140, ins: 0, data: { trigger_type: 'stage_enter', trigger_value: 'proposal', _preview: 'Estágio Proposta' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_action', x: 300, y: 120, ins: 1, data: { action_type: 'invoke_agent', agent_id: ag2, switch_agent: 1, message: 'Oi {{nome}}! Assumi sua negociação. Como prefere avançar?', _preview: '→ Agente 2' }, links: [{ to: 3 }] },
            { id: 3, class: 'flow_action', x: 560, y: 120, ins: 1, data: { action_type: 'add_tag', tag: 'em-negociacao', _preview: 'Tag negociação' } },
          ]),
        };
      },
    },
    {
      id: 'crm_tag_followup',
      sector: 'CRM & funil',
      icon: 'ph-tag',
      color: '#b45309',
      name: 'Tag → espera → follow-up',
      description: 'Tag follow-up: espera 2h → mensagem automática.',
      build(agents, connections) {
        const { ag, conn } = ctx(agents, connections);
        return {
          name: 'Follow-up por tag',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 140, ins: 0, data: { trigger_type: 'tag_added', trigger_value: 'follow-up', _preview: 'Tag follow-up' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_delay', x: 280, y: 130, ins: 1, data: { delay_minutes: 120, _preview: '2 horas' }, links: [{ to: 3 }] },
            { id: 3, class: 'flow_message', x: 540, y: 110, ins: 1, data: { connection_id: conn, agent_id: ag, message: '{{nome}}, passando para saber se ainda posso ajudar. Posso retomar?', _preview: 'Follow-up' } },
          ]),
        };
      },
    },
    {
      id: 'seg_clinica',
      sector: 'Por segmento',
      icon: 'ph-heartbeat',
      color: '#ec4899',
      name: 'Clínica — agendamento',
      description: 'Secretária virtual + pensar & responder + tag paciente-novo.',
      build(agents, connections) {
        const { ag, conn, connKey } = ctx(agents, connections);
        return {
          name: 'Clínica — agendamento',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 140, ins: 0, data: { trigger_type: 'whatsapp_first', trigger_value: connKey, _preview: 'Primeira msg' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_message', x: 280, y: 120, ins: 1, data: { connection_id: conn, agent_id: ag, message: 'Olá {{nome}}! Sou a secretária virtual.\n\nAgendamento, convênio ou dúvidas?', _preview: 'Secretária' }, links: [{ to: 3 }] },
            { id: 3, class: 'flow_think', x: 540, y: 100, ins: 1, data: { connection_id: conn, agent_id: ag, instructions: 'Qualifique motivo da consulta. Ofereça 2 horários. Confirme nome completo.', message_count: 2, include_context: 1, send_whatsapp: 1, _preview: 'Qualificação' }, links: [{ to: 4 }] },
            { id: 4, class: 'flow_action', x: 800, y: 120, ins: 1, data: { action_type: 'add_tag', tag: 'paciente-novo', _preview: 'Tag paciente' } },
          ]),
        };
      },
    },
    {
      id: 'seg_loja_ab',
      sector: 'Por segmento',
      icon: 'ph-shopping-cart',
      color: '#f59e0b',
      name: 'Loja — A/B boas-vindas',
      description: 'Teste A/B de oferta na primeira mensagem.',
      build(agents, connections) {
        const { ag, conn, connKey } = ctx(agents, connections);
        return {
          name: 'Loja A/B',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 160, ins: 0, data: { trigger_type: 'whatsapp_first', trigger_value: connKey, _preview: 'Primeiro contato' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_randomizer', x: 260, y: 140, ins: 1, outCount: 2, data: { pct_a: 50, _preview: 'A/B 50%' }, links: [{ to: 3, fromOut: 'output_1' }, { to: 4, fromOut: 'output_2' }] },
            { id: 3, class: 'flow_message', x: 520, y: 60, ins: 1, data: { connection_id: conn, agent_id: ag, message: '🔥 {{nome}}! 10% OFF com BEMVINDO10 hoje.', _preview: 'Promo A' }, links: [{ to: 5 }] },
            { id: 4, class: 'flow_message', x: 520, y: 220, ins: 1, data: { connection_id: conn, agent_id: ag, message: '🎁 {{nome}}! Frete grátis acima de R$150 esta semana.', _preview: 'Promo B' }, links: [{ to: 5 }] },
            { id: 5, class: 'flow_action', x: 780, y: 140, ins: 1, data: { action_type: 'add_tag', tag: 'lead-loja', _preview: 'Tag lead-loja' } },
          ]),
        };
      },
    },
    {
      id: 'seg_agencia',
      sector: 'Por segmento',
      icon: 'ph-megaphone',
      color: '#6366f1',
      name: 'Agência — onboarding',
      description: 'Captura interesse na memória + tag + estágio novo.',
      build(agents, connections) {
        const { ag, conn, connKey } = ctx(agents, connections);
        return {
          name: 'Agência onboarding',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 140, ins: 0, data: { trigger_type: 'whatsapp_first', trigger_value: connKey, _preview: 'Primeira msg' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_message', x: 280, y: 120, ins: 1, data: { connection_id: conn, agent_id: ag, message: 'Olá {{nome}}! Conte em uma frase o que precisa (tráfego, site, social).', _preview: 'Recepção' }, links: [{ to: 3 }] },
            { id: 3, class: 'flow_memory', x: 540, y: 100, ins: 1, data: { memory_key: 'interesse', value_mode: 'session_today', _preview: 'memoria.interesse' }, links: [{ to: 4 }] },
            { id: 4, class: 'flow_action', x: 800, y: 100, ins: 1, data: { action_type: 'add_tag', tag: 'lead-agencia', _preview: 'Tag' }, links: [{ to: 5 }] },
            { id: 5, class: 'flow_action', x: 1060, y: 100, ins: 1, data: { action_type: 'move_stage', stage: 'new', _preview: 'Estágio Novo' } },
          ]),
        };
      },
    },
    {
      id: 'int_webhook',
      sector: 'Integrações',
      icon: 'ph-plugs-connected',
      color: '#7c3aed',
      name: 'Webhook → WhatsApp',
      description: 'Lead de formulário/Hotmart: tag + mensagem de boas-vindas.',
      build(agents, connections) {
        const { ag, conn } = ctx(agents, connections);
        return {
          name: 'Webhook lead',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 140, ins: 0, data: { trigger_type: 'webhook_received', trigger_value: 'lead-form', _preview: 'Webhook lead-form' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_action', x: 300, y: 120, ins: 1, data: { action_type: 'add_tag', tag: 'lead-web', _preview: 'Tag lead-web' }, links: [{ to: 3 }] },
            { id: 3, class: 'flow_message', x: 560, y: 120, ins: 1, data: { connection_id: conn, agent_id: ag, message: 'Olá {{nome}}! Recebemos seu cadastro. Em que posso ajudar?', _preview: 'WhatsApp' } },
          ]),
        };
      },
    },
    {
      id: 'int_ltv',
      sector: 'Integrações',
      icon: 'ph-chart-line-down',
      color: '#ca8a04',
      name: 'LTV — reativação',
      description: 'Cliente inativo: mensagem + tag reativação.',
      build(agents, connections) {
        const { ag, conn } = ctx(agents, connections);
        return {
          name: 'LTV reativação',
          export: makeGraph([
            { id: 1, class: 'flow_trigger', x: 40, y: 140, ins: 0, data: { trigger_type: 'ltv_inactive', trigger_value: 'default', _preview: 'LTV inativo' }, links: [{ to: 2 }] },
            { id: 2, class: 'flow_message', x: 300, y: 120, ins: 1, data: { connection_id: conn, agent_id: ag, message: '{{nome}}, sentimos sua falta! Temos condição especial. Posso contar?', _preview: 'Reativação' }, links: [{ to: 3 }] },
            { id: 3, class: 'flow_action', x: 560, y: 120, ins: 1, data: { action_type: 'add_tag', tag: 'ltv-reativacao', _preview: 'Tag LTV' } },
          ]),
        };
      },
    },
    {
      id: 'blank',
      sector: 'Personalizado',
      icon: 'ph-plus-circle',
      color: '#64748b',
      name: 'Em branco',
      description: 'Canvas vazio com nó Início. Monte do zero.',
      build() {
        return { name: 'Nova automação', export: null };
      },
    },
  ];

  window.AUVVO_FLOW_TEMPLATE_SECTORS = SECTOR_ORDER;
})();
