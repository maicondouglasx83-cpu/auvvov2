/**
 * Fluxos dos pacotes — gatilhos por tag/estágio/primeira msg (evita keyword routing).
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
    const body = (data && data._preview) || 'Configure →';
    return `<div class="fn-node fn-${type.replace('flow_', '')}"><div class="fn-head"><div class="fn-icon"></div><div><div class="fn-title">${t[0]}</div><div class="fn-sub">${t[1]}</div></div></div><div class="fn-body">${body}</div><div class="fn-stats"><div class="fn-stat"><span>Entraram</span><em>0</em></div><div class="fn-stat"><span>Sucesso</span><em>0</em></div><div class="fn-stat"><span>Erro</span><em>0</em></div></div></div>`;
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

  function idOf(byKey, key, fallbackKey) {
    const a = byKey[key] || byKey[fallbackKey];
    return a && a.id ? parseInt(a.id, 10) : 0;
  }

  function keyOf(byKey, key, fallbackKey) {
    const id = idOf(byKey, key, fallbackKey);
    return id > 0 ? String(id) : '*';
  }

  window.AUVVO_PACK_FLOWS = {
    agencia_stack: [
      {
        name: '[Pacote] Agência — primeiro contato',
        build(byKey) {
          const rec = idOf(byKey, 'recepcao');
          const recK = keyOf(byKey, 'recepcao');
          return makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 140,
              ins: 0,
              data: { trigger_type: 'whatsapp_first', trigger_value: recK, _preview: 'Primeira msg · Recepção' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_message',
              x: 300,
              y: 120,
              ins: 1,
              data: {
                agent_id: rec,
                message:
                  'Olá {{nome}}! Recepção da agência. Conte seu projeto em uma frase — anoto para o comercial.',
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
              data: { action_type: 'add_tag', tag: 'lead-agencia', _preview: 'Tag lead' },
            },
          ]);
        },
      },
      {
        name: '[Pacote] Agência — orçamento (estágio)',
        build(byKey) {
          const com = idOf(byKey, 'comercial');
          return makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 150,
              ins: 0,
              data: { trigger_type: 'stage_enter', trigger_value: 'proposal', _preview: 'Estágio Proposta' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 300,
              y: 130,
              ins: 1,
              data: {
                action_type: 'invoke_agent',
                agent_id: com,
                switch_agent: 1,
                message: 'Oi {{nome}}! Comercial aqui. Interesse: {{memoria.interesse}}\nPreparo proposta em 24h.',
                _preview: '→ Comercial',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 560,
              y: 130,
              ins: 1,
              data: {
                action_type: 'brain_mission',
                mission: 'Fechar escopo e budget. Memória briefing. Tag proposta-enviada quando enviar.',
                _preview: 'Missão proposta',
              },
            },
          ]);
        },
      },
      {
        name: '[Pacote] Agência — tag suporte',
        build(byKey) {
          const sup = idOf(byKey, 'suporte');
          return makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'suporte-tecnico', _preview: 'Tag suporte' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 300,
              y: 120,
              ins: 1,
              data: {
                action_type: 'invoke_agent',
                agent_id: sup,
                switch_agent: 1,
                message: '{{nome}}, suporte técnico. Qual campanha/site apresenta problema?',
                _preview: '→ Suporte',
              },
            },
          ]);
        },
      },
    ],

    clinica_stack: [
      {
        name: '[Pacote] Clínica — lembrete consulta',
        build(byKey) {
          const sec = idOf(byKey, 'secretaria');
          return makeGraph([
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
              x: 280,
              y: 130,
              ins: 1,
              data: { delay_minutes: 1440, _preview: '24h' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 520,
              y: 110,
              ins: 1,
              data: {
                agent_id: sec,
                message: '{{nome}}, lembrete da consulta. Confirma? (SIM / reagendar)',
                _preview: 'Secretária',
              },
            },
          ]);
        },
      },
      {
        name: '[Pacote] Clínica — triagem (tag)',
        build(byKey) {
          const sec = idOf(byKey, 'secretaria');
          return makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 150,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'triagem-clinica', _preview: 'Tag triagem' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_memory',
              x: 280,
              y: 130,
              ins: 1,
              data: { memory_key: 'sintomas', value_mode: 'session_today', _preview: 'memoria.sintomas' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 520,
              y: 130,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'triagem-registrada', _preview: 'Tag OK' },
            },
          ]);
        },
      },
      {
        name: '[Pacote] Clínica — pós-consulta',
        build(byKey) {
          const pos = idOf(byKey, 'pos');
          return makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 50,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'consulta-realizada', _preview: 'Tag pós-consulta' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 300,
              y: 120,
              ins: 1,
              data: {
                action_type: 'brain_mission',
                mission: 'Coletar NPS 0-10, memoria.nps, tag alerta se ≤6.',
                _preview: 'Missão NPS',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 560,
              y: 120,
              ins: 1,
              data: {
                agent_id: pos,
                message: '{{nome}}, como foi a consulta? Nota de 0 a 10?',
                _preview: 'Pós-consulta',
              },
              links: [{ to: 4 }],
            },
            {
              id: 4,
              class: 'flow_action',
              x: 820,
              y: 120,
              ins: 1,
              data: { action_type: 'pause_ai', agent_id: pos, minutes: 180, _preview: 'Pausa IA' },
            },
          ]);
        },
      },
    ],

    ecommerce_stack: [
      {
        name: '[Pacote] Loja — primeiro contato A/B',
        build(byKey) {
          const vend = idOf(byKey, 'vendas');
          const vendK = keyOf(byKey, 'vendas');
          return makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 160,
              ins: 0,
              data: { trigger_type: 'whatsapp_first', trigger_value: vendK, _preview: 'Primeiro contato' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_randomizer',
              x: 260,
              y: 140,
              ins: 1,
              outCount: 2,
              data: { pct_a: 50, _preview: 'A/B' },
              links: [{ to: 3, fromOut: 'output_1' }, { to: 4, fromOut: 'output_2' }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 520,
              y: 60,
              ins: 1,
              data: { agent_id: vend, message: '🔥 {{nome}}! 10% OFF com BEMVINDO10.', _preview: 'Promo A' },
            },
            {
              id: 4,
              class: 'flow_message',
              x: 520,
              y: 220,
              ins: 1,
              data: { agent_id: vend, message: '🎁 {{nome}}! Frete grátis acima de R$150.', _preview: 'Promo B' },
            },
          ]);
        },
      },
      {
        name: '[Pacote] Loja — carrinho (tag)',
        build(byKey) {
          const rec = idOf(byKey, 'recuperacao');
          return makeGraph([
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
              x: 280,
              y: 130,
              ins: 1,
              data: { delay_minutes: 60, _preview: '1h' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 520,
              y: 110,
              ins: 1,
              data: {
                agent_id: rec,
                message: '{{nome}}, carrinho reservado. Cupom VOLTA5 — finalizo com você?',
                _preview: 'Recuperação',
              },
            },
          ]);
        },
      },
      {
        name: '[Pacote] Loja — pós-compra (tag)',
        build(byKey) {
          const vend = idOf(byKey, 'vendas');
          return makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'comprou', _preview: 'Tag comprou' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_message',
              x: 300,
              y: 120,
              ins: 1,
              data: {
                agent_id: vend,
                message: '{{nome}}, obrigado pela compra! 🎉 Rastreio em breve.',
                _preview: 'Pós-compra',
              },
            },
          ]);
        },
      },
    ],

    saas_stack: [
      {
        name: '[Pacote] SaaS — primeiro contato SDR',
        build(byKey) {
          const sdr = idOf(byKey, 'sdr');
          const sdrK = keyOf(byKey, 'sdr');
          return makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 150,
              ins: 0,
              data: { trigger_type: 'whatsapp_first', trigger_value: sdrK, _preview: 'Primeira msg · SDR' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_memory',
              x: 280,
              y: 130,
              ins: 1,
              data: { memory_key: 'bant', value_mode: 'session_recent', session_limit: 8, _preview: 'memoria.bant' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 520,
              y: 130,
              ins: 1,
              data: { action_type: 'add_tag', tag: 'lead-saas', _preview: 'Tag lead' },
            },
          ]);
        },
      },
      {
        name: '[Pacote] SaaS — demo (tag)',
        build(byKey) {
          const demo = idOf(byKey, 'demo');
          return makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'demo-agendada', _preview: 'Tag demo' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 300,
              y: 120,
              ins: 1,
              data: {
                action_type: 'invoke_agent',
                agent_id: demo,
                switch_agent: 1,
                message: 'Oi {{nome}}! Demo confirmada. Contexto: {{memoria.bant}}',
                _preview: '→ Demo',
              },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_action',
              x: 560,
              y: 120,
              ins: 1,
              data: {
                action_type: 'brain_mission',
                mission: 'Calendar 20min + link Meet + tag demo-confirmada.',
                _preview: 'Missão Calendar',
              },
            },
          ]);
        },
      },
      {
        name: '[Pacote] SaaS — CS (tag)',
        build(byKey) {
          const cs = idOf(byKey, 'cs');
          return makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'suporte-urgente', _preview: 'Tag suporte' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_action',
              x: 300,
              y: 120,
              ins: 1,
              data: { action_type: 'pause_ai', agent_id: cs, minutes: 120, _preview: 'Pausa IA' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 560,
              y: 120,
              ins: 1,
              data: {
                agent_id: cs,
                message: '{{nome}}, prioridade alta.\n{{mensagens_hoje}}\nEspecialista em breve.',
                _preview: 'CS',
              },
            },
          ]);
        },
      },
    ],

    restaurante_stack: [
      {
        name: '[Pacote] Delivery — horário',
        build(byKey) {
          const del = idOf(byKey, 'delivery');
          const delK = keyOf(byKey, 'delivery');
          return makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 160,
              ins: 0,
              data: { trigger_type: 'whatsapp_message', trigger_value: delK, _preview: 'Msg delivery' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_condition',
              x: 260,
              y: 140,
              ins: 1,
              outCount: 2,
              data: { business_hours_only: 1, bh_start: '18:00', bh_end: '23:00', bh_weekdays: '1,2,3,4,5,6,7', _preview: '18h–23h' },
              links: [{ to: 3, fromOut: 'output_1' }, { to: 4, fromOut: 'output_2' }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 520,
              y: 60,
              ins: 1,
              data: { agent_id: del, message: 'Olá {{nome}}! Abertos 🍕 O que pede?', _preview: 'Aberto' },
            },
            {
              id: 4,
              class: 'flow_message',
              x: 520,
              y: 240,
              ins: 1,
              data: {
                agent_id: del,
                message: 'Fechados (18h–23h). Deixe o pedido — priorizamos na abertura.',
                _preview: 'Fechado',
              },
            },
          ]);
        },
      },
      {
        name: '[Pacote] Delivery — pedido (tag)',
        build(byKey) {
          const del = idOf(byKey, 'delivery');
          return makeGraph([
            {
              id: 1,
              class: 'flow_trigger',
              x: 40,
              y: 140,
              ins: 0,
              data: { trigger_type: 'tag_added', trigger_value: 'pedido-confirmado', _preview: 'Tag pedido' },
              links: [{ to: 2 }],
            },
            {
              id: 2,
              class: 'flow_memory',
              x: 280,
              y: 120,
              ins: 1,
              data: { memory_key: 'pedido', value_mode: 'session_today', _preview: 'memoria.pedido' },
              links: [{ to: 3 }],
            },
            {
              id: 3,
              class: 'flow_message',
              x: 520,
              y: 120,
              ins: 1,
              data: {
                agent_id: del,
                message: 'Pedido ✅\n{{memoria.pedido}}\n40–50 min. Obrigado {{nome}}!',
                _preview: 'Confirmação',
              },
            },
          ]);
        },
      },
    ],
  };
})();
