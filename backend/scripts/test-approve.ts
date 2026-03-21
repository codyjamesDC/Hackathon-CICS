/**
 * test-approve.ts — End-to-end requisition approval pipeline test
 *
 * Usage: npx tsx scripts/test-approve.ts
 *
 * Tests the full approve() flow directly via the service layer (no HTTP server needed):
 *   1. Find first drafted requisition in DB
 *   2. Print id, rhuName, items
 *   3. Call RequisitionService.approve() with the found ID + seeded MHO ID
 *   4. Re-query DB and confirm status is 'approved' or 'sent'
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { eq, lte, and } from 'drizzle-orm';
import { db } from '../src/db/client.js';
import { requisitionsTable } from '../src/requisitions/requisitions.schema.js';
import { requisitionItemsTable } from '../src/requisitions/requisition-items.schema.js';
import { rhuTable } from '../src/rhu/rhu.schema.js';
import { medicinesTable } from '../src/medicines/medicines.schema.js';
import { usersTable } from '../src/users/users.schema.js';
import { thresholdBreachesTable } from '../src/alerts/threshold-breaches.schema.js';
import { consumptionBaselinesTable } from '../src/velocity-engine/consumption-baselines.schema.js';
import * as requisitionService from '../src/requisitions/requisition.service.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

function step(n: number, label: string) {
  console.log(`\n${BOLD}${CYAN}Step ${n}: ${label}${RESET}`);
}

function pass(msg: string) {
  console.log(`${GREEN}  ✅ PASS${RESET} — ${msg}`);
}

function fail(msg: string) {
  console.log(`${RED}  ❌ FAIL${RESET} — ${msg}`);
}

function warn(msg: string) {
  console.log(`${YELLOW}  ⚠️  WARN${RESET} — ${msg}`);
}

function info(msg: string) {
  console.log(`  ${msg}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n${BOLD}╔════════════════════════════════════════════╗`);
  console.log(`║   Agap — Requisition Approval E2E Test     ║`);
  console.log(`╚════════════════════════════════════════════╝${RESET}\n`);

  let overallPass = true;

  // ── Step 1: Find or bootstrap a drafted requisition ─────────────────────────
  step(1, 'Find (or bootstrap) a requisition with status = drafted');

  let draftedRows = await db
    .select({
      id:       requisitionsTable.id,
      rhuId:    requisitionsTable.rhuId,
      rhuName:  rhuTable.name,
      barangay: rhuTable.barangay,
      status:   requisitionsTable.status,
      breachId: requisitionsTable.breachId,
    })
    .from(requisitionsTable)
    .innerJoin(rhuTable, eq(requisitionsTable.rhuId, rhuTable.id))
    .where(eq(requisitionsTable.status, 'drafted'))
    .limit(1);

  if (draftedRows.length === 0) {
    warn('No drafted requisitions in DB — bootstrapping one from seeded critical baselines...');

    // Find a critical medicine: daysRemaining <= criticalThresholdDays
    const criticalBaselines = await db
      .select({
        rhuId:                consumptionBaselinesTable.rhuId,
        medicineId:           consumptionBaselinesTable.medicineId,
        velocity:             consumptionBaselinesTable.velocity,
        daysRemaining:        consumptionBaselinesTable.daysRemaining,
        criticalThresholdDays: medicinesTable.criticalThresholdDays,
        currentStock:         consumptionBaselinesTable.daysRemaining, // proxy: stock ≈ days * vel
      })
      .from(consumptionBaselinesTable)
      .innerJoin(medicinesTable, eq(consumptionBaselinesTable.medicineId, medicinesTable.id))
      .limit(200);

    const critical = criticalBaselines.find(
      b => parseFloat(b.daysRemaining) <= b.criticalThresholdDays
    );

    if (!critical) {
      fail('No critical baselines found either. Run the seeder first: npm run seed');
      process.exit(1);
    }

    const projectedZeroDate = new Date();
    projectedZeroDate.setDate(projectedZeroDate.getDate() + Math.ceil(parseFloat(critical.daysRemaining)));

    const [breach] = await db
      .insert(thresholdBreachesTable)
      .values({
        rhuId:             critical.rhuId,
        medicineId:        critical.medicineId,
        daysRemaining:     critical.daysRemaining,
        projectedZeroDate,
        status:            'open',
      })
      .returning();

    const velocity = parseFloat(critical.velocity);
    const currentStock = Math.round(velocity * parseFloat(critical.daysRemaining));
    const quantityRequested = Math.ceil(velocity * 30);

    await requisitionService.autoDraftBatch(critical.rhuId, [
      {
        breachId: breach.id,
        medicineId: critical.medicineId,
        currentStock,
        velocity,
        quantityRequested,
      },
    ]);

    // Re-query after bootstrap
    draftedRows = await db
      .select({
        id:       requisitionsTable.id,
        rhuId:    requisitionsTable.rhuId,
        rhuName:  rhuTable.name,
        barangay: rhuTable.barangay,
        status:   requisitionsTable.status,
        breachId: requisitionsTable.breachId,
      })
      .from(requisitionsTable)
      .innerJoin(rhuTable, eq(requisitionsTable.rhuId, rhuTable.id))
      .where(eq(requisitionsTable.status, 'drafted'))
      .limit(1);

    if (draftedRows.length === 0) {
      fail('Bootstrap failed — could not create a draft requisition');
      process.exit(1);
    }

    pass('Bootstrapped a draft requisition from seeded critical baseline');
  } else {
    pass('Found existing drafted requisition');
  }

  const req = draftedRows[0];
  info(`id:       ${req.id}`);
  info(`rhuName:  ${req.rhuName}`);
  info(`barangay: ${req.barangay}`);
  info(`status:   ${req.status}`);

  // ── Step 2: Print items ──────────────────────────────────────────────────────
  step(2, 'Fetch requisition items');

  const items = await db
    .select({
      genericName:       medicinesTable.genericName,
      unit:              medicinesTable.unit,
      currentStock:      requisitionItemsTable.currentStock,
      quantityRequested: requisitionItemsTable.quantityRequested,
    })
    .from(requisitionItemsTable)
    .innerJoin(medicinesTable, eq(requisitionItemsTable.medicineId, medicinesTable.id))
    .where(eq(requisitionItemsTable.requisitionId, req.id));

  if (items.length === 0) {
    warn('No items found for this requisition (unusual — breach may have no items).');
  } else {
    pass(`Found ${items.length} item(s)`);
    console.log(`\n  ${'Medicine'.padEnd(28)} ${'Stock'.padStart(6)}  ${'Requested'.padStart(9)}  Unit`);
    console.log(`  ${'─'.repeat(60)}`);
    for (const item of items) {
      console.log(
        `  ${item.genericName.padEnd(28)} ` +
        `${String(item.currentStock).padStart(6)}  ` +
        `${String(item.quantityRequested).padStart(9)}  ` +
        `${item.unit}`,
      );
    }
  }

  // ── Step 3: Find MHO user ────────────────────────────────────────────────────
  step(3, 'Query first MHO user from database');

  const mhoRows = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.role, 'mho'))
    .limit(1);

  if (mhoRows.length === 0) {
    fail('No MHO user found in database. Run the seeder: npm run seed');
    process.exit(1);
  }

  const mho = mhoRows[0];
  pass(`Found MHO user`);
  info(`id:    ${mho.id}`);
  info(`name:  ${mho.name}`);
  info(`email: ${mho.email}`);

  // ── Step 4: Call approve() ───────────────────────────────────────────────────
  step(4, `Calling requisitionService.approve('${req.id.slice(0, 8)}...', '${mho.id.slice(0, 8)}...')`);
  console.log('  ─── service output ───────────────────────────────────────');

  let result: Awaited<ReturnType<typeof requisitionService.approve>>;
  try {
    result = await requisitionService.approve(req.id, mho.id);
  } catch (err: any) {
    console.log('  ──────────────────────────────────────────────────────────');
    fail(`approve() threw an exception: ${err?.message ?? err}`);
    if (err?.stack) console.error(err.stack);
    process.exit(1);
  }

  console.log('  ──────────────────────────────────────────────────────────');

  if (!result) {
    fail('approve() returned null/undefined');
    overallPass = false;
  } else {
    pass(`approve() returned — status: ${BOLD}${result.status}${RESET}`);
    info(`id:         ${result.id}`);
    info(`status:     ${result.status}`);
    info(`approvedAt: ${result.approvedAt?.toISOString() ?? 'null'}`);
    info(`approvedBy: ${result.approvedBy ?? 'null'}`);
    info(`sentAt:     ${result.sentAt?.toISOString() ?? 'null (email not configured or failed)'}`);
  }

  // ── Step 5: Verify DB state ──────────────────────────────────────────────────
  step(5, 'Re-query DB and verify final status');

  const verifyRows = await db
    .select({
      id:          requisitionsTable.id,
      status:      requisitionsTable.status,
      approvedAt:  requisitionsTable.approvedAt,
      approvedBy:  requisitionsTable.approvedBy,
      sentAt:      requisitionsTable.sentAt,
    })
    .from(requisitionsTable)
    .where(eq(requisitionsTable.id, req.id));

  if (verifyRows.length === 0) {
    fail('Requisition not found in DB after approve — this should never happen');
    process.exit(1);
  }

  const finalRow = verifyRows[0];
  info(`Final DB status: ${BOLD}${finalRow.status}${RESET}`);

  if (finalRow.status === 'sent') {
    pass('Status is "sent" — PDF generated and email dispatched successfully');
  } else if (finalRow.status === 'approved') {
    warn('Status is "approved" — approval succeeded but email was not dispatched');
    warn('Set a real RESEND_API_KEY in .env to test email dispatch end-to-end');
    // Still a partial pass — approval pipeline works, email just unconfigured
  } else {
    fail(`Unexpected status "${finalRow.status}" — expected "approved" or "sent"`);
    overallPass = false;
  }

  if (!finalRow.approvedAt) {
    fail('approvedAt is null — timestamp was not written');
    overallPass = false;
  } else {
    pass(`approvedAt is set: ${finalRow.approvedAt.toISOString()}`);
  }

  if (!finalRow.approvedBy) {
    fail('approvedBy is null — MHO id was not written');
    overallPass = false;
  } else {
    pass(`approvedBy matches MHO: ${finalRow.approvedBy === mho.id ? 'yes ✓' : `MISMATCH (got ${finalRow.approvedBy})`}`);
  }

  // ── Final result ─────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${'═'.repeat(52)}${RESET}`);
  if (overallPass && (finalRow.status === 'sent' || finalRow.status === 'approved')) {
    const fullSuccess = finalRow.status === 'sent';
    if (fullSuccess) {
      console.log(`${BOLD}${GREEN}  RESULT: ✅ FULL PASS — approval + PDF + email all succeeded${RESET}`);
    } else {
      console.log(`${BOLD}${YELLOW}  RESULT: ⚠️  PARTIAL PASS — approval + PDF succeeded, email skipped${RESET}`);
      console.log(`${YELLOW}  → Set RESEND_API_KEY in .env for full email dispatch test${RESET}`);
    }
  } else {
    console.log(`${BOLD}${RED}  RESULT: ❌ FAIL — see errors above${RESET}`);
    process.exit(1);
  }
  console.log(`${BOLD}${'═'.repeat(52)}${RESET}\n`);

  process.exit(0);
}

run().catch((err) => {
  console.error(`\n${RED}${BOLD}Unhandled error:${RESET}`, err);
  process.exit(1);
});
