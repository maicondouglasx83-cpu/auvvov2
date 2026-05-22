# Evolução de schema — Auvvo v2

Migrações planejadas para o [ROADMAP](./ROADMAP.md). Aplicar em ordem. **Backup do banco antes de cada fase.**

Banco padrão: `Auvvo_saas` (ou valor de `DB_NAME` no `.env`).

---

## Migração 001 — Fila IA (Fase 1)

Estende `auvvo_ai_jobs` (hoje criada em runtime por `ai_queue.inc.php`).

```sql
-- Se a tabela já existir, usar ALTER abaixo.
-- Se não existir, CREATE completo:

CREATE TABLE IF NOT EXISTS auvvo_ai_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agent_id INT UNSIGNED NOT NULL,
    pending_log_id INT UNSIGNED NULL,
    canonical_jid VARCHAR(255) NOT NULL,
    remote_jid VARCHAR(255) NOT NULL,
    peer_digits VARCHAR(32) NOT NULL DEFAULT '',
    body MEDIUMTEXT NOT NULL,
    evolution_instance_label VARCHAR(255) NOT NULL DEFAULT '',
    lock_peer VARCHAR(64) NOT NULL DEFAULT '',
    dedupe_key VARCHAR(128) NOT NULL,
    trace_id VARCHAR(32) NOT NULL DEFAULT '',
    status ENUM('debouncing','pending','processing','done','failed') NOT NULL DEFAULT 'debouncing',
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    last_error VARCHAR(500) NULL,
    flush_at DATETIME NULL COMMENT 'debounce: processar após este horário',
    next_retry_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_agent_dedupe (agent_id, dedupe_key),
    KEY idx_worker_pick (status, flush_at, id),
    KEY idx_agent_peer (agent_id, lock_peer, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Se tabela antiga sem debouncing/flush_at:
ALTER TABLE auvvo_ai_jobs
    MODIFY COLUMN status ENUM('debouncing','pending','processing','done','failed') NOT NULL DEFAULT 'debouncing',
    ADD COLUMN IF NOT EXISTS flush_at DATETIME NULL AFTER last_error,
    ADD COLUMN IF NOT EXISTS next_retry_at DATETIME NULL AFTER flush_at;

-- MySQL < 8.0.12 não tem IF NOT EXISTS em ADD COLUMN — executar manualmente se falhar:
-- ALTER TABLE auvvo_ai_jobs ADD COLUMN flush_at DATETIME NULL;
-- ALTER TABLE auvvo_ai_jobs ADD COLUMN next_retry_at DATETIME NULL;
```

---

## Migração 002 — Rate limit buckets (Fase 1)

```sql
CREATE TABLE IF NOT EXISTS auvvo_rate_buckets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bucket_key VARCHAR(128) NOT NULL COMMENT 'ex: ai_peer:{agent_id}:{lock_peer}',
    window_start DATETIME NOT NULL,
    hit_count INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bucket_window (bucket_key, window_start),
    KEY idx_cleanup (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Migração 003 — Resumo de conversa (Fase 2)

```sql
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agent_id INT UNSIGNED NOT NULL,
    contact_jid VARCHAR(255) NOT NULL,
    summary_text MEDIUMTEXT NOT NULL,
    turn_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_summarized_log_id INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_agent_contact (agent_id, contact_jid),
    KEY idx_agent (agent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Migração 004 — Memória CRM + loss reason (Fase 2)

```sql
-- contacts: garantir colunas (ajustar se já existirem com outro tipo)
ALTER TABLE contacts
    ADD COLUMN memory_json JSON NULL COMMENT 'Fatos estáveis extraídos pela IA' AFTER custom_fields;

ALTER TABLE contacts
    ADD COLUMN loss_reason VARCHAR(255) NULL AFTER stage,
    ADD COLUMN lost_at DATETIME NULL AFTER loss_reason;
```

---

## Migração 005 — Pipelines CRM (Fase 2 parcial / Fase 3)

```sql
CREATE TABLE IF NOT EXISTS crm_pipelines (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pipeline_id INT UNSIGNED NOT NULL,
    slug VARCHAR(64) NOT NULL,
    label VARCHAR(120) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_won TINYINT(1) NOT NULL DEFAULT 0,
    is_lost TINYINT(1) NOT NULL DEFAULT 0,
    UNIQUE KEY uq_pipeline_slug (pipeline_id, slug),
    KEY idx_pipeline (pipeline_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE contacts
    ADD COLUMN pipeline_id INT UNSIGNED NULL AFTER user_id,
    ADD COLUMN stage_id INT UNSIGNED NULL AFTER pipeline_id;
```

*Seed inicial: um pipeline "Vendas" com estágios `new`, `contacted`, `qualified`, `proposal`, `won`, `lost`.*

---

## Migração 006 — Fila de campanhas (Fase 1 — worker Node)

```sql
CREATE TABLE IF NOT EXISTS campaign_send_queue (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT UNSIGNED NOT NULL,
    phone VARCHAR(32) NOT NULL,
    name VARCHAR(255) NULL,
    message_rendered TEXT NOT NULL,
    status ENUM('pending','processing','sent','failed') NOT NULL DEFAULT 'pending',
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    last_error VARCHAR(500) NULL,
    scheduled_at DATETIME NULL,
    sent_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_campaign_status (campaign_id, status),
    KEY idx_scheduled (status, scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Migração 007 — Webhooks inbound (Fase 3)

```sql
CREATE TABLE IF NOT EXISTS inbound_webhooks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    secret_token VARCHAR(64) NOT NULL,
    url_slug VARCHAR(64) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_slug (url_slug),
    KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inbound_webhook_field_maps (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    webhook_id INT UNSIGNED NOT NULL,
    json_path VARCHAR(255) NOT NULL COMMENT 'ex: buyer.email',
    crm_field VARCHAR(64) NOT NULL COMMENT 'email, phone, name, tag',
    KEY idx_webhook (webhook_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inbound_webhook_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    webhook_id INT UNSIGNED NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    status ENUM('ok','ignored','error') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_dedupe (webhook_id, payload_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Migração 008 — Automações de pipeline (Fase 3)

```sql
CREATE TABLE IF NOT EXISTS crm_automations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    pipeline_id INT UNSIGNED NULL,
    trigger_type ENUM('stage_enter','stage_leave','tag_added') NOT NULL,
    trigger_value VARCHAR(64) NOT NULL,
    action_type ENUM('send_whatsapp','add_tag','pause_ai','assign_owner') NOT NULL,
    action_config JSON NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Migração 009 — Eventos para SSE (Fase 2)

```sql
CREATE TABLE IF NOT EXISTS conversation_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    agent_id INT UNSIGNED NOT NULL,
    contact_jid VARCHAR(255) NOT NULL,
    event_type ENUM('message_in','message_out','handoff','ia_paused','ia_resumed') NOT NULL,
    payload JSON NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_user_created (user_id, id),
    KEY idx_contact (agent_id, contact_jid, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Versionamento

| Versão schema | Fase roadmap | Arquivo |
|---------------|--------------|---------|
| v1.1 | Fase 1 | 001, 002, 006 |
| v1.2 | Fase 2 | 003, 004, 009 |
| v1.3 | Fase 2–3 | 005 |
| v1.4 | Fase 3 | 007, 008 |

Registrar em `settings` global ou arquivo `schema_version.txt` no deploy.

---

*Validação pós-migração: [MATRIZ-VALIDACAO.md](./MATRIZ-VALIDACAO.md)*
