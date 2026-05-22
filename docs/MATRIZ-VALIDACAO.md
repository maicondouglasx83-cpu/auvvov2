# Matriz de validação — Auvvo v2

Checklist para garantir que **todas as funções permanecem operacionais** após cada fase do [ROADMAP](./ROADMAP.md).

**Como usar:** marcar `[x]` quando o teste passar em ambiente de staging com dados reais (Evolution + LLM + pagamento sandbox).

---

## Legenda

| Coluna | Significado |
|--------|-------------|
| ID | Identificador do caso |
| Prioridade | P0 = bloqueador |
| Fase | Fase do roadmap que introduz ou revalida |

---

## A. Baseline — estado atual (regressão obrigatória)

Executar **antes e depois** de cada release.

### A.1 Autenticação e SaaS

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| A1.1 | Login válido | POST login com usuário ativo | Redirect dashboard, sessão `user_id` | P0 |
| A1.2 | Login inválido | Senha errada 3x | Mensagem erro, sem sessão | P0 |
| A1.3 | Rate limit login | 11 tentativas / 15 min | Bloqueio temporário | P1 |
| A1.4 | CSRF API | POST `api.php` sem token | HTTP 403 | P0 |
| A1.5 | Página protegida | Acessar `/dashboard` sem sessão | Redirect login | P0 |
| A1.6 | Logout | `backend/logout.php` | Sessão destruída | P0 |

### A.2 Checkout e assinatura

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| A2.1 | Checkout mensal | `checkout?plan=mensal` → pagamento sandbox | Redirect gateway, user criado | P0 |
| A2.2 | Webhook AbacatePay | Simular `subscription.completed` | `subscriptions.status=active` | P0 |
| A2.3 | E-mail boas-vindas | Após completed | 1 e-mail (dedupe) | P1 |

### A.3 Agentes e WhatsApp

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| A3.1 | Criar agente | Wizard completo, salvar | Registro em `agents` | P0 |
| A3.2 | Evolution connect | `evolution_connect` | QR retornado | P0 |
| A3.3 | Evolution status | Escanear QR | `agents.status=online` | P0 |
| A3.4 | Upload conhecimento | PDF/TXT &lt; 50MB | `knowledge_base` status treinado | P0 |
| A3.5 | Master prompt | `get_master_prompt` | JSON com prompt não vazio | P0 |

### A.4 Pipeline IA (modo atual até Fase 1)

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| A4.1 | Mensagem inbound | Cliente envia texto no WhatsApp | Resposta IA em &lt; 60s (inline ou queue) | P0 |
| A4.2 | Handoff palavra-chave | Mensagem com termo configurado | IA pausa + resumo handoff | P0 |
| A4.3 | IA pausada manual | Pausar 15 min em conversas | Próxima msg: log fallback, sem IA | P0 |
| A4.4 | Envio manual | Com IA pausada, enviar texto | Evolution entrega, log `manual` | P0 |
| A4.5 | Áudio ElevenLabs | Agente com áudio on | Áudio no WhatsApp (se chave válida) | P1 |
| A4.6 | GCal directive | Pedido de agendamento com GCal on | Evento criado ou aviso na msg | P1 |

### A.5 CRM

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| A5.1 | Sync webhook | Msg de número novo | Contato criado no CRM | P0 |
| A5.2 | Kanban drag | Mover card de estágio | `crm_update_stage` persiste | P0 |
| A5.3 | Tags | add/remove tag | JSON tags atualizado | P1 |
| A5.4 | Export CSV | `crm_export_csv` | Download válido | P1 |

### A.6 Campanhas

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| A6.1 | Criar campanha | CSV + mensagem + agente | Registro `campaigns` | P0 |
| A6.2 | Disparo | Executar worker/cron | Mensagens enviadas, contador sobe | P0 |

### A.7 Configurações

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| A7.1 | Salvar chaves IA | OpenAI/Gemini no form | Persistido em `settings` | P0 |
| A7.2 | Google Calendar OAuth | connect → callback | Token em `google_calendar_tokens` | P1 |

---

## B. Fase 1 — Fila, worker Node, proteções

### B.1 Borda (webhook)

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| B1.1 | Resposta rápida | POST MESSAGE, medir tempo | HTTP 200 em &lt; 200ms p95 | P0 |
| B1.2 | Job enfileirado | Após webhook | Linha em `auvvo_ai_jobs` debouncing/pending | P0 |
| B1.3 | Sem LLM no webhook | Trace/log | Nenhuma chamada cURL LLM no processo PHP do webhook | P0 |
| B1.4 | CRM no webhook | Msg inbound | Contato upsert antes do 200 | P0 |
| B1.5 | Dedup duplo POST | Mesmo message_id 2x | 1 job apenas | P0 |

### B.2 Worker Node

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| B2.1 | Worker ativo | PM2/systemd status | Processo running | P0 |
| B2.2 | Processamento E2E | 1 mensagem simples | Job `done`, resposta no WhatsApp | P0 |
| B2.3 | Retry | Simular 503 LLM | `attempts` incrementa, retry após backoff | P0 |
| B2.4 | Dead letter | 3 falhas | `status=failed`, `last_error` preenchido | P0 |
| B2.5 | HMAC inválido | POST internal sem assinatura | 403 | P0 |

### B.3 Debouncer

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| B3.1 | Burst 3 msgs | "Oi" + "Tudo" + "Preço" em 2s | 1 chamada LLM, body concatenado | P0 |
| B3.2 | Janela respeitada | Msg única | Processa após ~4s debounce | P1 |

### B.4 Rate limit e anti-loop

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| B4.1 | Flood peer | 40 msgs em 1 min | Parte suprimida ou adiada | P0 |
| B4.2 | Eco bot | Repetir última resposta IA como inbound | Suprimido (echo) | P0 |
| B4.3 | Loop prolongado | Simular 10 trocas bot-like | IA pausa ou suprime | P1 |

### B.5 Campanhas via worker

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| B5.1 | Sem cron PHP | Desligar cron antigo | Campanhas ainda progridem via Node | P0 |
| B5.2 | Rate campanha | 100 contatos | ≤ N msgs/min configurado | P0 |

### B.6 Regressão Fase 1

| ID | Teste | Esperado | P |
|----|-------|----------|---|
| B6.1 | Suite A completa | Todos A.* passam com `WEBHOOK_AI_MODE=queue` | P0 |

---

## C. Fase 2 — Inbox tempo real + contexto

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| C1.1 | SSE conecta | Abrir conversas.php | EventSource connected | P0 |
| C2.2 | Nova msg sem F5 | Cliente envia WhatsApp | Bolha aparece em &lt; 5s | P0 |
| C2.3 | Handoff badge | Transbordo | UI `waiting_human` | P0 |
| C2.4 | Summary após 15 turnos | Conversa longa | `conversation_summaries` populado | P1 |
| C2.5 | Memória CRM | IA extrai fato | `contacts.memory_json` atualizado | P1 |
| C2.6 | Loss reason | Mover para lost sem motivo | Validação impede ou modal | P1 |
| C2.7 | Regressão A+B | Suites A e B | Pass | P0 |

---

## D. Fase 3 — Integrações e automações

| ID | Teste | Passos | Esperado | P |
|----|-------|--------|----------|---|
| D1.1 | Webhook inbound URL | POST JSON Hotmart-like | Lead no CRM com campos mapeados | P0 |
| D1.2 | Dedup inbound | Mesmo payload 2x | 1 contato | P0 |
| D2.1 | Automação stage | Mover para `contacted` | WhatsApp disparado | P1 |
| D2.2 | Automação tag | Tag X adicionada | Ação configurada executa | P1 |
| D3.1 | Pipeline custom | Criar 2º funil | Kanban filtra por pipeline | P2 |
| D3.2 | Regressão A+B+C | Suites anteriores | Pass | P0 |

---

## E. Testes de carga (Fase 1 gate)

| ID | Cenário | Critério de aceite |
|----|---------|-------------------|
| E1 | 50 webhooks simultâneos | 0 HTTP 5xx; todos jobs enfileirados |
| E2 | 100 webhooks em 30s | Fila processa sem travar MySQL |
| E3 | p95 tempo fila→resposta | &lt; 45s com debounce 4s (depende LLM) |

Ferramenta sugerida: `k6` ou script PHP CLI disparando payloads gravados.

---

## F. Ambiente e dados de teste

| Item | Requisito |
|------|-----------|
| Evolution | Instância dev com número de teste |
| LLM | Chave OpenRouter com crédito |
| MySQL | Cópia anonimizada ou tenant `test_*` |
| AbacatePay | Sandbox + webhook tunnel (ngrok) |
| Worker | `auvvo-worker` apontando para staging |

### Contas de teste sugeridas

| Papel | Descrição |
|-------|-----------|
| `user_admin@test` | Plano ativo, 2 agentes, KB populada |
| `user_new@test` | Plano incomplete — deve bloquear features? (documentar regra) |
| Peer WhatsApp | Número controlado pela equipe |

---

## G. Registro de execução

| Data | Versão | Fase | Executor | A passou | B passou | Notas |
|------|--------|------|----------|----------|----------|-------|
| | | | | | | |

---

*Atualizar esta tabela a cada release. Roadmap: [ROADMAP.md](./ROADMAP.md)*
