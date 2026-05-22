import dotenv from 'dotenv';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, '..', '.env') });
dotenv.config({ path: join(__dir, '..', '..', '.env') });

export const config = {
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_NAME || 'Auvvo_saas',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
  },
  appBaseUrl: (process.env.APP_BASE_URL || 'http://localhost').replace(/\/$/, ''),
  httpPrefix: (process.env.APP_HTTP_PREFIX || process.env.APP_HTTP_PATH || '').replace(/^\/|\/$/g, ''),
  pollMs: Math.max(100, parseInt(process.env.WORKER_POLL_MS || '300', 10)),
  maxAttempts: Math.max(1, parseInt(process.env.WORKER_AI_MAX_ATTEMPTS || '3', 10)),
  campaignPerMinute: Math.max(1, parseInt(process.env.CAMPAIGN_MSGS_PER_MINUTE || '12', 10)),
};

export function workerHmacSecret() {
  const material = [
    'auvvo-internal-worker-v1',
    config.db.password,
    config.db.user,
    config.db.database,
    config.db.host,
    config.appBaseUrl,
  ].join('\x1e');
  return createHash('sha256').update(material).digest('hex');
}

/** Mesma lógica que app_http_url() no PHP. */
export function internalApiUrl(relativePath) {
  const path = relativePath.replace(/^\//, '');
  if (config.httpPrefix) {
    return `${config.appBaseUrl}/${config.httpPrefix}/${path}`;
  }
  return `${config.appBaseUrl}/${path}`;
}
