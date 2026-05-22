# APIs Auvvo — interna e externa

## 1. API interna do painel (`backend/api.php`)

Usada pelo frontend (agentes, CRM, conversas). Autenticação: **sessão PHP** + `csrf_token` em POST.

Principais ações: `crm_*`, `evolution_*`, `inbound_webhook_*`, `outbound_webhook_*`, `google_sheets_*`, `api_key_*`, `http_preset_*`, `integrations_catalog`.

---

## 2. API REST pública v1 (`backend/api/v1.php`)

Para integrações externas (n8n, apps próprios, scripts).

### Autenticação

Header obrigatório:

```
X-Auvvo-Api-Key: auvvo_live_xxxxxxxx
```

Chaves são criadas em **Integrações → API REST**.

### Permissões

| Permissão | Uso |
|-----------|-----|
| `crm.read` | GET contacts, contact |
| `crm.write` | POST contacts |
| `agents.read` | GET agents |

### Endpoints

Base: `https://seu-dominio.com/backend/api/v1.php`

| Método | Query | Descrição |
|--------|-------|-----------|
| GET | `?resource=me` | Usuário e permissões |
| GET | `?resource=contacts&stage=new&search=` | Lista CRM |
| GET | `?resource=contact&id=123` | Detalhe |
| POST | `?resource=contacts` | Body JSON — criar/atualizar contato |
| GET | `?resource=agents` | Lista agentes |

Exemplo:

```bash
curl -H "X-Auvvo-Api-Key: auvvo_live_..." \
  "https://auvvo.com/backend/api/v1.php?resource=contacts&stage=new"
```

---

## 3. Webhooks inbound (externos → Auvvo)

`POST backend/webhook_inbound.php?slug={slug}`

- Header opcional: `X-Webhook-Token`
- Resposta personalizável por webhook
- Variáveis extraídas do payload

Ver página **Webhooks**.

---

## 4. Webhooks outbound / HTTP presets

- **Outbound webhooks** (`outbound_webhooks`) — URL + template
- **HTTP presets** (`integration_http_presets`) — Make, Zapier, n8n, Slack URL

Disparados por **Automações** ou teste em Integrações.

---

## 5. Google Sheets

OAuth por usuário. Automação `google_sheets_append` adiciona linha com: data, nome, telefone, email, estágio, empresa, gatilho.

Redirect OAuth no Google Cloud:

```
https://seu-dominio.com/backend/google_sheets_callback.php
```

---

## 6. Google Calendar

OAuth existente — ver Configurações. Agentes usam `[[GCAL_EVENT]]` no prompt.

---

## 7. Fluxo recomendado (sem Make)

```
Hotmart → Webhook inbound Auvvo → CRM
       → Automação stage_enter → Google Sheets + WhatsApp + Agente B
       → API v1 (seu BI) lê contacts
```

Make/Zapier só se quiser orquestração **fora** do Auvvo; use **HTTP preset** com a URL do hook deles.
