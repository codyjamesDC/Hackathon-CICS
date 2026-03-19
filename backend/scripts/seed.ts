import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../src/db/schema/index.js';

// Initialize DB connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function nukeDatabase() {
  console.log('Nuking existing data...');
  // Delete in reverse dependency order to avoid foreign key constraint errors
  await db.delete(schema.auditLogTable);
  await db.delete(schema.requisitionItemsTable);
  await db.delete(schema.requisitionsTable);
  await db.delete(schema.thresholdBreachesTable);
  await db.delete(schema.consumptionBaselinesTable);
  await db.delete(schema.stockEntriesTable);
  await db.delete(schema.medicinesTable);
  await db.delete(schema.usersTable);
  await db.delete(schema.rhuTable);
  await db.delete(schema.municipalitiesTable);
  console.log('Database cleared\n');
}

async function seed() {
  console.log('Starting Database Seeding...\n');

  try {
    await nukeDatabase();

    // 1. Create Municipality (Nagcarlan)
    console.log('1. Creating Municipality (Nagcarlan)');
    const municipalityRes = await db.insert(schema.municipalitiesTable).values({
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Nagcarlan',
      province: 'Laguna',
    }).returning();
    const municipalityId = municipalityRes[0].id;
    console.log(`   ✅ Municipality ID: ${municipalityId}\n`);

    // 2. Create RHUs
    console.log('2. Creating 8 RHUs (Balimbing, Buhanginan, Bambang, Abo, Balayong, Banago, Bayaquitos, Buenavista)');
    const rhus = await db.insert(schema.rhuTable).values([
      {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Balimbing RHU',
        barangay: 'Balimbing',
        municipalityId,
        lat: 14.1333,
        lng: 121.4167,
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        name: 'Buhanginan RHU',
        barangay: 'Buhanginan',
        municipalityId,
        lat: 14.1400,
        lng: 121.4200,
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        name: 'Bambang Clinic',
        barangay: 'Bambang',
        municipalityId,
        lat: 14.1500,
        lng: 121.4100,
      },
      {
        id: '00000000-0000-0000-0000-000000000006',
        name: 'Abo Wellness Center',
        barangay: 'Abo',
        municipalityId,
        lat: 14.1520,
        lng: 121.4140,
      },
      {
        id: '00000000-0000-0000-0000-000000000007',
        name: 'Balayong Community Center',
        barangay: 'Balayong',
        municipalityId,
        lat: 14.1480,
        lng: 121.4280,
      },
      {
        id: '00000000-0000-0000-0000-000000000008',
        name: 'Banago Health Center',
        barangay: 'Banago',
        municipalityId,
        lat: 14.1360,
        lng: 121.4390,
      },
      {
        id: '00000000-0000-0000-0000-000000000009',
        name: 'Bayaquitos RHU',
        barangay: 'Bayaquitos',
        municipalityId,
        lat: 14.1200,
        lng: 121.4500,
      },
      {
        id: '00000000-0000-0000-0000-000000000010',
        name: 'Buenavista Primary Care',
        barangay: 'Buenavista',
        municipalityId,
        lat: 14.1250,
        lng: 121.4450,
      }
    ]).returning();
    const rhuId = rhus[0].id; // Retained for terminal output specifically
    console.log(`   ✅ 8 RHUs created.\n`);

    // 3. Create Users (MHO and Nurses)
    console.log('3. Creating Users (MHO & Nurses)');
    const mhoRes = await db.insert(schema.usersTable).values({
      email: 'mho.nagcarlan@example.com',
      name: 'Dr. Maria Clara (MHO Nagcarlan)',
      role: 'mho',
      municipalityId,
    }).returning();
    const mhoId = mhoRes[0].id;

    const nurses = await db.insert(schema.usersTable).values(
      rhus.map((r, i) => ({
        email: `nurse${i+1}@example.com`,
        name: `Nurse ${r.barangay}`,
        role: 'nurse' as const,
        rhuId: r.id,
        municipalityId,
      }))
    ).returning();
    const nurseId = nurses[0].id;
    console.log(`   ✅ MHO and ${nurses.length} Nurses seeded.\n`);

    // 4. Create Medicines
    console.log('4. Creating Medicines');
    const medicinesData = [
      {
        genericName: 'Amoxicillin 500mg',
        unit: 'capsule',
        category: 'antibiotic',
        criticalThresholdDays: 7, // 1 week buffer
      },
      {
        genericName: 'Paracetamol 500mg',
        unit: 'tablet',
        category: 'analgesic',
        criticalThresholdDays: 14, // 2 weeks buffer
      },
      {
        genericName: 'Losartan 50mg',
        unit: 'tablet',
        category: 'antihypertensive',
        criticalThresholdDays: 10,
      },
      {
        genericName: 'Metformin 500mg',
        unit: 'tablet',
        category: 'antidiabetic',
        criticalThresholdDays: 7,
      }
    ];

    const medicines = await db.insert(schema.medicinesTable).values(medicinesData).returning();
    console.log(`   ✅ Created ${medicines.length} medicines.\n`);

    const amoxId = medicines.find((m) => m.genericName.includes('Amoxicillin'))!.id;
    const paracetamolId = medicines.find((m) => m.genericName.includes('Paracetamol'))!.id;


    // 5. Create Historical Stock Entries to build velocity
    console.log('5. Injecting Base Telemetry for 8 distinct RHUs');
    
    // Timeframes
    const dayMinus14 = new Date(); dayMinus14.setDate(dayMinus14.getDate() - 14);
    const dayMinus7 = new Date(); dayMinus7.setDate(dayMinus7.getDate() - 7);
    const dayMinus1 = new Date(); dayMinus1.setDate(dayMinus1.getDate() - 1); // VERY RECENT
    const dayMinus10 = new Date(); dayMinus10.setDate(dayMinus10.getDate() - 10); // STALE (Silent)

    // Helper to inject stock scenario
    async function injectScenario(rhu: any, nurse: any, medId: string, velocity: number, initialQty: number, durationDays: number, isStale: boolean) {
      const startDay = isStale ? dayMinus14 : dayMinus14;
      const endDay = isStale ? dayMinus10 : dayMinus1;
      const daysDiff = isStale ? 4 : 13;
      
      const consumed = velocity * daysDiff;
      const endQty = Math.max(0, initialQty - consumed); // Prevent negative stocks
      
      await db.insert(schema.stockEntriesTable).values({
        rhuId: rhu.id, medicineId: medId, nurseId: nurse.id,
        quantityOnHand: initialQty, submittedAt: startDay, syncedAt: startDay,
      });

      await db.insert(schema.consumptionBaselinesTable).values({
        rhuId: rhu.id, medicineId: medId,
        velocity: velocity.toFixed(4),
        daysRemaining: (initialQty / velocity).toFixed(2),
        lastUpdated: startDay,
      });

      await db.insert(schema.stockEntriesTable).values({
        rhuId: rhu.id, medicineId: medId, nurseId: nurse.id,
        quantityOnHand: endQty, submittedAt: endDay, syncedAt: endDay,
      });

      await db.update(schema.consumptionBaselinesTable).set({
        velocity: velocity.toFixed(4),
        daysRemaining: velocity > 0 ? (endQty / velocity).toFixed(2) : '999.00',
        lastUpdated: endDay,
      }).where(and(eq(schema.consumptionBaselinesTable.medicineId, medId), eq(schema.consumptionBaselinesTable.rhuId, rhu.id)));
    }

    // 1. Balimbing RHU: CRITICAL (Amox depleting very fast)
    await injectScenario(rhus[0], nurses[0], amoxId, 80, 1100, 13, false); // ~0.75 days left
    await injectScenario(rhus[0], nurses[0], paracetamolId, 20, 5000, 13, false); // Stable

    // 2. Buhanginan RHU: HEALTHY (Lots of stock)
    await injectScenario(rhus[1], nurses[1], amoxId, 30, 4000, 13, false); 
    await injectScenario(rhus[1], nurses[1], paracetamolId, 30, 4000, 13, false);

    // 3. Bambang RHU: WARNING (Amox running a bit low)
    await injectScenario(rhus[2], nurses[2], amoxId, 50, 1500, 13, false); 
    await injectScenario(rhus[2], nurses[2], paracetamolId, 100, 2300, 13, false); // 10 days left

    // 4. Abo: SILENT (No updates since 10 days ago)
    await injectScenario(rhus[3], nurses[3], amoxId, 20, 1000, 4, true); 
    await injectScenario(rhus[3], nurses[3], paracetamolId, 20, 1000, 4, true);

    // 5. Balayong: CRITICAL (Paracetamol running out fast)
    await injectScenario(rhus[4], nurses[4], amoxId, 40, 2000, 13, false); 
    await injectScenario(rhus[4], nurses[4], paracetamolId, 150, 2000, 13, false); // 2000 - 1950 = 50 left. 50/150 = 0.3 days left (< 14 CRITICAL)

    // 6. Banago: HEALTHY
    await injectScenario(rhus[5], nurses[5], amoxId, 10, 5000, 13, false); 
    await injectScenario(rhus[5], nurses[5], paracetamolId, 50, 8000, 13, false);

    // 7. Bayaquitos: WARNING (Slight spikes)
    await injectScenario(rhus[6], nurses[6], amoxId, 60, 1300, 13, false); // 1300 - 780 = 520 left. 520 / 60 = 8.6 days left (Warning >7 && <= 14? Amox threshold is 7, so > 7 is HEALTHY or near Warning. Wait amox buf=7. Actually healthy).
    await injectScenario(rhus[6], nurses[6], paracetamolId, 80, 2000, 13, false); // 2000 - 1040 = 960 left. 960 / 80 = 12 days left (Warning for para where buf=14)

    // 8. Buenavista: SILENT (Disconnected cluster)
    await injectScenario(rhus[7], nurses[7], amoxId, 15, 800, 4, true); 
    await injectScenario(rhus[7], nurses[7], paracetamolId, 40, 1500, 4, true);

    console.log('   ✅ 8 Data Profiles loaded (2 Critical, 2 Healthy, 2 Warning, 2 Silent)\n');

    console.log('====================================================');
    console.log('Seeding Complete! Ready for end-to-end testing.');
    console.log('====================================================\n');
    console.log('Test Scenario IDs (use these in Headers / Bodies):');
    console.log(`- MHO_ID:   ${mhoId}  (For GET /rhu, GET /dashboard/..., POST /requisitions/approve)`);
    console.log(`- NURSE_ID: ${nurseId}  (For POST /stock-entries)`);
    console.log(`- RHU_ID:   ${rhuId}  (For POST /stock-entries)`);
    console.log(`- MUNI_ID:  ${municipalityId}  (For GET /dashboard/heatmap)`);
    console.log(`\n- Amoxicillin ID: ${amoxId} (Threshold = 7 days)`);
    console.log(`- Paracetamol ID: ${paracetamolId} (Threshold = 14 days)\n`);

    console.log('To trigger a Threshold Breach & Requisition:');
    console.log(`POST http://localhost:3000/api/stock-entries`);
    console.log(`Headers: { "X-User-Id": "${nurseId}" }`);
    console.log(`Body:`);
    console.log(JSON.stringify({
      rhuId,
      medicineId: amoxId,
      quantityOnHand: 400, // 1650 - 400 = 1250 consumed over 7 days = 178 / day (SPIKE!)
      submittedAt: new Date().toISOString()
    }, null, 2));

  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await client.end();
  }
}

seed();
