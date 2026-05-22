# Documentação Auvvo v2

Hub central do projeto. Use estes documentos para onboarding, planejamento e validação — **sem depender do histórico de chat**.

---

## Índice de documentos

| Documento | Para quem | Conteúdo |
|-----------|-----------|----------|
| [**BRIEF.md**](./BRIEF.md) | Produto / stakeholders | Resumo executivo, módulos atuais, riscos |
| [**DOCUMENTACAO.md**](./DOCUMENTACAO.md) | Engenharia | Estado **atual** do código (as-is) |
| [**ROADMAP.md**](./ROADMAP.md) | Produto + Engenharia | Plano completo 12 semanas, fases, épicos, critérios de aceite |
| [**ARQUITETURA-ALVO.md**](./ARQUITETURA-ALVO.md) | Engenharia | Arquitetura to-be (fila, Node worker, debounce) |
| [**SCHEMA-EVOLUCAO.md**](./SCHEMA-EVOLUCAO.md) | Engenharia / DB | Migrações SQL planejadas |
| [**MATRIZ-VALIDACAO.md**](./MATRIZ-VALIDACAO.md) | QA / UAT | Checklist por feature (regressão + novas) |
| [**IMPLEMENTACAO.md**](./IMPLEMENTACAO.md) | Deploy | O que foi implementado + como subir o worker |
| [**KNOWN-ISSUES.md**](./KNOWN-ISSUES.md) | QA | Baseline / issues resolvidos |

---

## Como usar este pacote

### Iniciando uma fase do roadmap

1. Ler a fase em [ROADMAP.md](./ROADMAP.md) (épicos + dependências).
2. Conferir arquitetura em [ARQUITETURA-ALVO.md](./ARQUITETURA-ALVO.md).
3. Aplicar SQL de [SCHEMA-EVOLUCAO.md](./SCHEMA-EVOLUCAO.md) se houver migração.
4. Implementar tarefas do épico.
5. Marcar itens em [MATRIZ-VALIDACAO.md](./MATRIZ-VALIDACAO.md) antes de considerar a fase **concluída**.

### Validando que nada quebrou

- **Regressão:** seção "Estado atual (baseline)" em [MATRIZ-VALIDACAO.md](./MATRIZ-VALIDACAO.md).
- **Novo comportamento:** seção da fase correspondente no mesmo arquivo.

### Comparando código vs documentação

- **As-is:** [DOCUMENTACAO.md](./DOCUMENTACAO.md) + [BRIEF.md](./BRIEF.md).
- **To-be:** [ROADMAP.md](./ROADMAP.md) + [ARQUITETURA-ALVO.md](./ARQUITETURA-ALVO.md).

Quando o código mudar, atualizar **DOCUMENTACAO** (estado atual) e marcar épicos em **ROADMAP** como concluídos.

---

## Convenções

| Símbolo | Significado |
|---------|-------------|
| P0 | Bloqueador / obrigatório para escala |
| P1 | Alto impacto na operação ou receita |
| P2 | Crescimento comercial |
| P3 | Diferencial competitivo (pode adiar) |
| ✅ | Implementado e validado |
| 🔄 | Em progresso |
| ⏳ | Planejado |
| ⚠️ | Débito técnico conhecido |

---

## Visão do programa (uma linha)

**Fase 0–1:** Isolar borda (fila) + worker Node contínuo + proteções (debounce, rate limit).  
**Fase 2:** Inbox tempo real + contexto compactado + CRM enriquecido.  
**Fase 3:** Integrações e automações comerciais.

Cronograma detalhado: [ROADMAP.md](./ROADMAP.md).
