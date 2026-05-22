/**
 * Editor visual de automações (Drawflow)
 */
(function () {
  const B = window.FLOW_BOOT || {};
  const API = B.api || 'backend/api.php';
  const CSRF = B.csrf || '';

  function flowStages() {
    const pid = getFlowPipelineId();
    if (B.stagesByPipeline && pid && B.stagesByPipeline[pid]) {
      return B.stagesByPipeline[pid];
    }
    return B.stages || {};
  }

  function getFlowPipelineId() {
    const sel = document.getElementById('flow-pipeline');
    if (sel && sel.value) {
      return parseInt(sel.value, 10) || B.defaultPipelineId || 0;
    }
    return B.automationPipelineId || B.defaultPipelineId || 0;
  }

  function pipelineNameById(pid) {
    const list = B.pipelines || [];
    const p = list.find((x) => parseInt(x.id, 10) === parseInt(pid, 10));
    return p ? p.name : 'Funil';
  }

  function syncFlowPipelineToBoot() {
    const pid = getFlowPipelineId();
    B.automationPipelineId = pid;
    B.stages = flowStages();
    const autoSel = document.getElementById('auto-pipeline');
    if (autoSel) autoSel.value = String(pid);
    if (typeof window.fillAutomationStageSelects === 'function') {
      window.fillAutomationStageSelects();
    }
    if (typeof loadFlowList === 'function') loadFlowList();
  }

  function initFlowPipelineSelect() {
    const sel = document.getElementById('flow-pipeline');
    if (!sel || !B.pipelines) return;
    sel.innerHTML = B.pipelines
      .map((p) => `<option value="${p.id}">${esc(p.name)}</option>`)
      .join('');
    const pid = B.automationPipelineId || B.defaultPipelineId || B.pipelines[0]?.id || 0;
    sel.value = String(pid);
    sel.addEventListener('change', () => {
      syncFlowPipelineToBoot();
      if (selectedNodeId) {
        const node = editor?.drawflow?.drawflow?.Home?.data?.[selectedNodeId];
        if (node) renderPropsPanel(node);
      }
    });
  }

  window.onFlowPipelineChange = syncFlowPipelineToBoot;

  const TRIGGER_LABELS = {
    whatsapp_first: 'Primeira mensagem WhatsApp',
    whatsapp_message: 'Mensagem WhatsApp (Evolution)',
    stage_enter: 'Lead entra no estágio',
    tag_added: 'Tag adicionada',
    contact_created: 'Lead criado',
    webhook_received: 'Webhook / integração',
    ltv_inactive: 'LTV — inativo',
  };

  const TRIGGER_OPTIONS = [
    {
      group: 'WhatsApp & Evolution',
      items: [
        { value: 'whatsapp_first', icon: 'ph-whatsapp-logo', color: '#059669', label: 'Primeira mensagem WhatsApp', hint: 'Webhook Evolution — lead novo' },
        { value: 'whatsapp_message', icon: 'ph-chats-circle', color: '#0d9488', label: 'Qualquer mensagem recebida', hint: 'Cada mensagem no WhatsApp' },
      ],
    },
    {
      group: 'CRM & funil',
      items: [
        { value: 'stage_enter', icon: 'ph-columns', color: '#4338ca', label: 'Entrada em estágio', hint: 'Kanban / pipeline' },
        { value: 'tag_added', icon: 'ph-tag', color: '#b45309', label: 'Tag adicionada', hint: 'Quando ganha uma tag' },
        { value: 'contact_created', icon: 'ph-user-plus', color: '#0369a1', label: 'Lead criado', hint: 'Manual, webhook ou WhatsApp' },
      ],
    },
    {
      group: 'Integrações & LTV',
      items: [
        { value: 'webhook_received', icon: 'ph-plugs-connected', color: '#7c3aed', label: 'Webhook de entrada', hint: 'Hotmart, formulário, etc.' },
        { value: 'ltv_inactive', icon: 'ph-chart-line-down', color: '#ca8a04', label: 'LTV — cliente inativo', hint: 'Ciclo de compra' },
      ],
    },
  ];

  const ACTION_LABELS = {
    send_whatsapp: 'Enviar WhatsApp',
    assign_agent: 'Atribuir agente',
    move_stage: 'Mover estágio',
    add_tag: 'Adicionar tag',
    remove_tag: 'Remover tag',
    pause_ai: 'Pausar IA',
    resume_ai: 'Retomar IA',
    invoke_agent: 'Acionar outro agente',
    call_webhook: 'Webhook outbound',
    set_memory: 'Memória IA',
    google_sheets_append: 'Google Sheets',
    http_preset: 'HTTP preset',
    brain_mission: 'Missão para o cérebro',
    clear_brain_mission: 'Limpar missão IA',
  };

  const MESSAGE_VARS = [
    { key: 'nome', label: 'Nome' },
    { key: 'telefone', label: 'Telefone' },
    { key: 'email', label: 'E-mail' },
    { key: 'empresa', label: 'Empresa' },
    { key: 'estagio', label: 'Estágio' },
    { key: 'agente', label: 'Agente' },
    { key: 'mensagem', label: 'Msg gatilho' },
    { key: 'mensagens_hoje', label: 'Msgs hoje' },
    { key: 'sessao', label: 'Sessão (8)' },
    { key: 'ultima_sessao', label: 'Última sessão' },
    { key: 'tags', label: 'Tags' },
    { key: 'memoria.origem', label: 'Memória' },
  ];

  const ACTION_ICON = {
    send_whatsapp: { icon: 'ph-whatsapp-logo', color: '#059669' },
    assign_agent: { icon: 'ph-user-switch', color: '#0369a1' },
    invoke_agent: { icon: 'ph-robot', color: '#7c3aed' },
    move_stage: { icon: 'ph-columns', color: '#4338ca' },
    add_tag: { icon: 'ph-tag', color: '#b45309' },
    remove_tag: { icon: 'ph-tag-simple', color: '#94a3b8' },
    pause_ai: { icon: 'ph-pause-circle', color: '#ca8a04' },
    resume_ai: { icon: 'ph-play-circle', color: '#047857' },
    call_webhook: { icon: 'ph-plugs-connected', color: '#7c3aed' },
    set_memory: { icon: 'ph-brain', color: '#6d28d9' },
    google_sheets_append: { icon: 'ph-table', color: '#15803d' },
    http_preset: { icon: 'ph-globe', color: '#0f766e' },
    brain_mission: { icon: 'ph-brain', color: '#6d28d9' },
    clear_brain_mission: { icon: 'ph-check-circle', color: '#6d28d9' },
  };

  const ACTION_OPTIONS = Object.keys(ACTION_LABELS).map((k) => {
    const meta = ACTION_ICON[k] || { icon: 'ph-lightning', color: '#047857' };
    return { value: k, label: ACTION_LABELS[k] || k, icon: meta.icon, color: meta.color, hint: k === 'send_whatsapp' ? 'Texto + variáveis' : '' };
  });

  const ACTION_OPTIONS_GROUPED = [
    { group: 'WhatsApp & agentes', items: ACTION_OPTIONS.filter((o) => ['send_whatsapp', 'assign_agent', 'invoke_agent', 'pause_ai', 'resume_ai'].includes(o.value)) },
    { group: 'CRM & cérebro', items: ACTION_OPTIONS.filter((o) => ['move_stage', 'add_tag', 'remove_tag', 'set_memory', 'brain_mission', 'clear_brain_mission'].includes(o.value)) },
    { group: 'Integrações', items: ACTION_OPTIONS.filter((o) => ['call_webhook', 'http_preset', 'google_sheets_append'].includes(o.value)) },
  ];

  let editor = null;
  let currentFlowId = 0;
  let selectedNodeId = null;
  let inboundWebhooks = [];
  let outboundWebhooks = [];
  let httpPresets = [];

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function nodeHtml(type, title, sub, body, stats) {
    const cls = {
      flow_trigger: 'fn-trigger',
      flow_condition: 'fn-cond',
      flow_randomizer: 'fn-rand',
      flow_delay: 'fn-wait',
      flow_action: 'fn-action',
      flow_message: 'fn-msg',
      flow_memory: 'fn-memory',
    }[type] || 'fn-action';
    const icon = {
      flow_trigger: 'ph-play-circle',
      flow_condition: 'ph-funnel',
      flow_randomizer: 'ph-shuffle',
      flow_delay: 'ph-clock',
      flow_action: 'ph-lightning',
      flow_message: 'ph-whatsapp-logo',
      flow_memory: 'ph-brain',
    }[type] || 'ph-circle';
    const st = stats || { in: 0, ok: 0, err: 0 };
    return `
      <div class="fn-node ${cls}">
        <div class="fn-head">
          <div class="fn-icon"><i class="ph-bold ${icon}"></i></div>
          <div>
            <div class="fn-title">${esc(title)}</div>
            <div class="fn-sub">${esc(sub)}</div>
          </div>
        </div>
        <div class="fn-body">${body}</div>
        <div class="fn-stats">
          <div class="fn-stat"><span>Entraram</span><em>${st.in}</em></div>
          <div class="fn-stat"><span>Sucesso</span><em>${st.ok}</em></div>
          <div class="fn-stat"><span>Erro</span><em>${st.err}</em></div>
        </div>
      </div>`;
  }

  function defaultNodeData(type) {
    switch (type) {
      case 'flow_trigger':
        return {
          trigger_type: 'whatsapp_first',
          trigger_value: (B.whatsappConnections && B.whatsappConnections[0]) ? String(B.whatsappConnections[0].id) : '*',
          label: 'Primeira mensagem WhatsApp',
        };
      case 'flow_condition':
        return {
          require_tag: '',
          exclude_tag: '',
          stage_is: '',
          stage_not: '',
          agent_id: 0,
          agent_unassigned: 0,
          keyword_contains: '',
          keyword_not_contains: '',
          require_email: 0,
          require_phone: 0,
          business_hours_only: 0,
          outside_business_hours: 0,
          bh_start: '08:00',
          bh_end: '18:00',
          bh_weekdays: '1,2,3,4,5',
          ab_chance: 100,
          label: 'Condição',
        };
      case 'flow_memory':
        return {
          memory_key: 'resposta',
          value_mode: 'session_today',
          session_limit: 8,
          value: '',
          label: 'Gravar memória',
        };
      case 'flow_randomizer':
        return { pct_a: 50, label_a: 'Ramificação A', label_b: 'Ramificação B' };
      case 'flow_delay':
        return { delay_minutes: 5, label: 'Espera' };
      case 'flow_message':
        return {
          connection_id: (B.whatsappConnections && B.whatsappConnections[0]) ? B.whatsappConnections[0].id : 0,
          agent_id: (B.agents && B.agents[0]) ? B.agents[0].id : 0,
          message: 'Olá {{nome}}!',
          label: 'Mensagem WhatsApp',
        };
      case 'flow_action':
        return { action_type: 'assign_agent', agent_id: (B.agents && B.agents[0]) ? B.agents[0].id : 0, label: 'Ação' };
      default:
        return {};
    }
  }

  function summarizeNode(type, data) {
    data = data || {};
    if (type === 'flow_trigger') {
      const t = TRIGGER_LABELS[data.trigger_type] || data.trigger_type;
      let v = data.trigger_value || '*';
      const stg = flowStages();
      if (data.trigger_type === 'stage_enter' && stg[v]) v = stg[v];
      else if ((data.trigger_type === 'whatsapp_first' || data.trigger_type === 'whatsapp_message') && v !== '*') {
        const cn = (B.whatsappConnections || []).find((c) => String(c.id) === String(v));
        v = cn ? cn.name : 'Conexão #' + v;
      } else if (data.trigger_type === 'contact_created' && v === 'whatsapp') v = 'Origem WhatsApp';
      return { title: 'Início', sub: 'Gatilho', body: `<strong>${esc(t)}</strong><br>${esc(v)}` };
    }
    if (type === 'flow_condition') {
      const parts = [];
      if (data.require_tag) parts.push('Tag «' + data.require_tag + '»');
      if (data.exclude_tag) parts.push('Sem «' + data.exclude_tag + '»');
      const stg = flowStages();
      if (data.stage_is) parts.push('Estágio: ' + (stg[data.stage_is] || data.stage_is));
      if (data.stage_not) parts.push('≠ ' + data.stage_not);
      if (data.agent_id) {
        const ag = (B.agents || []).find((a) => String(a.id) === String(data.agent_id));
        parts.push('Agente: ' + (ag ? ag.name : '#' + data.agent_id));
      }
      if (data.agent_unassigned) parts.push('Sem agente');
      if (data.keyword_contains) parts.push('Contém «' + data.keyword_contains + '»');
      if (data.keyword_not_contains) parts.push('Não «' + data.keyword_not_contains + '»');
      if (data.require_email) parts.push('Com e-mail');
      if (data.require_phone) parts.push('Com telefone');
      if (data.business_hours_only) parts.push('Em horário (' + (data.bh_start || '08:00') + '–' + (data.bh_end || '18:00') + ')');
      if (data.outside_business_hours) parts.push('Fora do horário');
      if (data.ab_chance && data.ab_chance < 100) parts.push('A/B ' + data.ab_chance + '%');
      return {
        title: 'Condição',
        sub: 'Filtro',
        body: parts.length ? esc(parts.join(' · ')) : 'Sempre (sem filtros)',
      };
    }
    if (type === 'flow_randomizer') {
      return {
        title: 'Randomizador',
        sub: 'A/B teste',
        body: `<strong>A</strong> ${data.pct_a || 50}% · <strong>B</strong> ${100 - (data.pct_a || 50)}%`,
      };
    }
    if (type === 'flow_delay') {
      return {
        title: 'Espera',
        sub: 'Atraso',
        body: `Aguardar <strong>${data.delay_minutes || 5} min</strong> antes de continuar`,
      };
    }
    if (type === 'flow_message') {
      const conn = (B.whatsappConnections || []).find((c) => String(c.id) === String(data.connection_id));
      const ag = (B.agents || []).find((a) => String(a.id) === String(data.agent_id));
      const msg = (data.message || '').slice(0, 60);
      const via = conn ? conn.name : (ag ? ag.name : 'WhatsApp');
      return {
        title: 'Mensagem',
        sub: via + (ag && conn ? ' · ' + ag.name : ''),
        body: msg ? esc(msg) + (data.message.length > 60 ? '…' : '') : '<em>Configure a mensagem</em>',
      };
    }
    if (type === 'flow_action') {
      const al = ACTION_LABELS[data.action_type] || data.action_type;
      return { title: 'Ação', sub: al, body: esc(data.label || al) };
    }
    if (type === 'flow_memory') {
      const modes = {
        last_message: 'msg do gatilho',
        session_last: 'última da sessão',
        session_today: 'mensagens de hoje',
        session_recent: 'últimas ' + (data.session_limit || 8) + ' da sessão',
        fixed: 'valor fixo',
        template: 'template',
      };
      return {
        title: 'Memória IA',
        sub: data.memory_key || 'chave',
        body: `<strong>${esc(modes[data.value_mode] || data.value_mode)}</strong> → {{memoria.${esc(data.memory_key || 'chave')}}}`,
      };
    }
    return { title: 'Nó', sub: '', body: '' };
  }

  function refreshNodeVisual(nodeId) {
    if (!editor || nodeId == null) return;
    const node = editor.getNodeFromId(nodeId);
    if (!node) return;
    const sum = summarizeNode(node.class, node.data);
    const el = document.querySelector(`#node-${nodeId} .fn-node`);
    if (!el) return;
    const wrap = el.parentElement;
    if (!wrap) return;
    const stats = node.data._stats || { in: 0, ok: 0, err: 0 };
    const tmp = document.createElement('div');
    tmp.innerHTML = nodeHtml(node.class, sum.title, sum.sub, sum.body, stats);
    const newInner = tmp.firstElementChild;
    if (newInner && el.parentNode) {
      el.replaceWith(newInner);
    }
  }

  function initEditor() {
    const el = document.getElementById('drawflow');
    if (!el || typeof Drawflow === 'undefined') return;
    editor = new Drawflow(el);
    editor.reroute = true;
    editor.reroute_fix_curvature = true;
    editor.curvature = 0.4;
    editor.start();

    editor.on('nodeSelected', (id) => {
      selectedNodeId = id;
      renderPropsPanel(id);
      document.getElementById('flow-props')?.classList.add('flow-props--open');
    });
    editor.on('nodeUnselected', () => {
      selectedNodeId = null;
      renderPropsPanel(null);
    });
    editor.on('nodeCreated', (id) => refreshNodeVisual(id));
    editor.on('nodeDataChanged', (id) => refreshNodeVisual(id));

    if (window.innerWidth > 1200) {
      document.getElementById('btn-props-mobile')?.addEventListener('click', () => {
        document.getElementById('flow-props')?.classList.toggle('flow-props--open');
      });
    }
  }

  function addNode(type, x, y) {
    if (!editor) return;
    const data = defaultNodeData(type);
    const sum = summarizeNode(type, data);
    const html = nodeHtml(type, sum.title, sum.sub, sum.body);
    let inputs = 1;
    let outputs = 1;
    if (type === 'flow_trigger') {
      inputs = 0;
      outputs = 1;
    } else if (type === 'flow_condition' || type === 'flow_randomizer') {
      outputs = 2;
    }
    const id = editor.addNode(type, inputs, outputs, x || 80 + Math.random() * 80, y || 80 + Math.random() * 80, type, data, html);
    return id;
  }

  function defaultFlowExport() {
    const id1 = 1;
    const trigData = defaultNodeData('flow_trigger');
    const sum = summarizeNode('flow_trigger', trigData);
    const html = nodeHtml('flow_trigger', sum.title, sum.sub, sum.body);
    return {
      drawflow: {
        Home: {
          data: {
            [id1]: {
              id: id1,
              name: 'flow_trigger',
              data: trigData,
              class: 'flow_trigger',
              html,
              typenode: false,
              inputs: {},
              outputs: {
                output_1: { connections: [] },
              },
              pos_x: 80,
              pos_y: 120,
            },
          },
        },
      },
    };
  }

  function stageOptions(sel) {
    const stages = flowStages();
    return Object.keys(stages)
      .map((k) => `<option value="${esc(k)}" ${sel === k ? 'selected' : ''}>${esc(stages[k])}</option>`)
      .join('');
  }

  function agentOptions(sel, includeEmpty) {
    let h = includeEmpty ? '<option value="0">— Lead sem filtro de agente —</option>' : '';
    h += (B.agents || [])
      .map((a) => `<option value="${a.id}" ${String(sel) === String(a.id) ? 'selected' : ''}>${esc(a.name)}</option>`)
      .join('');
    return h;
  }

  function varChipsHtml(targetId) {
    return `<div class="msg-var-chips" data-target="${esc(targetId)}">${MESSAGE_VARS.map((v) =>
      `<button type="button" class="msg-var-chip" data-var="${esc(v.key)}" title="${esc(v.label)}">${esc(v.label)}</button>`
    ).join('')}</div>`;
  }

  function bindVarChips(container) {
    container?.querySelectorAll('.msg-var-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.closest('.msg-var-chips')?.getAttribute('data-target');
        const ta = targetId ? document.getElementById(targetId) : null;
        if (!ta) return;
        let insert = btn.getAttribute('data-var') || '';
        if (insert === 'campo.') insert = '{{campo.slug}}';
        else insert = '{{' + insert + '}}';
        const start = ta.selectionStart ?? ta.value.length;
        const end = ta.selectionEnd ?? start;
        ta.value = ta.value.slice(0, start) + insert + ta.value.slice(end);
        ta.focus();
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  function previewMessageClient(text) {
    const sample = B.sampleContact || { name: 'Maria Silva', phone: '11999998888', email: 'maria@email.com', company: 'Acme', stage: 'new' };
    let out = text || '';
    const map = {
      nome: sample.name,
      telefone: sample.phone,
      email: sample.email,
      empresa: sample.company,
      estagio: flowStages()[sample.stage] || sample.stage,
      agente: (B.agents && B.agents[0]) ? B.agents[0].name : 'Agente',
      mensagem: 'Quero saber o preço',
      tags: 'lead, quente',
    };
    Object.keys(map).forEach((k) => {
      out = out.split('{{' + k + '}}').join(map[k]);
    });
    return out;
  }

  function agentPickerOptions(includeAny) {
    const items = [];
    if (includeAny !== false) {
      items.push({ value: '*', label: 'Qualquer agente', hint: 'Todos os cérebros IA', icon: 'ph-globe', color: '#64748b' });
    }
    (B.agents || []).forEach((a) => {
      const name = (a.name && String(a.name).trim()) ? String(a.name) : 'Agente #' + a.id;
      items.push({ value: String(a.id), label: name, hint: 'Cérebro IA', icon: 'ph-brain', color: '#4338ca' });
    });
    if (!items.length || (items.length === 1 && includeAny !== false)) {
      items.push({ value: '0', label: 'Nenhum agente cadastrado', hint: 'Crie em Agentes', icon: 'ph-warning', color: '#b45309' });
    }
    return items;
  }

  function connectionPickerOptions(includeAny) {
    const items = [];
    if (includeAny !== false) {
      items.push({ value: '*', label: 'Qualquer conexão', hint: 'Todas as linhas WhatsApp', icon: 'ph-globe', color: '#64748b' });
    }
    (B.whatsappConnections || []).forEach((c) => {
      const name = (c.name && String(c.name).trim()) ? String(c.name) : 'Conexão #' + c.id;
      let hint = 'Linha WhatsApp';
      if (c.status === 'online') hint = 'Conectado';
      else if (c.status === 'waiting_qr') hint = 'Aguardando QR Code';
      else hint = 'Desconectado';
      items.push({ value: String(c.id), label: name, hint, icon: 'ph-whatsapp-logo', color: '#059669' });
    });
    if (!items.length || (items.length === 1 && includeAny !== false)) {
      items.push({ value: '0', label: 'Nenhuma conexão cadastrada', hint: 'Aba Conexões WhatsApp', icon: 'ph-warning', color: '#b45309' });
    }
    return items;
  }

  function mountConnectionPickerEl(containerId, value, onChange, includeAny) {
    const opts = connectionPickerOptions(includeAny);
    const def = (B.whatsappConnections && B.whatsappConnections[0]) ? String(B.whatsappConnections[0].id) : '*';
    const v = value !== undefined && value !== null && value !== '' ? String(value) : def;
    return mountAuvPicker(containerId, [{ items: opts }], v, onChange);
  }

  function agentPickerOptionsForLead() {
    const items = [{ value: '0', label: 'Qualquer agente do lead', hint: 'Não filtra por agente', icon: 'ph-user', color: '#64748b' }];
    (B.agents || []).forEach((a) => {
      const name = (a.name && String(a.name).trim()) ? String(a.name) : 'Agente #' + a.id;
      items.push({ value: String(a.id), label: name, hint: 'Filtrar leads deste agente', icon: 'ph-whatsapp-logo', color: '#059669' });
    });
    return items;
  }

  function agentPickerOptionsAssign() {
    const items = [];
    (B.agents || []).forEach((a) => {
      const name = (a.name && String(a.name).trim()) ? String(a.name) : 'Agente #' + a.id;
      items.push({ value: String(a.id), label: name, hint: 'Cérebro IA', icon: 'ph-brain', color: '#4338ca' });
    });
    if (!items.length) {
      items.push({ value: '0', label: 'Cadastre um agente', hint: 'Menu Agentes', icon: 'ph-warning', color: '#b45309' });
    }
    return items;
  }

  function mountAgentPickerEl(containerId, value, onChange, mode) {
    let opts;
    let def = '*';
    if (mode === 'lead') {
      opts = agentPickerOptionsForLead();
      def = '0';
    } else if (mode === 'assign') {
      opts = agentPickerOptionsAssign();
      def = String((B.agents && B.agents[0]) ? B.agents[0].id : '0');
    } else {
      opts = agentPickerOptions(true);
    }
    const v = value !== undefined && value !== null && value !== '' ? String(value) : def;
    return mountAuvPicker(containerId, [{ items: opts }], v, onChange);
  }

  function propsField(label, inner, hint) {
    return `<div class="props-field">
      <label class="props-field-label">${label}</label>
      <div class="props-field-control">${inner}</div>
      ${hint ? `<p class="props-field-hint">${hint}</p>` : ''}
    </div>`;
  }

  function propsDetails(title, icon, body, open) {
    return `<details class="props-details"${open ? ' open' : ''}>
      <summary><i class="ph-bold ${icon}"></i> ${title}</summary>
      <div class="props-details-body">${body}</div>
    </details>`;
  }

  function flattenPickerOptions(options) {
    const flat = [];
    (options || []).forEach((entry) => {
      if (!entry) return;
      if (Array.isArray(entry.items)) {
        if (entry.group) flat.push({ group: entry.group });
        entry.items.forEach((it) => {
          if (it && it.value !== undefined && it.label) flat.push(it);
        });
      } else if (entry.group && entry.value === undefined) {
        flat.push({ group: entry.group });
      } else if (entry.value !== undefined && entry.label) {
        flat.push(entry);
      }
    });
    return flat;
  }

  function mountAuvPicker(containerId, options, value, onChange) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return null;
    let flat = flattenPickerOptions(options);
    if (!flat.length) {
      wrap.innerHTML = '<p class="props-empty-opt">Nenhuma opção disponível.</p>';
      return { getValue: () => value, setValue: () => {} };
    }
    const find = () => flat.find((x) => !x.group && String(x.value) === String(value));
    let current = find() || flat.find((x) => !x.group) || null;

    function render() {
      current = find() || flat.find((x) => !x.group) || null;
      const label = current?.label || 'Selecione uma opção';
      const hint = current?.hint || '';
      const icon = current?.icon || 'ph-list';
      const color = current?.color || '#64748b';
      wrap.innerHTML = `
        <button type="button" class="auv-picker-trigger" aria-haspopup="listbox">
          <span class="auv-picker-icon" style="background:${color}18;color:${color}">
            <i class="ph-bold ${icon}"></i>
          </span>
          <span class="auv-picker-text">
            <span class="auv-picker-label">${esc(label)}</span>
            ${hint ? `<span class="auv-picker-hint">${esc(hint)}</span>` : ''}
          </span>
          <i class="ph-bold ph-caret-down auv-picker-caret"></i>
        </button>
        <div class="auv-picker-menu" role="listbox" hidden>
          ${flat
            .map((it) => {
              if (it.group) return `<div class="auv-picker-group">${esc(it.group)}</div>`;
              if (it.value === undefined || !it.label) return '';
              const sel = String(it.value) === String(value) ? ' is-selected' : '';
              return `<button type="button" class="auv-picker-option${sel}" data-value="${esc(String(it.value))}" role="option">
                <span class="auv-picker-icon" style="background:${it.color || '#e2e8f0'}18;color:${it.color || '#64748b'}"><i class="ph-bold ${it.icon || 'ph-circle'}"></i></span>
                <span class="auv-picker-text"><span class="auv-picker-label">${esc(it.label)}</span>${it.hint ? `<span class="auv-picker-hint">${esc(it.hint)}</span>` : ''}</span>
              </button>`;
            })
            .join('')}
        </div>`;
      const trigger = wrap.querySelector('.auv-picker-trigger');
      const menu = wrap.querySelector('.auv-picker-menu');
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !menu.hidden;
        document.querySelectorAll('.auv-picker-menu').forEach((m) => { m.hidden = true; });
        document.querySelectorAll('.auv-picker').forEach((p) => p.classList.remove('is-open'));
        if (!open) {
          menu.hidden = false;
          wrap.classList.add('is-open');
        }
      });
      wrap.querySelectorAll('.auv-picker-option').forEach((btn) => {
        btn.addEventListener('click', () => {
          value = btn.getAttribute('data-value');
          menu.hidden = true;
          wrap.classList.remove('is-open');
          render();
          onChange(value);
        });
      });
    }
    render();
    if (!window._auvPickerDocClose) {
      window._auvPickerDocClose = true;
      document.addEventListener('click', () => {
        document.querySelectorAll('.auv-picker-menu').forEach((m) => { m.hidden = true; });
        document.querySelectorAll('.auv-picker').forEach((p) => p.classList.remove('is-open'));
      });
    }
    return {
      getValue: () => value,
      setValue: (v) => { value = v; render(); },
    };
  }

  let triggerTypePicker = null;
  let triggerConnectionPicker = null;
  let actionTypePicker = null;
  let msgConnectionPicker = null;
  let msgAgentPicker = null;
  let condAgentPicker = null;
  let actionAgentPicker = null;
  let actionConnectionPicker = null;

  function renderPropsPanel(nodeId) {
    const body = document.getElementById('flow-props-body');
    if (!body) return;
    if (!nodeId || !editor) {
      body.innerHTML =
        '<p class="flow-props-empty">Clique em um nó do fluxo para editar gatilho, condição, ação ou mensagem. Arraste do ponto azul (sucesso) ou vermelho (não atende).</p>';
      return;
    }
    const node = editor.getNodeFromId(nodeId);
    if (!node) return;
    const d = node.data || {};
    const type = node.class;
    let html = `<p class="text-muted" style="font-size:.75rem;margin-bottom:12px">Nó #${nodeId} · ${esc(type.replace('flow_', ''))}</p>`;

    if (type === 'flow_trigger') {
      const pipeLabel = esc(pipelineNameById(getFlowPipelineId()));
      html += `
        <div class="props-callout props-callout-info">Funil: <strong>${pipeLabel}</strong> — só dispara para leads neste pipeline. Estágios do gatilho usam as colunas desse funil.</div>
        <div class="props-callout props-callout-info">Saída única: conecte ao próximo nó após o gatilho.</div>
        ${propsField('Tipo de gatilho', '<div class="auv-picker" id="picker-trigger-type"></div>')}
        <div id="wrap-trigger-agent" style="${['whatsapp_first','whatsapp_message'].includes(d.trigger_type) ? '' : 'display:none'}">
          ${propsField('Conexão WhatsApp', '<div class="auv-picker" id="picker-trigger-agent"></div>', 'Qual número Evolution dispara este fluxo')}
        </div>
        <div id="p-trigger-value-wrap" class="props-field">
          <label class="props-field-label" id="p-trigger-value-label">Detalhe do gatilho</label>
          <div class="props-field-control">
            <select class="auv-input auv-native-select" id="p-trigger-stage" style="${d.trigger_type === 'stage_enter' ? '' : 'display:none'}">${stageOptions(d.trigger_value)}</select>
            <input class="auv-input" id="p-trigger-tag" style="${d.trigger_type === 'tag_added' ? '' : 'display:none'}" value="${esc(d.trigger_value || '')}" placeholder="nome-da-tag">
            <select class="auv-input auv-native-select" id="p-trigger-webhook" style="${d.trigger_type === 'webhook_received' ? '' : 'display:none'}">
              ${inboundWebhooks.length ? inboundWebhooks.map((w) => `<option value="${esc(w.url_slug)}" ${d.trigger_value === w.url_slug ? 'selected' : ''}>${esc(w.name)}</option>`).join('') : '<option value="">Nenhum webhook</option>'}
            </select>
            <select class="auv-input auv-native-select" id="p-trigger-source" style="${d.trigger_type === 'contact_created' ? '' : 'display:none'}">
              <option value="*" ${d.trigger_value === '*' ? 'selected' : ''}>Qualquer origem</option>
              <option value="whatsapp" ${d.trigger_value === 'whatsapp' ? 'selected' : ''}>WhatsApp</option>
              <option value="webhook" ${d.trigger_value === 'webhook' ? 'selected' : ''}>Webhook</option>
              <option value="manual" ${d.trigger_value === 'manual' ? 'selected' : ''}>Manual</option>
            </select>
          </div>
          <p class="props-field-hint" id="p-trigger-hint"></p>
        </div>`;
    } else if (type === 'flow_condition') {
      const tagsBlock = `
        ${propsField('Exigir tag', '<input class="auv-input" id="p-require-tag" value="' + esc(d.require_tag || '') + '" placeholder="ex: vip, cliente">')}
        ${propsField('Excluir tag', '<input class="auv-input" id="p-exclude-tag" value="' + esc(d.exclude_tag || '') + '" placeholder="ex: atendido">')}`;
      const funnelBlock = `
        ${propsField('Estágio deve ser', '<select class="auv-input auv-native-select" id="p-stage-is"><option value="">— Qualquer —</option>' + stageOptions(d.stage_is || '') + '</select>')}
        ${propsField('Estágio não pode ser', '<select class="auv-input auv-native-select" id="p-stage-not"><option value="">— Ignorar —</option>' + stageOptions(d.stage_not || '') + '</select>')}
        ${propsField('Agente do lead', '<div class="auv-picker" id="picker-cond-agent"></div>')}
        <label class="props-check"><input type="checkbox" id="p-agent-unassigned" ${d.agent_unassigned ? 'checked' : ''}> Apenas lead sem agente</label>`;
      const msgBlock = `
        ${propsField('Mensagem contém', '<input class="auv-input" id="p-kw-contains" value="' + esc(d.keyword_contains || '') + '" placeholder="preço, orçamento, valor">', 'Separe por vírgula (OR)')}
        ${propsField('Mensagem não contém', '<input class="auv-input" id="p-kw-not" value="' + esc(d.keyword_not_contains || '') + '">')}
        <label class="props-check"><input type="checkbox" id="p-req-email" ${d.require_email ? 'checked' : ''}> Exigir e-mail</label>
        <label class="props-check"><input type="checkbox" id="p-req-phone" ${d.require_phone ? 'checked' : ''}> Exigir telefone</label>`;
      const hoursBlock = `
        <label class="props-check"><input type="checkbox" id="p-bh-only" ${d.business_hours_only ? 'checked' : ''}> Só em horário comercial</label>
        <label class="props-check"><input type="checkbox" id="p-bh-out" ${d.outside_business_hours ? 'checked' : ''}> Só fora do horário</label>
        <div class="props-row-2">
          ${propsField('Início', '<input type="time" class="auv-input" id="p-bh-start" value="' + esc((d.bh_start || '08:00').slice(0, 5)) + '">')}
          ${propsField('Fim', '<input type="time" class="auv-input" id="p-bh-end" value="' + esc((d.bh_end || '18:00').slice(0, 5)) + '">')}
        </div>
        ${propsField('Dias úteis', '<input class="auv-input" id="p-bh-days" value="' + esc(d.bh_weekdays || '1,2,3,4,5') + '" placeholder="1=seg … 7=dom">')}`;
      html += `
        <div class="props-callout">Filtros em <strong>E</strong> (todos obrigatórios se preenchidos). <span class="props-legend"><i class="dot dot-ok"></i> azul = sim</span> <span class="props-legend"><i class="dot dot-no"></i> vermelho = não</span></div>
        ${propsDetails('Tags', 'ph-tag', tagsBlock, true)}
        ${propsDetails('Funil e agente', 'ph-columns', funnelBlock, true)}
        ${propsDetails('Mensagem WhatsApp', 'ph-chats-circle', msgBlock, true)}
        ${propsDetails('Horário comercial', 'ph-clock', hoursBlock, false)}
        ${propsField('Teste A/B (%)', '<input type="number" class="auv-input" id="p-ab" min="1" max="100" value="' + (d.ab_chance ?? 100) + '">', '100 = sempre passa no ramo azul')}`;
    } else if (type === 'flow_memory') {
      const showLimit = d.value_mode === 'session_recent';
      html += `
        ${propsField('Chave da memória', '<input class="auv-input" id="p-mem-key" value="' + esc(d.memory_key || '') + '" placeholder="interesse, cidade, orcamento">', 'Use em mensagens: {{memoria.chave}}')}
        ${propsField('Origem do valor', `<select class="auv-input auv-native-select" id="p-mem-mode">
            <option value="session_today" ${d.value_mode === 'session_today' || !d.value_mode ? 'selected' : ''}>Mensagens de hoje (sessão WhatsApp)</option>
            <option value="session_recent" ${d.value_mode === 'session_recent' ? 'selected' : ''}>Últimas N mensagens da sessão</option>
            <option value="session_last" ${d.value_mode === 'session_last' ? 'selected' : ''}>Última mensagem da sessão</option>
            <option value="last_message" ${d.value_mode === 'last_message' ? 'selected' : ''}>Só mensagem do gatilho atual</option>
            <option value="fixed" ${d.value_mode === 'fixed' ? 'selected' : ''}>Texto fixo</option>
            <option value="template" ${d.value_mode === 'template' ? 'selected' : ''}>Template com variáveis</option>
          </select>`, 'Lê conversation_logs — histórico real do chat')}
        <div id="wrap-mem-limit" class="props-field" style="${showLimit ? '' : 'display:none'}">
          <label class="props-field-label">Quantidade (N)</label>
          <div class="props-field-control">
            <input type="number" class="auv-input" id="p-mem-limit" min="1" max="20" value="${d.session_limit ?? 8}">
          </div>
          <p class="props-field-hint">Máx. 20 mensagens recebidas do lead</p>
        </div>
        <div id="wrap-mem-value" style="${['fixed', 'template'].includes(d.value_mode) ? '' : 'display:none'}">
        ${propsField('Valor / template', varChipsHtml('p-mem-value') + '<textarea class="auv-input auv-textarea" id="p-mem-value" rows="4">' + esc(d.value || '') + '</textarea>')}
        </div>
        <div class="props-callout props-callout-info">Grava o que o lead disse hoje no WhatsApp. Condições «mensagem contém» também usam o texto do dia.</div>`;
    } else if (type === 'flow_randomizer') {
      html += `
        ${propsField('Ramificação A (%)', '<input type="number" class="auv-input" id="p-pct-a" min="1" max="99" value="' + (d.pct_a ?? 50) + '">', 'Saída azul = A · vermelha = B')}
        <div class="props-callout">O restante vai automaticamente para o ramo B.</div>`;
    } else if (type === 'flow_delay') {
      html += propsField('Aguardar (minutos)', '<input type="number" class="auv-input" id="p-delay" min="1" max="43200" value="' + (d.delay_minutes ?? 5) + '">', 'Processado pelo worker Node (sem cron PHP)');
    } else if (type === 'flow_message') {
      html += `
        ${propsField('Conexão (linha)', '<div class="auv-picker" id="picker-msg-connection"></div>', 'Número WhatsApp que envia')}
        ${propsField('Agente (cérebro)', '<div class="auv-picker" id="picker-msg-agent"></div>', 'Opcional — contexto do agente na mensagem')}
        ${propsField('Texto da mensagem', varChipsHtml('p-msg-text') + '<textarea class="auv-input auv-textarea" id="p-msg-text" rows="6">' + esc(d.message || '') + '</textarea>')}
        <div class="msg-preview"><span class="msg-preview-label">Prévia</span><p id="p-msg-preview"></p></div>`;
    } else if (type === 'flow_action') {
      html += `
        ${propsField('Tipo de ação', '<div class="auv-picker" id="picker-action-type"></div>')}
        <div id="p-action-fields" class="props-action-fields"></div>`;
    }
    body.innerHTML = html;
    bindPropsEvents(nodeId, type, d);
  }

  function updateTriggerValueVisibility(tt) {
    const agentWrap = document.getElementById('wrap-trigger-agent');
    const stage = document.getElementById('p-trigger-stage');
    const tag = document.getElementById('p-trigger-tag');
    const wh = document.getElementById('p-trigger-webhook');
    const src = document.getElementById('p-trigger-source');
    const hint = document.getElementById('p-trigger-hint');
    const lbl = document.getElementById('p-trigger-value-label');
    if (agentWrap) agentWrap.style.display = ['whatsapp_first', 'whatsapp_message'].includes(tt) ? 'block' : 'none';
    if (stage) stage.style.display = tt === 'stage_enter' ? 'block' : 'none';
    if (tag) tag.style.display = tt === 'tag_added' ? 'block' : 'none';
    if (wh) wh.style.display = tt === 'webhook_received' ? 'block' : 'none';
    if (src) src.style.display = tt === 'contact_created' ? 'block' : 'none';
    if (lbl) lbl.style.display = ['whatsapp_first', 'whatsapp_message', 'ltv_inactive'].includes(tt) ? 'none' : 'block';
    const hints = {
      whatsapp_first: 'Dispara quando o lead manda a primeira mensagem no número conectado (Evolution).',
      whatsapp_message: 'Dispara a cada mensagem recebida — use condição para filtrar palavras ou tags.',
      stage_enter: 'Quando o card do lead entra no estágio escolhido no funil.',
      tag_added: 'Quando a tag é aplicada (manual, automação ou integração).',
      webhook_received: 'Lead criado/atualizado por URL de webhook (Hotmart, formulário…).',
      contact_created: 'Novo lead no CRM (qualquer origem ou filtro abaixo).',
      ltv_inactive: 'Cliente sumiu do ciclo de compra (worker LTV).',
    };
    if (hint) hint.textContent = hints[tt] || '';
  }

  function bindPropsEvents(nodeId, type, d) {
    const apply = () => {
      const node = editor.getNodeFromId(nodeId);
      if (!node) return;
      const data = { ...node.data };

      if (type === 'flow_trigger') {
        data.trigger_type = triggerTypePicker?.getValue() || data.trigger_type;
        const tt = data.trigger_type;
        if (tt === 'whatsapp_first' || tt === 'whatsapp_message') {
          data.trigger_value = triggerConnectionPicker?.getValue() || '*';
        } else if (tt === 'stage_enter') data.trigger_value = document.getElementById('p-trigger-stage')?.value || 'new';
        else if (tt === 'tag_added') data.trigger_value = document.getElementById('p-trigger-tag')?.value?.trim() || '';
        else if (tt === 'webhook_received') data.trigger_value = document.getElementById('p-trigger-webhook')?.value || '';
        else if (tt === 'contact_created') data.trigger_value = document.getElementById('p-trigger-source')?.value || '*';
        else if (tt === 'ltv_inactive') data.trigger_value = 'default';
      } else if (type === 'flow_condition') {
        data.require_tag = document.getElementById('p-require-tag')?.value?.trim() || '';
        data.exclude_tag = document.getElementById('p-exclude-tag')?.value?.trim() || '';
        data.stage_is = document.getElementById('p-stage-is')?.value || '';
        data.stage_not = document.getElementById('p-stage-not')?.value || '';
        data.agent_id = parseInt(condAgentPicker?.getValue() || '0', 10) || 0;
        data.agent_unassigned = document.getElementById('p-agent-unassigned')?.checked ? 1 : 0;
        data.keyword_contains = document.getElementById('p-kw-contains')?.value?.trim() || '';
        data.keyword_not_contains = document.getElementById('p-kw-not')?.value?.trim() || '';
        data.require_email = document.getElementById('p-req-email')?.checked ? 1 : 0;
        data.require_phone = document.getElementById('p-req-phone')?.checked ? 1 : 0;
        data.business_hours_only = document.getElementById('p-bh-only')?.checked ? 1 : 0;
        data.outside_business_hours = document.getElementById('p-bh-out')?.checked ? 1 : 0;
        data.bh_start = document.getElementById('p-bh-start')?.value || '08:00';
        data.bh_end = document.getElementById('p-bh-end')?.value || '18:00';
        data.bh_weekdays = document.getElementById('p-bh-days')?.value?.trim() || '1,2,3,4,5';
        data.ab_chance = parseInt(document.getElementById('p-ab')?.value, 10) || 100;
      } else if (type === 'flow_memory') {
        data.memory_key = document.getElementById('p-mem-key')?.value?.trim() || '';
        data.value_mode = document.getElementById('p-mem-mode')?.value || 'session_today';
        data.session_limit = parseInt(document.getElementById('p-mem-limit')?.value, 10) || 8;
        data.value = document.getElementById('p-mem-value')?.value || '';
      } else if (type === 'flow_randomizer') {
        data.pct_a = parseInt(document.getElementById('p-pct-a')?.value, 10) || 50;
      } else if (type === 'flow_delay') {
        data.delay_minutes = parseInt(document.getElementById('p-delay')?.value, 10) || 5;
      } else if (type === 'flow_message') {
        data.connection_id = parseInt(msgConnectionPicker?.getValue() || '0', 10) || 0;
        data.agent_id = parseInt(msgAgentPicker?.getValue() || '0', 10) || 0;
        data.message = document.getElementById('p-msg-text')?.value || '';
        const prev = document.getElementById('p-msg-preview');
        if (prev) prev.textContent = previewMessageClient(data.message) || '—';
      } else if (type === 'flow_action') {
        data.action_type = actionTypePicker?.getValue() || 'assign_agent';
        syncActionFieldsToData(data);
      }

      editor.updateNodeDataFromId(nodeId, data);
      refreshNodeVisual(nodeId);
    };

    if (type === 'flow_trigger') {
      triggerTypePicker = mountAuvPicker('picker-trigger-type', TRIGGER_OPTIONS, d.trigger_type || 'whatsapp_first', (v) => {
        updateTriggerValueVisibility(v);
        apply();
      });
      const agVal = ['whatsapp_first', 'whatsapp_message'].includes(d.trigger_type)
        ? (d.trigger_value || '*')
        : '*';
      triggerConnectionPicker = mountConnectionPickerEl('picker-trigger-agent', agVal, () => apply(), true);
      updateTriggerValueVisibility(d.trigger_type || 'whatsapp_first');
    }

    if (type === 'flow_condition') {
      condAgentPicker = mountAgentPickerEl('picker-cond-agent', d.agent_id || 0, () => apply(), 'lead');
    }

    if (type === 'flow_message') {
      const defaultConn = d.connection_id || (B.whatsappConnections && B.whatsappConnections[0] ? B.whatsappConnections[0].id : 0);
      const defaultAg = d.agent_id || (B.agents && B.agents[0] ? B.agents[0].id : 0);
      msgConnectionPicker = mountConnectionPickerEl('picker-msg-connection', defaultConn, () => apply(), false);
      msgAgentPicker = mountAgentPickerEl('picker-msg-agent', defaultAg, () => apply(), 'assign');
    }

    if (type === 'flow_action') {
      actionTypePicker = mountAuvPicker('picker-action-type', ACTION_OPTIONS_GROUPED, d.action_type || 'assign_agent', (v) => {
        renderActionFields({ action_type: v }, nodeId, apply);
        apply();
      });
    }

    const propsBody = document.getElementById('flow-props-body');
    propsBody?.querySelectorAll('input, select, textarea').forEach((el) => {
      if (el.id === 'p-trigger-type') return;
      el.addEventListener('change', apply);
      el.addEventListener('input', apply);
    });

    bindVarChips(document.getElementById('flow-props-body'));
    const msgTa = document.getElementById('p-msg-text');
    if (msgTa) {
      const upd = () => {
        const prev = document.getElementById('p-msg-preview');
        if (prev) prev.textContent = previewMessageClient(msgTa.value) || '—';
      };
      msgTa.addEventListener('input', upd);
      upd();
    }

    if (type === 'flow_action') {
      renderActionFields(d, nodeId, apply);
    }

    const memMode = document.getElementById('p-mem-mode');
    if (memMode) {
      const syncMemUi = () => {
        const mode = memMode.value;
        const lim = document.getElementById('wrap-mem-limit');
        const val = document.getElementById('wrap-mem-value');
        if (lim) lim.style.display = mode === 'session_recent' ? '' : 'none';
        if (val) val.style.display = ['fixed', 'template'].includes(mode) ? '' : 'none';
      };
      memMode.addEventListener('change', () => {
        syncMemUi();
        apply();
      });
      syncMemUi();
    }
  }

  function renderActionFields(d, nodeId, apply) {
    const wrap = document.getElementById('p-action-fields');
    if (!wrap) return;
    actionAgentPicker = null;
    actionConnectionPicker = null;
    const t = d.action_type || 'assign_agent';
    let h = '';
    if (t === 'send_whatsapp' || t === 'invoke_agent') {
      if (t === 'send_whatsapp') {
        h = propsField('Conexão (linha)', '<div class="auv-picker" id="picker-action-connection"></div>', 'Número WhatsApp que envia');
        h += propsField('Agente (cérebro)', '<div class="auv-picker" id="picker-action-agent"></div>', 'Quem responde / contexto da mensagem');
      } else {
        h = propsField('Agente (cérebro)', '<div class="auv-picker" id="picker-action-agent"></div>');
      }
      if (t === 'invoke_agent') {
        h += `<label class="props-check"><input type="checkbox" class="p-f-switch" ${d.switch_agent ? 'checked' : ''}> Trocar agente do lead</label>`;
      }
      h += propsField('Mensagem', varChipsHtml('p-f-msg-ta') + `<textarea class="auv-input auv-textarea p-f-msg" id="p-f-msg-ta" rows="4">${esc(d.message || '')}</textarea>`);
    } else if (t === 'assign_agent') {
      h = propsField('Agente responsável', '<div class="auv-picker" id="picker-action-agent"></div>');
    } else if (t === 'move_stage') {
      h = propsField('Estágio destino', `<select class="auv-input auv-native-select p-f-stage">${stageOptions(d.stage)}</select>`);
    } else if (t === 'add_tag' || t === 'remove_tag') {
      h = propsField('Nome da tag', `<input class="auv-input p-f-tag" value="${esc(d.tag || '')}" placeholder="nome-da-tag">`);
    } else if (t === 'pause_ai' || t === 'resume_ai') {
      h = propsField('Agente (conversa)', '<div class="auv-picker" id="picker-action-agent"></div>');
      if (t === 'pause_ai') {
        h += propsField('Pausar por (min)', `<input type="number" class="auv-input p-f-mins" value="${d.minutes || 60}" min="15">`);
      }
    } else if (t === 'call_webhook') {
      const whOpts = outboundWebhooks.length
        ? outboundWebhooks.map((w) => `<option value="${w.id}" ${String(d.webhook_id) === String(w.id) ? 'selected' : ''}>${esc(w.name)}</option>`).join('')
        : '<option value="">Nenhum webhook outbound</option>';
      h = propsField('Webhook outbound', `<select class="auv-input auv-native-select p-f-wh">${whOpts}</select>`);
    } else if (t === 'http_preset') {
      const prOpts = httpPresets.length
        ? httpPresets.map((p) => `<option value="${p.id}" ${String(d.preset_id) === String(p.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')
        : '<option value="">Nenhum preset</option>';
      h = propsField('Preset HTTP', `<select class="auv-input auv-native-select p-f-preset">${prOpts}</select>`);
    } else if (t === 'set_memory') {
      h = propsField('Chave', `<input class="auv-input p-f-key" value="${esc(d.key || '')}" placeholder="ex: interesse">`)
        + propsField('Valor', `<input class="auv-input p-f-val" value="${esc(d.value || '')}">`);
    } else if (t === 'brain_mission') {
      h = propsField(
        'Missão para o cérebro',
        varChipsHtml('p-f-mission') + `<textarea class="auv-input auv-textarea p-f-mission" id="p-f-mission" rows="5" placeholder="Ex.: Confirmar horário e agendar no Google Calendar; marcar tag consulta-agendada.">${esc(d.mission || d.message || '')}</textarea>`,
        'A próxima resposta IA do agente seguirá esta missão (memória _brain_mission). Variáveis: {{nome}}, {{estagio}}, etc.'
      );
    } else if (t === 'clear_brain_mission') {
      h = propsField(
        'Limpar missão',
        '<p class="text-muted" style="font-size:.8125rem;margin:0">Remove <code>_brain_mission</code> após conclusão (tag, estágio ou ação do cérebro).</p>'
      );
    }
    wrap.innerHTML = h;
    bindVarChips(wrap);
    const needsAgent = ['send_whatsapp', 'invoke_agent', 'assign_agent', 'pause_ai', 'resume_ai'].includes(t);
    if (t === 'send_whatsapp' && document.getElementById('picker-action-connection')) {
      const defaultConn = d.connection_id || (B.whatsappConnections && B.whatsappConnections[0] ? B.whatsappConnections[0].id : 0);
      actionConnectionPicker = mountConnectionPickerEl('picker-action-connection', defaultConn, () => apply(), false);
    }
    if (needsAgent && document.getElementById('picker-action-agent')) {
      const mode = ['pause_ai', 'resume_ai'].includes(t) ? 'lead' : 'assign';
      actionAgentPicker = mountAgentPickerEl('picker-action-agent', d.agent_id || 0, () => apply(), mode);
    }
    wrap.querySelectorAll('input, select, textarea').forEach((el) => {
      el.addEventListener('change', apply);
      el.addEventListener('input', apply);
    });
  }

  function syncActionFieldsToData(data) {
    const t = data.action_type;
    if (actionConnectionPicker) data.connection_id = parseInt(actionConnectionPicker.getValue(), 10) || 0;
    if (actionAgentPicker) data.agent_id = parseInt(actionAgentPicker.getValue(), 10) || 0;
    const ag = document.querySelector('.p-f-agent');
    if (ag && !actionAgentPicker) data.agent_id = parseInt(ag.value, 10);
    const sw = document.querySelector('.p-f-switch');
    if (sw) data.switch_agent = sw.checked;
    const msg = document.querySelector('.p-f-msg');
    if (msg) data.message = msg.value;
    const st = document.querySelector('.p-f-stage');
    if (st) data.stage = st.value;
    const tag = document.querySelector('.p-f-tag');
    if (tag) data.tag = tag.value.trim();
    const mins = document.querySelector('.p-f-mins');
    if (mins) data.minutes = parseInt(mins.value, 10) || 60;
    const wh = document.querySelector('.p-f-wh');
    if (wh) data.webhook_id = parseInt(wh.value, 10);
    const pr = document.querySelector('.p-f-preset');
    if (pr) data.preset_id = parseInt(pr.value, 10);
    const key = document.querySelector('.p-f-key');
    if (key) data.key = key.value.trim();
    const val = document.querySelector('.p-f-val');
    if (val) data.value = val.value.trim();
    const mission = document.querySelector('.p-f-mission');
    if (mission) data.mission = mission.value.trim();
    data.label = ACTION_LABELS[t] || t;
  }

  async function loadFlowList() {
    const res = await fetch(API + '?action=crm_list_flows');
    const d = await res.json();
    const el = document.getElementById('flow-list');
    if (!el) return;
    const filterPid = getFlowPipelineId();
    let flows = d.flows || [];
    if (filterPid > 0) {
      flows = flows.filter((f) => !f.pipeline_id || parseInt(f.pipeline_id, 10) === filterPid);
    }
    if (!flows.length) {
      el.innerHTML = '<p class="text-muted" style="padding:12px;font-size:.8rem">Nenhum fluxo neste pipeline. Crie ou troque o funil acima.</p>';
      return;
    }
    el.innerHTML = flows
      .map((f) => {
        const active = f.id == currentFlowId ? ' active' : '';
        const badge = f.is_active == 1 ? '<span class="flow-badge on">Ativo</span>' : '<span class="flow-badge off">Rascunho</span>';
        const pipe = f.pipeline_name ? `<span class="flow-badge pipe">${esc(f.pipeline_name)}</span>` : '';
        return `<button type="button" class="flow-list-item${active}" data-id="${f.id}">
          <strong>${esc(f.name)}</strong>
          <div class="flow-list-meta">Entraram ${f.stats_entered || 0} · OK ${f.stats_success || 0} ${pipe}</div>
          ${badge}
        </button>`;
      })
      .join('');
    el.querySelectorAll('.flow-list-item').forEach((btn) => {
      btn.addEventListener('click', () => loadFlow(parseInt(btn.dataset.id, 10)));
    });
  }

  async function loadFlow(id) {
    if (!id) return;
    const res = await fetch(API + '?action=crm_get_flow&id=' + id);
    const d = await res.json();
    if (d.error || !d.flow) {
      alert(d.message || 'Erro ao carregar');
      return;
    }
    currentFlowId = id;
    const f = d.flow;
    document.getElementById('flow-name').value = f.name || '';
    document.getElementById('flow-active').checked = f.is_active == 1;
    const pipeSel = document.getElementById('flow-pipeline');
    if (pipeSel && f.pipeline_id) {
      pipeSel.value = String(f.pipeline_id);
      syncFlowPipelineToBoot();
    }
    let exported = {};
    try {
      exported = JSON.parse(f.flow_data || '{}');
    } catch (e) {
      exported = defaultFlowExport();
    }
    if (!exported.drawflow) exported = defaultFlowExport();
    editor.clear();
    editor.import(exported);
    Object.keys(editor.drawflow.drawflow.Home.data).forEach((nid) => refreshNodeVisual(nid));
    selectedNodeId = null;
    renderPropsPanel(null);
    loadFlowList();
  }

  async function saveCurrentFlow() {
    if (!editor) return;
    const name = document.getElementById('flow-name')?.value?.trim() || 'Nova automação';
    const isActive = document.getElementById('flow-active')?.checked ? 1 : 0;
    const exported = editor.export();
    const fd = new FormData();
    fd.append('csrf_token', CSRF);
    fd.append('action', 'crm_save_flow');
    if (currentFlowId) fd.append('id', currentFlowId);
    fd.append('name', name);
    fd.append('flow_data', JSON.stringify(exported));
    fd.append('is_active', String(isActive));
    fd.append('pipeline_id', String(getFlowPipelineId()));
    const res = await fetch(API, { method: 'POST', body: fd });
    const d = await res.json();
    if (d.error) return alert(d.message || 'Erro ao salvar');
    if (d.id && !currentFlowId) {
      currentFlowId = d.id;
      await loadFlow(d.id);
    }
    loadFlowList();
    if (typeof window.loadDedupeWarnings === 'function') window.loadDedupeWarnings();
    const btn = document.getElementById('btn-flow-saved');
    if (btn) {
      btn.textContent = 'Salvo ✓';
      setTimeout(() => { btn.textContent = 'Salvar'; }, 2000);
    }
  }

  const TEMPLATE_STAGE_ORDER = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed', 'lost', 'won'];
  const STAGE_SLUG_ALIASES = { won: 'closed', close: 'closed', fechado: 'closed', ganho: 'closed' };

  function pipelineStageSlugs(pid) {
    const ordered = B.stagesOrderedByPipeline && B.stagesOrderedByPipeline[pid];
    if (ordered && ordered.length) return ordered;
    return Object.keys(flowStages());
  }

  function buildStageRemap(pipelineSlugs) {
    const map = {};
    TEMPLATE_STAGE_ORDER.forEach((tpl, i) => {
      if (pipelineSlugs.includes(tpl)) {
        map[tpl] = tpl;
        return;
      }
      const ali = STAGE_SLUG_ALIASES[tpl];
      if (ali && pipelineSlugs.includes(ali)) {
        map[tpl] = ali;
        return;
      }
      map[tpl] = pipelineSlugs[i] || pipelineSlugs[pipelineSlugs.length - 1] || tpl;
    });
    pipelineSlugs.forEach((s) => {
      if (!map[s]) map[s] = s;
    });
    return map;
  }

  function remapStageSlug(slug, remap, pipelineSlugs) {
    if (!slug) return slug;
    if (remap[slug]) return remap[slug];
    if (pipelineSlugs.includes(slug)) return slug;
    return pipelineSlugs[0] || slug;
  }

  function remapFlowExportStages(exp, pipelineId) {
    const slugs = pipelineStageSlugs(pipelineId);
    const remap = buildStageRemap(slugs);
    const nodes = exp?.drawflow?.drawflow?.Home?.data;
    if (!nodes || typeof nodes !== 'object') return { export: exp, changed: false };
    let changed = false;
    Object.keys(nodes).forEach((nid) => {
      const node = nodes[nid];
      if (!node || !node.data) return;
      const d = node.data;
      const name = node.name || '';
      if (name === 'flow_trigger' && d.trigger_type === 'stage_enter' && d.trigger_value) {
        const next = remapStageSlug(String(d.trigger_value), remap, slugs);
        if (next !== d.trigger_value) {
          d.trigger_value = next;
          d._preview = 'Estágio <strong>' + esc(flowStages()[next] || next) + '</strong>';
          changed = true;
        }
      }
      if (name === 'flow_condition') {
        if (d.stage_is) {
          const n = remapStageSlug(String(d.stage_is), remap, slugs);
          if (n !== d.stage_is) { d.stage_is = n; changed = true; }
        }
        if (d.stage_not) {
          const n = remapStageSlug(String(d.stage_not), remap, slugs);
          if (n !== d.stage_not) { d.stage_not = n; changed = true; }
        }
      }
      if (name === 'flow_action' && d.action_type === 'move_stage' && d.stage) {
        const n = remapStageSlug(String(d.stage), remap, slugs);
        if (n !== d.stage) { d.stage = n; changed = true; }
      }
    });
    return { export: exp, changed };
  }

  function applyTemplate(tpl) {
    closeTemplateModal();
    const built = tpl.build(B.agents || []);
    currentFlowId = 0;
    document.getElementById('flow-name').value = built.name || tpl.name;
    document.getElementById('flow-active').checked = false;
    syncFlowPipelineToBoot();
    editor.clear();
    let exp = built.export || defaultFlowExport();
    const remapped = remapFlowExportStages(exp, getFlowPipelineId());
    exp = remapped.export;
    editor.import(exp);
    Object.keys(editor.drawflow.drawflow.Home.data).forEach((nid) => refreshNodeVisual(nid));
    renderPropsPanel(null);
    loadFlowList();
    if (remapped.changed && typeof window.toast === 'function') {
      window.toast('Template aplicado. Estágios ajustados ao seu funil.', 'info');
    }
  }

  function openTemplateModal() {
    const modal = document.getElementById('flow-template-modal');
    const grid = document.getElementById('flow-template-grid');
    if (!modal || !grid) return newFlowBlank();
    const templates = window.AUVVO_FLOW_TEMPLATES || [];
    const agentCount = (B.agents || []).length;
    const packHint =
      agentCount < 2
        ? `<div class="flow-tpl-hint"><i class="ph-bold ph-package"></i> Para testar <strong>vários agentes</strong> de uma vez, use <button type="button" class="flow-tpl-hint-link" id="flow-tpl-goto-pack">Pacote completo</button> na barra lateral.</div>`
        : '';
    const sectors = [...new Set(templates.map((t) => t.sector))];
    grid.innerHTML = packHint + sectors
      .map((sec) => {
        const items = templates.filter((t) => t.sector === sec);
        return `<div class="flow-tpl-sector"><h4>${esc(sec)}</h4><div class="flow-tpl-cards">${items
          .map(
            (t) => `<button type="button" class="flow-tpl-card" data-tpl="${esc(t.id)}">
              <span class="flow-tpl-icon" style="background:${t.color}18;color:${t.color}"><i class="ph-bold ${t.icon}"></i></span>
              <strong>${esc(t.name)}</strong>
              <span>${esc(t.description)}</span>
            </button>`
          )
          .join('')}</div></div>`;
      })
      .join('');
    grid.querySelectorAll('.flow-tpl-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-tpl');
        const tpl = templates.find((x) => x.id === id);
        if (tpl) applyTemplate(tpl);
      });
    });
    document.getElementById('flow-tpl-goto-pack')?.addEventListener('click', () => {
      closeTemplateModal();
      document.getElementById('btn-pack-templates')?.click();
    });
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeTemplateModal() {
    const modal = document.getElementById('flow-template-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function newFlowBlank() {
    currentFlowId = 0;
    document.getElementById('flow-name').value = 'Nova automação';
    document.getElementById('flow-active').checked = false;
    editor.clear();
    editor.import(defaultFlowExport());
    refreshNodeVisual(1);
    renderPropsPanel(null);
    loadFlowList();
  }

  function newFlow() {
    openTemplateModal();
  }

  async function deleteCurrentFlow() {
    if (!currentFlowId) return;
    if (!confirm('Excluir este fluxo permanentemente?')) return;
    const fd = new FormData();
    fd.append('csrf_token', CSRF);
    fd.append('action', 'crm_delete_flow');
    fd.append('id', currentFlowId);
    await fetch(API, { method: 'POST', body: fd });
    currentFlowId = 0;
    await newFlowBlank();
    loadFlowList();
  }

  async function loadAuxData() {
    try {
      const [inb, out, http] = await Promise.all([
        fetch(API + '?action=inbound_webhook_list').then((r) => r.json()),
        fetch(API + '?action=outbound_webhook_list').then((r) => r.json()),
        fetch(API + '?action=http_preset_list').then((r) => r.json()),
      ]);
      inboundWebhooks = inb.webhooks || [];
      outboundWebhooks = out.webhooks || [];
      httpPresets = http.presets || [];
    } catch (e) {}
  }

  function bindUi() {
    document.getElementById('btn-new-flow')?.addEventListener('click', newFlow);
    document.getElementById('flow-template-close')?.addEventListener('click', closeTemplateModal);
    document.querySelector('#flow-template-modal .flow-modal-backdrop')?.addEventListener('click', closeTemplateModal);
    document.getElementById('btn-flow-save')?.addEventListener('click', saveCurrentFlow);
    document.getElementById('btn-flow-delete')?.addEventListener('click', deleteCurrentFlow);
    document.querySelectorAll('[data-add-node]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-add-node');
        const cx = 200 + Math.random() * 200;
        const cy = 100 + Math.random() * 120;
        const id = addNode(t, cx, cy);
        if (id) editor.selectNode(id);
      });
    });
    document.getElementById('zoom-in')?.addEventListener('click', () => editor.zoom_in());
    document.getElementById('zoom-out')?.addEventListener('click', () => editor.zoom_out());
    document.getElementById('zoom-reset')?.addEventListener('click', () => editor.zoom_reset());
  }

  window.loadFlowList = loadFlowList;

  window.initAutomacoesFlow = async function () {
    initEditor();
    initFlowPipelineSelect();
    bindUi();
    await loadAuxData();
    await newFlowBlank();
    const res = await fetch(API + '?action=crm_list_flows');
    const d = await res.json();
    if (d.flows && d.flows.length) {
      await loadFlow(d.flows[0].id);
    }
  };

  // Expõe para automacoes-packs.js (remapeamento de estágios em pacotes completos)
  window.remapFlowExportStages = remapFlowExportStages;
  window.pipelineStageSlugs = pipelineStageSlugs;

  window.setAutomacoesPageTab = function (tab) {
    const connections = document.getElementById('panel-connections');
    const visual = document.getElementById('panel-visual');
    const quick = document.getElementById('panel-quick-rules');
    const tConn = document.getElementById('tab-connections');
    const t1 = document.getElementById('tab-visual');
    const t2 = document.getElementById('tab-quick');
    const showConn = tab === 'connections';
    const showQuick = tab === 'quick';
    if (connections) connections.style.display = showConn ? 'block' : 'none';
    if (visual) visual.style.display = !showConn && !showQuick ? 'block' : 'none';
    if (quick) quick.style.display = showQuick ? 'block' : 'none';
    tConn?.classList.toggle('active', showConn);
    t1?.classList.toggle('active', !showConn && !showQuick);
    t2?.classList.toggle('active', showQuick);
    if (!showConn && !showQuick && typeof window.ensureFlowEditorInit === 'function') {
      window.ensureFlowEditorInit();
    }
    if (showConn && typeof window.auvvoEvolutionConnect?.refreshSelection === 'function') {
      window.auvvoEvolutionConnect.refreshSelection();
    }
  };
})();
