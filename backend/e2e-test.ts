import { execSync } from 'child_process';

const BASE_URL = 'http://127.0.0.1:3000';

async function fetchApi(path: string, method = 'GET', body: any = null, headers: any = {}) {
  const options: any = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (body) options.body = JSON.stringify(body);
  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (e) { json = text; }
    return { status: res.status, data: json };
  } catch (err: any) {
    return { status: 500, data: { error: err.message } };
  }
}

async function run() {
  console.log('Running seeder to get IDs...');
  const seedOutput = execSync('npx tsx package-seed.ts').toString();
  const lines = seedOutput.split('\n');

  const extractId = (prefix: string) => {
    const line = lines.find((l: string) => l.includes(prefix));
    if (!line) throw new Error(`Could not find ID for ${prefix}`);
    return line.split(':')[1].trim().split(' ')[0];
  };

  const MHO_ID = extractId('- MHO_ID');
  const NURSE_ID = extractId('- NURSE_ID');
  const RHU_ID = extractId('- RHU_ID');
  const MUNI_ID = extractId('- MUNI_ID');
  const AMOX_ID = extractId('- Amoxicillin ID');
  const PARA_ID = extractId('- Paracetamol ID');

  const results: any[] = [];

  const check = (name: string, res: any, condition: (r: any) => boolean, expected: string, unexpected: (r: any) => string) => {
    let pass = false;
    try {
      pass = condition(res);
    } catch (err) {
      pass = false;
    }
    results.push({ name, request: expected, actual: res.status, pass, unexpected: pass ? '' : unexpected(res) });
    return pass;
  };

  // Phase 1 — Health & Static Data
  let r = await fetchApi('/health');
  check('GET /health', r, res => res.status === 200 && res.data.status === 'ok', 'status 200, connected', res => JSON.stringify(res.data));

  r = await fetchApi('/api/medicines');
  check('GET /api/medicines', r, res => res.status === 200 && Array.isArray(res.data.data) && res.data.data.length === 4, '4 medicines', res => JSON.stringify(res.data));

  r = await fetchApi(`/api/rhu?municipalityId=${MUNI_ID}`);
  check('GET /api/rhu?muni', r, res => res.status === 200 && Array.isArray(res.data.data) && res.data.data.length === 1, '1 RHU', res => JSON.stringify(res.data));

  r = await fetchApi(`/api/rhu/${RHU_ID}`);
  check('GET /api/rhu/:id', r, res => res.status === 200 && res.data.data.lat !== undefined, 'RHU details', res => JSON.stringify(res.data));

  r = await fetchApi('/api/rhu');
  check('GET /api/rhu (no param)', r, res => res.status === 400, '400 validation error', res => JSON.stringify(res.data));

  // Phase 2 — Stock Entry + Velocity Engine
  let dMinus3 = new Date(); dMinus3.setDate(dMinus3.getDate() - 3);
  r = await fetchApi('/api/stock-entries', 'POST', {
    rhuId: RHU_ID, medicineId: AMOX_ID, quantityOnHand: 1600, submittedAt: dMinus3.toISOString()
  }, { 'X-User-Id': NURSE_ID });
  check('POST /api/stock-entries (1)', r, res => res.status === 201 && res.data.velocity && res.data.velocity.breachTriggered === false, '201, breach false', res => JSON.stringify(res.data));

  r = await fetchApi('/api/stock-entries', 'POST', {
    rhuId: RHU_ID, medicineId: AMOX_ID, quantityOnHand: 400, submittedAt: new Date().toISOString()
  }, { 'X-User-Id': NURSE_ID });
  check('POST /api/stock-entries (2)', r, res => res.status === 201 && res.data.velocity && res.data.velocity.breachTriggered === true, '201, breach true', res => JSON.stringify(res.data));

  r = await fetchApi('/api/stock-entries', 'POST', { rhuId: RHU_ID }, { 'X-User-Id': NURSE_ID });
  check('POST /api/stock-entries (invalid)', r, res => res.status === 400, '400 Zod error', res => JSON.stringify(res.data));

  let dPlus1 = new Date(); dPlus1.setHours(dPlus1.getHours() + 1);
  r = await fetchApi('/api/stock-entries/batch', 'POST', {
    entries: [
      { rhuId: RHU_ID, medicineId: PARA_ID, quantityOnHand: 4000, submittedAt: new Date().toISOString() },
      { rhuId: RHU_ID, medicineId: PARA_ID, quantityOnHand: 3500, submittedAt: dPlus1.toISOString() }
    ]
  }, { 'X-User-Id': NURSE_ID });
  check('POST /api/stock-entries/batch', r, res => res.status === 201 && res.data.data.processed === 2, '201, 2 processed', res => JSON.stringify(res.data));

  r = await fetchApi(`/api/stock-entries?rhuId=${RHU_ID}`);
  check('GET /api/stock-entries?rhuId', r, res => res.status === 200 && Array.isArray(res.data.data), 'Array of entries', res => JSON.stringify(res.data));

  // Phase 3 — Dashboard
  r = await fetchApi(`/api/dashboard/heatmap?municipalityId=${MUNI_ID}`);
  check('GET /api/dashboard/heatmap', r, res => res.status === 200 && res.data.data[0].status === 'critical', 'RHU critical', res => JSON.stringify(res.data));

  r = await fetchApi(`/api/dashboard/rhu/${RHU_ID}`);
  check('GET /api/dashboard/rhu/:id', r, res => res.status === 200 && res.data.data.medicines.find((m: any) => m.medicineId === AMOX_ID).status === 'critical', 'AMOX critical', res => JSON.stringify(res.data));

  // Phase 4 — Requisitions
  r = await fetchApi(`/api/requisitions?municipalityId=${MUNI_ID}`);
  let reqId = null;
  if (r.status === 200 && r.data.data.length > 0) reqId = r.data.data[0].id;
  check('GET /api/requisitions?muni', r, res => res.status === 200 && res.data.data.length >= 1 && res.data.data[0].status === 'drafted', 'Drafted requisition', res => JSON.stringify(res.data));

  if (reqId) {
    r = await fetchApi(`/api/requisitions/${reqId}`);
    check('GET /api/requisitions/:id', r, res => res.status === 200 && res.data.data.id === reqId, 'Requisition detail', res => JSON.stringify(res.data));

    r = await fetchApi(`/api/requisitions/${reqId}/approve`, 'POST', null, { 'X-User-Id': MHO_ID });
    check('POST /api/requisitions/:id/approve', r, res => res.status === 200 && res.data.data.status === 'approved', '200 Approved', res => JSON.stringify(res.data));

    r = await fetchApi(`/api/requisitions/${reqId}/approve`, 'POST', null, { 'X-User-Id': MHO_ID });
    check('POST /api/requisitions/:id/approve (2nd)', r, res => res.status === 409, '409 Conflict', res => JSON.stringify(res.data));
  } else {
    console.error('No reqId found!');
  }

  // Phase 5 — Audit Trail
  r = await fetchApi('/api/audit/recent');
  check('GET /api/audit/recent', r, res => res.status === 200 && Array.isArray(res.data.data) && res.data.data.length > 0, 'Audit trails present', res => JSON.stringify(res.data));

  // Phase 6 — Edge Cases
  r = await fetchApi('/api/rhu/00000000-0000-0000-0000-000000000000');
  check('GET /api/rhu/{INVALID_UUID}', r, res => res.status === 404, '404 Not Found', res => JSON.stringify(res.data));

  r = await fetchApi('/api/dashboard/heatmap');
  check('GET /api/dashboard/heatmap (no muni)', r, res => res.status === 400, '400 Bad Request', res => JSON.stringify(res.data));

  r = await fetchApi('/api/stock-entries', 'POST', {
    rhuId: RHU_ID, medicineId: AMOX_ID, quantityOnHand: 5000, submittedAt: new Date().toISOString()
  }, { 'X-User-Id': NURSE_ID });
  check('POST /api/stock-entries (restock)', r, res => res.status === 201 && res.data.velocity.velocityPerDay === 0 && res.data.velocity.breachTriggered === false, '201 velocity reset', res => JSON.stringify(res.data));

  console.log('| Endpoint | Expected | Actual Status | Pass/Fail | Unexpected |');
  console.log('|---|---|---|---|---|');
  for (const res of results) {
    let unexp = res.unexpected ? '<br><code>' + res.unexpected + '</code>' : '';
    console.log(`| ${res.name} | ${res.request} | ${res.actual} | ${res.pass ? '✅ Pass' : '❌ Fail'} | ${unexp} |`);
  }
}

run().catch(console.error);
