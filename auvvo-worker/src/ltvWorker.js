import { createHmac } from 'crypto';
import { workerHmacSecret, internalApiUrl } from './config.js';

let lastLtvRun = 0;
const LTV_INTERVAL_MS = 55 * 60 * 1000;

function sign(body) {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', workerHmacSecret()).update(`${ts}.${body}`).digest('hex');
  return { ts, sig };
}

export async function processLtvTriggersIfDue() {
  const now = Date.now();
  if (now - lastLtvRun < LTV_INTERVAL_MS) {
    return null;
  }
  lastLtvRun = now;

  const body = JSON.stringify({ limit: 200 });
  const { ts, sig } = sign(body);
  const url = internalApiUrl('backend/internal/process_ltv_triggers.php');
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
    console.error('[auvvo-worker] LTV scan', res.status, data.error || text.slice(0, 120));
  } else if ((data.fired || 0) > 0) {
    console.log('[auvvo-worker] LTV fired', data.fired);
  }
  return { status: res.status, data };
}
