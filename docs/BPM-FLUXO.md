# Fluxo BPM — Automações e Integrações (Auvvo)

Modelo: **Gatilho → Condição → Ação** (com sequências e atrasos), sem código.

---

## 1. Automações (`automacoes.php`)

### Gatilhos

| Tipo | Quando dispara |
|------|----------------|
| `stage_enter` | Lead muda para um estágio do funil |
| `tag_added` | Tag adicionada ao contato |
| `contact_created` | Primeiro cadastro (WhatsApp, webhook, manual) — valor `*`, `whatsapp`, `webhook`, `manual` ou slug do webhook |
| `webhook_received` | Após processar um webhook inbound (slug) |
| `ltv_inactive` | Cliente passou do ciclo de compra (sem comprar no prazo) |

### Condições (opcional)

- `require_tag` — só executa se o lead tiver a tag
- `exclude_tag` — ignora se tiver a tag
- `ab_chance` — 1–100% (teste A/B simples)

### Ações

WhatsApp, agente, atribuir agente, mover estágio, tag, pausar IA, memória, Google Sheets, HTTP preset, webhook outbound.

### Atrasos e sequências

- **Uma ação:** campo «Aguardar antes da ação (minutos)» → entra na fila `crm_automation_queue`
- **Sequência:** vários passos com atraso acumulado entre eles

Processamento (somente Node, sem cron PHP):

- **Worker Node** (`auvvo-worker`) — a cada tick chama `backend/internal/process_automation_queue.php`

### Fila no painel

Cards no topo de Automações: pendentes, processando, concluídos hoje, falhas.

---

## 2. Webhooks inbound

1. Criar integração (URL + token)
2. Mapeamento visual JSON → CRM
3. Ao receber: estágio, tags, agente, +55
4. Resposta JSON customizada

Motor: `backend/webhook_inbound.php` — dispara `contact_created` (novos) e `webhook_received`.

---

## 3. LTV (ciclo de compra)

### Registrar compras

- Webhook com «Registrar como compra» ou JSON com `purchase.status` = approved/paid
- CRM → painel do contato → «Registrar compra manual»
- Tabela `contact_purchases` + campos no contato: `last_purchase_at`, `purchase_count`, `avg_purchase_cycle_days`

### Regra LTV em Automações

- Gatilho: **LTV — sumiu do ciclo de compra**
- Parâmetros: ciclo esperado (dias), multiplicador (ex. 2×), mínimo de compras, dias fixos sem compra
- Varredura: worker Node (~a cada 55 min, no mesmo processo `npm start`)
- Não repete o mesmo lead na mesma regra por 7 dias (`crm_ltv_fired`)

## 4. Roadmap (próxima fase)

- Canvas BPM arrastar-soltar
- Multi-funil (trocar pipeline)
- Atribuição a usuário humano (equipe)

---

## Deploy

```bash
php backend/install_migrations.php
cd auvvo-worker && npm start
```

Publicar em produção: `backend/internal/process_automation_queue.php`

---

*Atualizado: maio/2026*
