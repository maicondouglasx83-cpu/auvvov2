/**
 * Templates de fluxo — playbooks alinhados ao motor + cérebro IA.
 * Preferência: whatsapp_first, stage_enter, tag_added, webhook_received.
 * Agendamento/CRM/integrações no chat → instruções do agente + [[AUVO_ACTIONS]].
 */
(function () {
  function cardHtml(type, data) {
    const titles = {
      flow_trigger: ['Início', 'Gatilho'],
      flow_condition: ['Condição', 'Filtro'],
      flow_randomizer: ['Randomizador', 'A/B'],
      flow_delay: ['Espera', 'Atraso'],
      flow_action: ['Ação', 'Sistema'],
      flow_message: ['Mensagem', 'WhatsApp'],
      flow_memory: ['Memória IA', 'CRM'],
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

  function firstAgentId(agents) {
    return agents && agents[0] ? parseInt(agents[0].id, 10) : 0;
  }

  function agentSlots(agents) {
    const list = agents || [];
    const slot = (i) => {
      const a = list[i];
      const id = a ? parseInt(a.id, 10) : 0;
      return { id, key: id > 0 ? String(id) : '*', name: a ? a.name : 'Agente ' + (i + 1) };
    };
    return { a0: slot(0), a1: slot(1), a2: slot(2), a3: slot(3), count: list.length };
  }

  window.AUVVO_FLOW_TEMPLATES = [
    {
      id: 'whatsapp_primeiro_contato',
      sector: 'WhatsApp',
      icon: 'ph-whatsapp-logo',
      color: '#059669',
      name: 'Primeiro contato — boas-vindas',
      description: 'Primeira mensagem no Evolution: saudação, tag lead-novo e atribuição. A IA responde nas instruções do agente.',
      build(agents) {
        const ag = firstAgentId(agents);
        const agKey = ag > 0 ? String(ag) : '*';
        return {
          name: 'Primeiro contato WhatsApp',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'whatsapp_first', trigger_value: agKey, _preview: '<strong>Primeira mensagem</strong>' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_message',
              x: 320,
              y: 120,
              ins: 1,
              data: {
                agent_id: ag,
                message:
                  'Olá {{nome}}! 👋 Obrigado por falar conosco.\n\nVi sua mensagem: «{{ultima_sessao}}»\nEm instantes continuamos o atendimento.',
                _preview: 'Boas-vindas + contexto',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 600,
              y: 120,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'lead-novo', _preview: 'Tag lead-novo' },
              links: [{ to: 4 }],
            },
            {
              id: 4,
              class: 'flow_action',
              x: 860,
              y: 120,
              ins: 1,
              data: { action_type: 'assign_agent', agent_id: ag, label: 'Atribuir agente', _preview: 'Agente da linha' },
            },
          ]),
        };
      },
    },
    {
      id: 'tag_missao_cerebro',
      sector: 'Cérebro IA',
      icon: 'ph-brain',
      color: '#6d28d9',
      name: 'Tag dispara missão para o cérebro',
      description: 'Quando o agente (ou fluxo) adiciona uma tag, grava missão na memória — a próxima resposta IA executa Calendar, CRM, webhooks.',
      build(agents) {
        const ag = firstAgentId(agents);
        return {
          name: 'Missão IA por tag',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'agendar-consulta', _preview: 'Tag <em>agendar-consulta</em>' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 340,
              y: 120,
              ins: 1,
              data: {
                action_type: 'brain_mission',
                mission:
                  'Confirmar data/horário com o lead. Se aceitar, criar evento no Google Calendar (30 min). Adicionar tag consulta-agendada e mover estágio para qualified.',
                _preview: 'Missão → Calendar + CRM',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 620,
              y: 120,
              ins: 1,
              data: {
                agent_id: ag,
                message: '{{nome}}, vou confirmar o melhor horário com você agora. Um momento.',
                _preview: 'Mensagem de transição',
              },
            },
          ]),
        };
      },
    },
    {
      id: 'agencia_onboarding',
      sector: 'Agência',
      icon: 'ph-megaphone',
      color: '#6366f1',
      name: 'Agência — onboarding do lead',
      description: 'Primeiro contato na recepção: memória do interesse, tag e estágio. Orçamento e proposta ficam no prompt do agente comercial.',
      build(agents) {
        const s = agentSlots(agents);
        const ag = s.a0.id;
        const agKey = s.a0.key;
        return {
          name: 'Agência — onboarding',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 140,
              ins: 0,
              data: { trigger_type: 'whatsapp_first', trigger_value: agKey, _preview: 'Primeira msg · Recepção' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_message',
              x: 300,
              y: 120,
              ins: 1,
              data: {
                agent_id: ag,
                message:
                  'Olá {{nome}}! Sou da recepção da agência.\n\nConte em uma frase o que precisa (tráfego, site, social, branding) — já anoto para o time.',
                _preview: 'Recepção',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_memory',
              x: 560,
              y: 100,
              ins: 1,
              data: { memory_key: 'interesse', value_mode: 'session_today', _preview: 'memoria.interesse' },
              links: [{ to: 4 }],
            },
            {
              id: 4,
              class: 'flow_action',
              x: 820,
              y: 100,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'lead-agencia', _preview: 'Tag lead-agencia' },
              links: [{ to: 5 }],
            },
            {
              id: 5,
              class: 'flow_action',
              x: 1080,
              y: 100,
              ins: 1,
              data: { action_type: 'move_stage', stage: 'new', _preview: 'Estágio Novo' },
            },
          ]),
        };
      },
    },
    {
      id: 'agencia_estagio_proposta',
      sector: 'Agência',
      icon: 'ph-file-text',
      color: '#4f46e5',
      name: 'Agência — estágio Proposta',
      description: 'Entrada no estágio proposal: handoff comercial + missão de enviar proposta (cérebro pode usar Sheets/webhook).',
      build(agents) {
        const s = agentSlots(agents);
        const com = s.a1.id || s.a0.id;
        return {
          name: 'Agência — proposta',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'stage_enter', trigger_value: 'proposal', _preview: 'Estágio <strong>Proposta</strong>' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 320,
              y: 120,
              ins: 1,
              data: {
                action_type: 'invoke_agent',
                agent_id: com,
                switch_agent: 1,
                message: 'Oi {{nome}}! Sou do comercial. Vi seu interesse: {{memoria.interesse}}\nMonto a proposta em até 24h.',
                _preview: 'Handoff → Comercial',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 600,
              y: 120,
              ins: 1,
              data: {
                action_type: 'brain_mission',
                mission:
                  'Coletar escopo final (serviços, prazo, budget). Registrar na memória briefing. Se tiver integração, append na planilha de leads. Tag proposta-em-andamento.',
                _preview: 'Missão proposta',
              },
            },
          ]),
        };
      },
    },
    {
      id: 'agencia_tag_suporte',
      sector: 'Agência',
      icon: 'ph-headset',
      color: '#7c3aed',
      name: 'Agência — tag suporte técnico',
      description: 'Tag suporte-tecnico aciona agente de suporte e pausa comercial. Sem palavra-chave no texto.',
      build(agents) {
        const s = agentSlots(agents);
        const sup = s.a2.id || s.a0.id;
        return {
          name: 'Agência — suporte',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'suporte-tecnico', _preview: 'Tag suporte-tecnico' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 320,
              y: 120,
              ins: 1,
              data: {
                action_type: 'invoke_agent',
                agent_id: sup,
                switch_agent: 1,
                message: '{{nome}}, suporte técnico aqui. Qual campanha/site apresenta problema?',
                _preview: '→ Suporte',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 600,
              y: 120,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'ticket-aberto', _preview: 'Tag ticket' },
            },
          ]),
        };
      },
    },
    {
      id: 'clinica_primeiro_contato',
      sector: 'Clínica',
      icon: 'ph-heartbeat',
      color: '#ec4899',
      name: 'Clínica — primeiro contato + agendamento IA',
      description: 'Primeira mensagem: secretária virtual. Agendamento no Calendar via instruções do agente (não keyword).',
      build(agents) {
        const ag = firstAgentId(agents);
        const agKey = ag > 0 ? String(ag) : '*';
        return {
          name: 'Clínica — primeiro contato',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'whatsapp_first', trigger_value: agKey, _preview: 'Primeira msg' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_message',
              x: 320,
              y: 120,
              ins: 1,
              data: {
                agent_id: ag,
                message:
                  'Olá {{nome}}! Sou a secretária virtual da clínica.\n\nPosso ajudar com agendamento, convênio ou dúvidas. Como prefere ser chamado(a)?',
                _preview: 'Secretária',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 600,
              y: 120,
              ins: 1,
              data: {
                action_type: 'brain_mission',
                mission:
                  'Qualificar motivo da consulta. Oferecer 2–3 horários. Ao confirmar, calendar.create_event 30min, tag consulta-agendada, estágio qualified.',
                _preview: 'Missão agendar',
              },
              links: [{ to: 4 }],
            },
            {
              id: 4,
              class: 'flow_action',
              x: 860,
              y: 120,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'paciente-novo', _preview: 'Tag paciente-novo' },
            },
          ]),
        };
      },
    },
    {
      id: 'clinica_lembrete_consulta',
      sector: 'Clínica',
      icon: 'ph-calendar-check',
      color: '#db2777',
      name: 'Clínica — lembrete 24h (estágio)',
      description: 'Lead entra em qualified → espera 24h → lembrete automático. Confirmação/reagendar no agente.',
      build(agents) {
        const ag = firstAgentId(agents);
        return {
          name: 'Clínica — lembrete',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'stage_enter', trigger_value: 'qualified', _preview: 'Estágio Qualificado' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_delay',
              x: 300,
              y: 130,
              ins: 1,
              data: { delay_minutes: 1440, _preview: '24 horas' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 560,
              y: 110,
              ins: 1,
              data: {
                agent_id: ag,
                message: '{{nome}}, lembrete da sua consulta amanhã. Confirma presença? (SIM / reagendar)',
                _preview: 'Lembrete',
              },
              links: [{ to: 4 }],
            },
            {
              id: 4,
              class: 'flow_action',
              x: 820,
              y: 110,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'lembrete-enviado', _preview: 'Tag lembrete' },
            },
          ]),
        };
      },
    },
    {
      id: 'clinica_pos_consulta',
      sector: 'Clínica',
      icon: 'ph-smiley',
      color: '#be185d',
      name: 'Clínica — pós-consulta (tag)',
      description: 'Tag consulta-realizada: NPS via cérebro + pausa IA para humano assumir se necessário.',
      build(agents) {
        const ag = firstAgentId(agents);
        return {
          name: 'Clínica — pós-consulta',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'consulta-realizada', _preview: 'Tag consulta-realizada' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 320,
              y: 120,
              ins: 1,
              data: {
                action_type: 'brain_mission',
                mission: 'Perguntar NPS 0–10 e registrar em memoria.nps. Se nota ≤6, tag alerta-cs e mover estágio follow-up.',
                _preview: 'Missão NPS',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 600,
              y: 120,
              ins: 1,
              data: {
                agent_id: ag,
                message: '{{nome}}, como foi sua consulta? De 0 a 10, o quanto recomendaria nossa clínica?',
                _preview: 'Pós-consulta',
              },
              links: [{ to: 4 }],
            },
            {
              id: 4,
              class: 'flow_action',
              x: 860,
              y: 120,
              ins: 1,
              data: { action_type: 'pause_ai', agent_id: ag, minutes: 180, _preview: 'Pausa IA 3h' },
            },
          ]),
        };
      },
    },
    {
      id: 'clinica_triagem_tag',
      sector: 'Clínica',
      icon: 'ph-first-aid',
      color: '#f472b6',
      name: 'Clínica — triagem (tag + memória)',
      description: 'Tag triagem-clinica: grava sintomas da sessão na memória para o médico/secretária.',
      build(agents) {
        const ag = firstAgentId(agents);
        return {
          name: 'Clínica — triagem',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'triagem-clinica', _preview: 'Tag triagem-clinica' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_memory',
              x: 320,
              y: 120,
              ins: 1,
              data: { memory_key: 'sintomas', value_mode: 'session_today', _preview: 'memoria.sintomas' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 580,
              y: 120,
              ins: 1,
              data: {
                agent_id: ag,
                message: 'Obrigado {{nome}}. Registrei seu relato para a equipe:\n{{memoria.sintomas}}\nPriorizamos seu atendimento.',
                _preview: 'Confirma triagem',
              },
              links: [{ to: 4 }],
            },
            {
              id: 4,
              class: 'flow_action',
              x: 840,
              y: 120,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'triagem-registrada', _preview: 'Tag registrada' },
            },
          ]),
        };
      },
    },
    {
      id: 'ecommerce_primeiro_ab',
      sector: 'E-commerce',
      icon: 'ph-shopping-cart',
      color: '#f59e0b',
      name: 'Loja — primeiro contato A/B',
      description: 'Primeira mensagem com teste A/B de oferta. Cupom e fechamento no agente de vendas.',
      build(agents) {
        const ag = firstAgentId(agents);
        const agKey = ag > 0 ? String(ag) : '*';
        return {
          name: 'Loja — primeiro contato',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 160,
              ins: 0,
              data: { trigger_type: 'whatsapp_first', trigger_value: agKey, _preview: 'Primeiro contato' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_randomizer',
              x: 280,
              y: 140,
              ins: 1,
              outCount: 2,
              data: { pct_a: 50, _preview: 'A/B 50%' },
              links: [{ to: 3, fromOut: 'output_1' }, { to: 4, fromOut: 'output_2' }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 540,
              y: 60,
              ins: 1,
              data: { agent_id: ag, message: '🔥 {{nome}}! Bem-vindo — 10% OFF com BEMVINDO10 hoje.', _preview: 'Promo A' },
              links: [{ to: 5 }],
            },
            {
              id: 4,
              class: 'flow_message',
              x: 540,
              y: 220,
              ins: 1,
              data: { agent_id: ag, message: '🎁 {{nome}}! Frete grátis acima de R$150 nesta semana.', _preview: 'Promo B' },
              links: [{ to: 5 }],
            },
            {
              id: 5,
              class: 'flow_action',
              x: 800,
              y: 140,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'lead-loja', _preview: 'Tag lead-loja' },
            },
          ]),
        };
      },
    },
    {
      id: 'ecommerce_webhook_venda',
      sector: 'E-commerce',
      icon: 'ph-plugs-connected',
      color: '#d97706',
      name: 'Loja — webhook de venda',
      description: 'Hotmart/formulário dispara tag comprou + mensagem pós-compra. Configure o slug do webhook inbound.',
      build(agents) {
        const ag = firstAgentId(agents);
        return {
          name: 'Loja — webhook venda',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'webhook_received', trigger_value: 'venda-hotmart', _preview: 'Webhook <em>venda-hotmart</em>' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 320,
              y: 120,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'comprou', _preview: 'Tag comprou' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 580,
              y: 120,
              ins: 1,
              data: { action_type: 'move_stage', stage: 'closed', _preview: 'Estágio Fechado' },
              links: [{ to: 4 }],
            },
            {
              id: 4,
              class: 'flow_message',
              x: 840,
              y: 120,
              ins: 1,
              data: {
                agent_id: ag,
                message: '{{nome}}, obrigado pela compra! 🎉 Enviamos o rastreio em breve. Dúvidas? Responda aqui.',
                _preview: 'Pós-compra',
              },
            },
          ]),
        };
      },
    },
    {
      id: 'ecommerce_carrinho_tag',
      sector: 'E-commerce',
      icon: 'ph-shopping-bag-open',
      color: '#ea580c',
      name: 'Loja — carrinho abandonado (tag)',
      description: 'Sistema ou agente marca tag carrinho-abandonado → espera 1h → recuperação. Sem keyword.',
      build(agents) {
        const ag = firstAgentId(agents);
        return {
          name: 'Loja — carrinho',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'carrinho-abandonado', _preview: 'Tag carrinho' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_delay',
              x: 300,
              y: 130,
              ins: 1,
              data: { delay_minutes: 60, _preview: '1 hora' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 560,
              y: 110,
              ins: 1,
              data: {
                action_type: 'brain_mission',
                mission: 'Recuperar carrinho: oferecer cupom VOLTA5, tirar objeções, tag recuperacao-ativa. Não insistir mais de 2 vezes.',
                _preview: 'Missão recuperação',
              },
              links: [{ to: 4 }],
            },
            {
              id: 4,
              class: 'flow_message',
              x: 820,
              y: 110,
              ins: 1,
              data: {
                agent_id: ag,
                message: '{{nome}}, seu carrinho ainda está reservado. Quer que eu finalize com cupom VOLTA5?',
                _preview: 'Recuperação',
              },
            },
          ]),
        };
      },
    },
    {
      id: 'saas_primeiro_bant',
      sector: 'SaaS / B2B',
      icon: 'ph-rocket-launch',
      color: '#0ea5e9',
      name: 'SaaS — primeiro contato + BANT',
      description: 'SDR no primeiro WhatsApp: memória BANT e tag. Demo/agenda via cérebro no agente.',
      build(agents) {
        const ag = firstAgentId(agents);
        const agKey = ag > 0 ? String(ag) : '*';
        return {
          name: 'SaaS — SDR primeiro contato',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'whatsapp_first', trigger_value: agKey, _preview: 'Primeira msg · SDR' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_message',
              x: 320,
              y: 120,
              ins: 1,
              data: {
                agent_id: ag,
                message:
                  'Olá {{nome}}! Sou do time comercial.\n\nEm 2 minutos entendo seu cenário (budget, prazo, quem decide). Pode começar pelo maior desafio hoje?',
                _preview: 'SDR BANT',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_memory',
              x: 580,
              y: 100,
              ins: 1,
              data: { memory_key: 'bant', value_mode: 'session_recent', session_limit: 8, _preview: 'memoria.bant' },
              links: [{ to: 4 }],
            },
            {
              id: 4,
              class: 'flow_action',
              x: 840,
              y: 100,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'lead-saas', _preview: 'Tag lead-saas' },
            },
          ]),
        };
      },
    },
    {
      id: 'saas_demo_tag',
      sector: 'SaaS / B2B',
      icon: 'ph-presentation',
      color: '#0284c7',
      name: 'SaaS — demo agendada (tag)',
      description: 'Tag demo-agendada: handoff pré-vendas + missão Calendar. Substitui roteador por palavra.',
      build(agents) {
        const s = agentSlots(agents);
        const demo = s.a1.id || s.a0.id;
        return {
          name: 'SaaS — demo',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'demo-agendada', _preview: 'Tag demo-agendada' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 320,
              y: 120,
              ins: 1,
              data: {
                action_type: 'invoke_agent',
                agent_id: demo,
                switch_agent: 1,
                message: 'Oi {{nome}}! Confirmo sua demo. Contexto: {{memoria.bant}}',
                _preview: '→ Demo',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 600,
              y: 120,
              ins: 1,
              data: {
                action_type: 'brain_mission',
                mission: 'Confirmar slot 20min no Calendar, enviar link Meet, tag demo-confirmada, estágio qualified.',
                _preview: 'Missão demo',
              },
            },
          ]),
        };
      },
    },
    {
      id: 'saas_cs_tag',
      sector: 'SaaS / B2B',
      icon: 'ph-lifebuoy',
      color: '#0369a1',
      name: 'SaaS — suporte (tag)',
      description: 'Tag suporte-urgente: pausa IA e mensagem com resumo da sessão.',
      build(agents) {
        const ag = firstAgentId(agents);
        return {
          name: 'SaaS — CS',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'suporte-urgente', _preview: 'Tag suporte-urgente' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 320,
              y: 120,
              ins: 1,
              data: { action_type: 'pause_ai', agent_id: ag, minutes: 120, _preview: 'Pausa IA 2h' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 580,
              y: 120,
              ins: 1,
              data: {
                agent_id: ag,
                message:
                  '{{nome}}, caso registrado com prioridade.\nResumo recente:\n{{mensagens_hoje}}\nUm especialista assume em breve.',
                _preview: 'CS + sessão',
              },
            },
          ]),
        };
      },
    },
    {
      id: 'restaurante_horario',
      sector: 'Restaurante',
      icon: 'ph-pizza',
      color: '#ef4444',
      name: 'Delivery — horário comercial',
      description: 'Qualquer mensagem na linha delivery: ramifica aberto/fechado (18h–23h). Pedido no agente.',
      build(agents) {
        const ag = firstAgentId(agents);
        const agKey = ag > 0 ? String(ag) : '*';
        return {
          name: 'Delivery — horário',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 160,
              ins: 0,
              data: { trigger_type: 'whatsapp_message', trigger_value: agKey, _preview: 'Msg · Delivery' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_condition',
              x: 280,
              y: 140,
              ins: 1,
              outCount: 2,
              data: {
                business_hours_only: 1,
                bh_start: '18:00',
                bh_end: '23:00',
                bh_weekdays: '1,2,3,4,5,6,7',
                _preview: 'Aberto 18h–23h',
              },
              links: [{ to: 3, fromOut: 'output_1' }, { to: 4, fromOut: 'output_2' }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 540,
              y: 60,
              ins: 1,
              data: { agent_id: ag, message: 'Olá {{nome}}! Estamos abertos 🍕 O que deseja pedir?', _preview: 'Aberto' },
            },
            {
              id: 4,
              class: 'flow_message',
              x: 540,
              y: 240,
              ins: 1,
              data: {
                agent_id: ag,
                message: 'Oi {{nome}}! Estamos fechados (18h–23h). Deixe o pedido que priorizamos na abertura.',
                _preview: 'Fechado',
              },
            },
          ]),
        };
      },
    },
    {
      id: 'restaurante_pedido_tag',
      sector: 'Restaurante',
      icon: 'ph-check-circle',
      color: '#dc2626',
      name: 'Delivery — pedido confirmado (tag)',
      description: 'Agente marca tag pedido-confirmado → memória do pedido + confirmação automática.',
      build(agents) {
        const ag = firstAgentId(agents);
        return {
          name: 'Delivery — pedido',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'pedido-confirmado', _preview: 'Tag pedido-confirmado' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_memory',
              x: 320,
              y: 120,
              ins: 1,
              data: { memory_key: 'pedido', value_mode: 'session_today', _preview: 'memoria.pedido' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 580,
              y: 120,
              ins: 1,
              data: {
                agent_id: ag,
                message: 'Pedido confirmado ✅\n{{memoria.pedido}}\nPrevisão 40–50 min. Obrigado {{nome}}!',
                _preview: 'Confirmação',
              },
            },
          ]),
        };
      },
    },
    {
      id: 'integracao_webhook_lead',
      sector: 'Integrações',
      icon: 'ph-plugs',
      color: '#7c3aed',
      name: 'Lead via webhook + Sheets',
      description: 'Formulário/LP dispara fluxo: tag, estágio e missão para append na planilha (se conectada).',
      build(agents) {
        const ag = firstAgentId(agents);
        return {
          name: 'Webhook — lead',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'webhook_received', trigger_value: 'lead-form', _preview: 'Webhook <em>lead-form</em>' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 320,
              y: 120,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'lead-web', _preview: 'Tag lead-web' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 580,
              y: 120,
              ins: 1,
              data: {
                action_type: 'brain_mission',
                mission: 'Boas-vindas personalizadas. sheets.append_row com nome/email/telefone do payload. move_stage new.',
                _preview: 'Missão Sheets',
              },
              links: [{ to: 4 }],
            },
            {
              id: 4,
              class: 'flow_message',
              x: 840,
              y: 120,
              ins: 1,
              data: {
                agent_id: ag,
                message: 'Olá {{nome}}! Recebemos seu cadastro. Em que posso ajudar agora?',
                _preview: 'WhatsApp',
              },
            },
          ]),
        };
      },
    },
    {
      id: 'ltv_reativacao',
      sector: 'LTV',
      icon: 'ph-chart-line-down',
      color: '#ca8a04',
      name: 'LTV — cliente inativo',
      description: 'Gatilho ltv_inactive: oferta de reativação + missão para o cérebro (cupom, estágio).',
      build(agents) {
        const ag = firstAgentId(agents);
        return {
          name: 'LTV — reativação',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'ltv_inactive', trigger_value: 'default', _preview: 'Cliente inativo (LTV)' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 320,
              y: 120,
              ins: 1,
              data: {
                action_type: 'brain_mission',
                mission: 'Reativar com oferta personalizada (LTV). Tag reativacao-ltv. Se aceitar, move_stage qualified.',
                _preview: 'Missão reativação',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 600,
              y: 120,
              ins: 1,
              data: {
                agent_id: ag,
                message: '{{nome}}, sentimos sua falta! Temos uma condição especial para voltar. Posso contar?',
                _preview: 'Reativação',
              },
              links: [{ to: 4 }],
            },
            {
              id: 4,
              class: 'flow_action',
              x: 860,
              y: 120,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'ltv-reativacao', _preview: 'Tag LTV' },
            },
          ]),
        };
      },
    },
    {
      id: 'multi_agent_estagio',
      sector: 'Avançado',
      icon: 'ph-users-three',
      color: '#4338ca',
      name: 'Handoff multi-agente (estágio)',
      description: 'Estágio negotiation aciona 2º agente da conta. Configure IDs no painel após importar.',
      build(agents) {
        const s = agentSlots(agents);
        return {
          name: 'Handoff por estágio',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'stage_enter', trigger_value: 'proposal', _preview: 'Estágio Proposta' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 320,
              y: 120,
              ins: 1,
              data: {
                action_type: 'invoke_agent',
                agent_id: s.a1.id,
                switch_agent: 1,
                message: '{{nome}}, assumi sua negociação. Vi o histórico: {{memoria.interesse}}\nComo prefere fechar?',
                _preview: 'Agente 2',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 600,
              y: 120,
              ins: 1,
              data: { action_type: 'set_memory', key: 'handoff_em', value: 'negotiation', _preview: 'Memória handoff' },
            },
          ]),
        };
      },
    },
    {
      id: 'avancado_roteador_palavra',
      sector: 'Avançado',
      icon: 'ph-warning',
      color: '#b45309',
      name: '⚠ Roteador por palavra (legado)',
      description: 'Só use se não puder usar tags/estágios. Busca palavras na sessão do dia — frágil com sinônimos.',
      build(agents) {
        const ag = firstAgentId(agents);
        const agKey = ag > 0 ? String(ag) : '*';
        return {
          name: 'Roteador palavra (legado)',
          export: makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 160,
              ins: 0,
              data: { trigger_type: 'whatsapp_message', trigger_value: agKey, _preview: 'Toda mensagem' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_condition',
              x: 300,
              y: 140,
              ins: 1,
              outCount: 2,
              data: { keyword_contains: 'humano, atendente, pessoa', _preview: 'Pediu humano' },
              links: [{ to: 3, fromOut: 'output_1' }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 560,
              y: 120,
              ins: 1,
              data: { action_type: 'pause_ai', agent_id: ag, minutes: 240, _preview: 'Pausa IA 4h' },
            },
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
      description: 'Canvas vazio. Combine gatilhos (tag/estágio) + missão do cérebro nas instruções do agente.',
      build() {
        return { name: 'Nova automação', export: null };
      },
    },
  ];
})();
