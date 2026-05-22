# Auvvo v2 — Brief Executivo

**Produto:** SaaS de agentes de vendas/atendimento com IA para WhatsApp  
**Stack:** PHP 8+ (monólito), MySQL, Evolution API (WhatsApp), OpenRouter/Gemini/OpenAI, AbacatePay/Stripe  
**Repositório:** `auvvov2` (~75 arquivos PHP/JS/CSS)

---

## O que é

A **Auvvo** é uma plataforma em que o usuário cria **agentes de IA** conectados ao WhatsApp via QR Code (Evolution API), treina cada agente com base de conhecimento e prompts, e opera vendas/atendimento 24/7 com **transbordo humano**, **CRM**, **campanhas em massa** e **integração opcional com Google Calendar**.

Modelo de negócio: assinatura **mensal (R$ 69,90)** ou **anual (R$ 297)** via AbacatePay (padrão) ou Stripe.

---

## Público e proposta de valor

| Segmento | Uso típico |
|----------|------------|
| E-commerce, infoprodutos, delivery, clínicas | Atendimento, qualificação, vendas e agendamentos no WhatsApp |
| Times comerciais pequenos | Substituir ou complementar atendentes humanos com IA + pausa manual |

**Diferenciais no produto:** múltiplos agentes/números, tipos de agente (vendedor, atendente, suporte, restaurante…), áudio via ElevenLabs, handoff inteligente, painel unificado (dashboard, conversas, CRM, campanhas).

---

## Arquitetura em uma linha

```
Landing/Checkout → Login (sessão) → Painel PHP
                         ↓
              backend/api.php (JSON + CSRF)
                         ↓
         MySQL ← webhooks (Evolution, pagamentos) → LLM + WhatsApp
```

---

## Módulos principais (features)

| Módulo | Status | Descrição |
|--------|--------|-----------|
| **Marketing / Landing** | ✅ | `index.php` — preços, FAQ, vídeo, tracking (GTM/Meta) |
| **Auth & SaaS** | ✅ | Login, sessão, CSRF, multi-tenant por `user_id` |
| **Checkout & Assinatura** | ✅ | Cadastro + AbacatePay; webhooks ativam plano; e-mails transacionais |
| **Agentes de IA** | ✅ | Wizard, blueprints, tipos, prompt mestre em camadas |
| **WhatsApp (Evolution)** | ✅ | QR, status, envio texto/áudio, webhook de mensagens |
| **Pipeline de IA** | ✅ | Inline no webhook (padrão); fila MySQL opcional (`WEBHOOK_AI_MODE`) |
| **Base de conhecimento** | ✅ | Upload PDF/TXT/CSV/DOCX, texto manual, injeção no prompt |
| **Conversas (Inbox)** | ✅ | Histórico, pausa IA, envio manual, resumo de handoff |
| **CRM** | ✅ | Kanban, tags, atividades, export CSV, sync via webhook |
| **Campanhas** | ✅ | Disparo CSV, agendamento, cron `cron_campaigns.php` |
| **Google Calendar** | ✅ | OAuth, criação de eventos via marcador `[[GCAL_EVENT]]` |
| **Configurações** | ✅ | Chaves IA, empresa, gateways (stubs MP/PagSeguro/Cielo/Efi) |
| **i18n** | ⚠️ Parcial | PT-BR / ES / EN no app; landing/checkout fixos em PT-BR |
| **Stripe** | ✅ Paralelo | Webhook + success; AbacatePay é o fluxo principal no checkout |

---

## Integrações externas

- **Evolution API** — WhatsApp (instâncias, webhook, envio)
- **OpenRouter** — motor LLM principal (modelos configuráveis)
- **OpenAI / Gemini** — chaves por usuário em `settings`
- **ElevenLabs** — TTS para respostas em áudio
- **Google Calendar** — OAuth 2.0
- **AbacatePay** — assinaturas BR
- **Stripe** — assinaturas (alternativo)
- **SMTP** — e-mails de ciclo de assinatura

---

## Pontos de atenção (técnicos)

1. **`process_ai_queue.php` ausente** — com `WEBHOOK_AI_MODE=queue`, jobs em `auvvo_ai_jobs` podem não ser consumidos.
2. **Dois pipelines de IA** — `ai_reply.inc.php` (inline) vs `webhook_ai_pipeline.inc.php` (workers async).
3. **Evolution: credenciais globais vs por usuário** — campanhas usam `settings` do usuário; webhook usa constantes `.env`.
4. **WhatsApp não oficial** — QR Code (WhatsApp Web), não API Meta Business; riscos documentados no FAQ/termos.
5. **Conversas sem tempo real** — snapshot no load; badge “2” na sidebar é estático.
6. **`conhecimento.php`** — existe mas não está no menu lateral (fluxo principal em Agentes).

---

## Estrutura de pastas (resumo)

| Pasta / arquivo | Papel |
|-----------------|--------|
| `*.php` (raiz) | Páginas públicas e do painel |
| `includes/` | Auth, i18n, sidebar, marketing |
| `backend/` | API, DB, webhooks, workers, pagamentos, mail |
| `lang/` | Traduções |
| `uploads/` | CSV campanhas, arquivos de conhecimento |
| `style.css` / `app.css` | Marketing vs painel |
| `design.json` | Design system (glassmorphism escuro) |

---

## Próximos passos sugeridos (produto/engenharia)

- Documentar ou implementar consumidor da fila `auvvo_ai_jobs`
- Unificar credenciais Evolution (global vs tenant)
- Polling/WebSocket no inbox de conversas
- Completar i18n (landing, CRM, wizard de agentes)
- Adicionar `conhecimento.php` à navegação ou deprecar rota órfã
- Versionar schema SQL (migrations)

---

**Documentação:**

| Doc | Uso |
|-----|-----|
| [README.md](./README.md) | Índice de toda a documentação |
| [DOCUMENTACAO.md](./DOCUMENTACAO.md) | Estado atual do código (as-is) |
| [ROADMAP.md](./ROADMAP.md) | Plano 12 semanas, épicos e critérios de aceite |
| [ARQUITETURA-ALVO.md](./ARQUITETURA-ALVO.md) | Arquitetura fila + worker Node |
| [MATRIZ-VALIDACAO.md](./MATRIZ-VALIDACAO.md) | Checklist QA/UAT por fase |
| [SCHEMA-EVOLUCAO.md](./SCHEMA-EVOLUCAO.md) | Migrações SQL |
| [KNOWN-ISSUES.md](./KNOWN-ISSUES.md) | Baseline de bugs conhecidos (Fase 0) |
