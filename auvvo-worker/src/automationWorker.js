import { createHmac } from 'crypto';
import { getPool } from './db.js';
import { workerHmacSecret, internalApiUrl } from './config.js';

function sign(body) {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', workerHmacSecret()).update(`${ts}.${body}`).digest('hex');
  return { ts, sig };
}

export async function processAutomationQueue(limit = 25) {
  const pool = getPool();
  const [pendingRows] = await pool.query(
    `SELECT COUNT(*) AS c FROM crm_automation_queue WHERE status = 'pending' AND run_at <= NOW()`
  );
  const pending = Number(pendingRows[0]?.c || 0);
  if (pending === 0) {
    return { status: 200, data: { ok: true, processed: 0, pending: 0 } };
  }

  const body = JSON.stringify({ limit });
  const { ts, sig } = sign(body);
  const url = internalApiUrl('backend/internal/process_automation_queue.php');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auvvo-Timestamp': ts,
      'X-Auvvo-Signature': sig,
    },
    body,
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { ok: false, error: text.slice(0, 200) };
  }
  if (res.status !== 200 || !data.ok) {
    console.error('[auvvo-worker] automation queue', res.status, data.error || text.slice(0, 120));
  } else if ((data.processed || 0) > 0) {
    console.log('[auvvo-worker] automation queue processed', data.processed);
  }
  return { status: res.status, data };
}
