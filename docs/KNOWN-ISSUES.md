# Known issues — baseline (Fase 0)

Preencher durante a execução da suite **A** em [MATRIZ-VALIDACAO.md](./MATRIZ-VALIDACAO.md).

| ID | Descrição | Severidade | Workaround | Plano (épico) |
|----|-----------|------------|------------|---------------|
| KI-001 | ~~`process_ai_queue.php` ausente~~ | — | Resolvido: `auvvo-worker` + `internal/process_ai_job.php` | ✅ |
| KI-002 | ~~Inline padrão~~ | — | Default `queue`; inline só em dev | ✅ |
| KI-003 | Dois pipelines IA (`ai_reply` vs `webhook_ai_pipeline`) | Média | — | ROADMAP 1.2.6 |
| KI-004 | Evolution credenciais global vs tenant | Média | Usar mesmo .env nas campanhas | ROADMAP 1.5.4 |
| KI-005 | Inbox sem tempo real | Média | F5 manual | ROADMAP 2.1 |
| KI-006 | Badge "2" estático em conversas | Baixa | Ignorar | ROADMAP 1.6.3 |
| KI-007 | `conhecimento.php` fora do menu | Baixa | Acesso via agentes | ROADMAP 2.4.1 |

---

## Registro de execução baseline

| Data | Ambiente | Executor | Passou A | Falhou | Notas |
|------|----------|----------|----------|--------|-------|
| | staging | | | | |
