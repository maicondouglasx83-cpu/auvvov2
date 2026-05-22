import { createHmac } from 'crypto';
import { workerHmacSecret, internalApiUrl } from './config.js';

function sign(body) {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', workerHmacSecret()).update(`${ts}.${body}`).digest('hex');
  return { ts, sig };
}

export async function processAiJob(jobId) {
  const body = JSON.stringify({ job_id: jobId });
  const { ts, sig } = sign(body);
  const url = internalApiUrl('backend/internal/process_ai_job.php');
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
  return { status: res.status, data };
}
