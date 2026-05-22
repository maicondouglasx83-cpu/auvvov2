import { config } from './config.js';
import { getPool } from './db.js';
import { processOneAiJob } from './aiWorker.js';
import { processCampaignBatch } from './campaignWorker.js';
import { processAutomationQueue } from './automationWorker.js';
import { processLtvTriggersIfDue } from './ltvWorker.js';
import { touchWorkerHeartbeat } from './heartbeat.js';

console.log('[auvvo-worker] starting', {
  db: config.db.database,
  base: config.appBaseUrl,
  pollMs: config.pollMs,
  modules: ['ai_jobs', 'campaigns', 'crm_automation_queue', 'ltv_triggers'],
});

getPool()
  .query('SELECT 1')
  .then(() => console.log('[auvvo-worker] MySQL ok'))
  .catch((e) => {
    console.error('[auvvo-worker] MySQL failed', e.message);
    process.exit(1);
  });

async function tick() {
  touchWorkerHeartbeat();
  try {
    await processOneAiJob();
    await processCampaignBatch();
    await processAutomationQueue(25);
    await processLtvTriggersIfDue();
  } catch (e) {
    console.error('[auvvo-worker] tick error', e.message);
  }
  setTimeout(tick, config.pollMs);
}

tick();
