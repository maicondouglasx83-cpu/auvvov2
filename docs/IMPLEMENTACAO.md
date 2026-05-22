# Guia de implementação — melhorias concluídas

Resumo do que foi implementado no código para cumprir o [ROADMAP](./ROADMAP.md).

---

## Fase 1 — Escala (fila + worker)

| Entrega | Arquivos |
|---------|----------|
| Fila com debounce | `backend/ai_queue.inc.php`, `backend/migrations.php` |
| Webhook só enfileira (padrão `queue`) | `backend/webhook_evolution.php`, `.env.example` |
| API interna HMAC | `backend/internal/process_ai_job.php` |
| Worker Node contínuo | `auvvo-worker/` |
| Rate limit + anti-loop | `backend/rate_limit.inc.php` |
| Campanhas na fila | `backend/campaign_queue.inc.php`, `auvvo-worker/src/campaignWorker.js` |
| Credenciais Evolution unificadas | `backend/evolution_resolve.inc.php` |
| Stats fila no dashboard | `dashboard.php` |
| Stub legado | `backend/process_ai_queue.php` (410) |

### Deploy Fase 1 — fila + worker Node

1. `.env` raiz: `WEBHOOK_AI_MODE=queue`, `APP_BASE_URL` = URL pública do PHP (ex. `https://auvvo.com`).
2. Migrações: `php backend/install_migrations.php`.
3. **Publicar no servidor** (obrigatório — worker Node chama estas URLs, não use cron PHP):
   - `backend/internal/process_ai_job.php`
   - `backend/internal/process_automation_queue.php`
   - `backend/internal/process_ltv_triggers.php`
   - `backend/internal/queue_stats.php` (opcional, dashboard)
   - Dependências já usadas pelo webhook (`ai_reply.inc.php`, `migrations.php`, etc.)
4. Worker:
   ```bash
   cd auvvo-worker && npm install && npm start
   ```
   Produção: `pm2 start ecosystem.config.cjs`
5. Diagnóstico:
   - `npm run status` — filas MySQL (IA + automações)
   - `npm run ping-internal` — **obrigatório após deploy**: IA (400), automações e LTV (200). Se 404, a pasta `backend/internal/` não está no servidor.
6. `APP_BASE_URL` e `DB_*` no worker devem ser **idênticos** ao `.env` do PHP (senão HMAC 403).
6. Validar [MATRIZ-VALIDACAO](./MATRIZ-VALIDACAO.md) seção B.

### Hub de integrações (Google Sheets, API REST, HTTP)

| Item | Arquivo |
|------|---------|
| Catálogo + painéis | `integracoes.php` |
| Google Sheets OAuth | `backend/GoogleSheets.php`, `google_sheets_*.php` |
| API keys + REST v1 | `backend/ApiAuth.php`, `backend/api/v1.php` |
| HTTP presets (Make/Zapier/n8n) | `integration_http_presets`, `docs/APIS.md` |
| Automação Sheets / HTTP | `crm_automation.inc.php` |

### Automações, agentes inteligentes e webhooks

| Item | Arquivo |
|------|---------|
| Automações + agentes + webhooks | `automacoes.php` |
| Webhooks inbound/outbound, logs, variáveis | `webhooks.php`, `backend/webhook_engine.inc.php` |
| Modo agente fácil / avançado | `agentes.php` (`flow_mode`, `flow_config`) |
| Prompt: fluxo e parceiros | `MasterPromptBuilder.php` |
| Motor automações CRM | `backend/crm_automation.inc.php` |
| BPM: gatilho webhook, condição tag, mover estágio | `docs/BPM-FLUXO.md`, `webhook_received`, `move_stage`, `require_tag` |
| Fila automações + delays/sequências (Node) | `crm_automation_queue`, `internal/process_automation_queue.php`, `auvvo-worker` |
| Gatilho lead criado + A/B + exclude tag | `contact_created`, `ab_chance`, `exclude_tag` |
| LTV ciclo de compra | `crm_ltv.inc.php`, `contact_purchases`, `ltv_inactive`, worker → `process_ltv_triggers.php` |
| Webhook: estágio/tags/agente na entrada | `entry_stage`, `entry_tags` em `inbound_webhooks` |
| Tag dispara automação | `Contacts.php` `addTag()` |
| API webhooks / logs | `backend/api.php` |

### Outros (sessões anteriores)

| Item | Arquivo |
|------|---------|
| CRM: memória + motivo perda | `crm.php`, `Contacts.php` |
| Conversas: painel CRM lateral | `conversas.php` |
| API contato por JID | `crm_get_contact_by_jid` |

---

## Fase 2 — Operação

| Entrega | Arquivos |
|---------|----------|
| Eventos de conversa | `conversation_events` + `backend/conversation_events.inc.php` |
| SSE + polling inbox | `backend/events.php`, `conversas.php` |
| Sumarização + memória CRM | `backend/context_memory.inc.php`, `MasterPromptBuilder.php`, `getConversationHistory` |
| Loss reasons | `Contacts.php`, `crm.php`, migração `contacts.loss_reason` |
| Menu conhecimento | `includes/sidebar.php` |

---

## Fase 3 — Integrações

| Entrega | Arquivos |
|---------|----------|
| Webhooks inbound | `backend/webhook_inbound.php`, `configuracoes.php`, API `inbound_webhook_*` |
| Automações CRM | `backend/crm_automation.inc.php`, API `crm_save_automation` |
| Pipelines (schema + API) | `migrations.php`, `crm_list_pipelines`, `auvvo_ensure_default_pipeline` |

---

## Arquitetura em produção

```
Evolution → webhook_evolution.php (<200ms, 200 OK)
                → auvvo_ai_jobs (debouncing → pending)
auvvo-worker  → internal/process_ai_job.php → LLM + WhatsApp
conversas.php → events.php (SSE) + api conversation_events_since
```

---

## Pendências operacionais (não código)

- Rodar migrações no MySQL de produção quando `.env` estiver correto.
- Ajustar URL Evolution no worker se API diferir de `/send/text`.
- Completar i18n da landing (opcional).
- Testes de carga E1–E3 em staging.

---

*Atualizado: maio/2026*
