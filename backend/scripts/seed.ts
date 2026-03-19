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

    // 1. Create Municipality
    console.log('1. Creating Municipality (San Juan)');
    const municipalityRes = await db.insert(schema.municipalitiesTable).values({
      name: 'San Juan',
      province: 'Batangas',
    }).returning();
    const municipalityId = municipalityRes[0].id;
    console.log(`   ✅ Municipality ID: ${municipalityId}\n`);

    // 2. Create RHU
    console.log('2. Creating RHU (San Juan Main RHU)');
    const rhuRes = await db.insert(schema.rhuTable).values({
      name: 'San Juan Main RHU',
      barangay: 'Poblacion',
      municipalityId,
      lat: 13.8247,
      lng: 121.3986,
    }).returning();
    const rhuId = rhuRes[0].id;
    console.log(`   ✅ RHU ID: ${rhuId}\n`);

    // 3. Create Users (MHO and Nurse)
    console.log('3. Creating Users (MHO & Nurse)');
    const mhoRes = await db.insert(schema.usersTable).values({
      email: 'mho.sanjuan@example.com',
      name: 'Dr. Maria Clara (MHO)',
      role: 'mho',
      municipalityId,
    }).returning();
    const mhoId = mhoRes[0].id;

    const nurseRes = await db.insert(schema.usersTable).values({
      email: 'nurse.sanjuan@example.com',
      name: 'Juan Dela Cruz (Nurse)',
      role: 'nurse',
      rhuId,
      municipalityId,
    }).returning();
    const nurseId = nurseRes[0].id;
    console.log(`   ✅ MHO ID: ${mhoId}`);
    console.log(`   ✅ Nurse ID: ${nurseId}\n`);

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
    // We want to simulate a scenario where Amoxicillin is depleting fast,
    // and Paracetamol is stable.
    console.log('5. Creating Historical Stock Entries (simulating past 2 weeks)');
    
    // Day -14 (Two weeks ago)
    const dayMinus14 = new Date();
    dayMinus14.setDate(dayMinus14.getDate() - 14);

    // Day -7 (One week ago)
    const dayMinus7 = new Date();
    dayMinus7.setDate(dayMinus7.getDate() - 7);

    // Initial stock (Day -14)
    await db.insert(schema.stockEntriesTable).values([
      {
        rhuId,
        medicineId: amoxId,
        nurseId,
        quantityOnHand: 2000,
        submittedAt: dayMinus14,
        syncedAt: dayMinus14,
      },
      {
        rhuId,
        medicineId: paracetamolId,
        nurseId,
        quantityOnHand: 5000,
        submittedAt: dayMinus14,
        syncedAt: dayMinus14,
      }
    ]);
    
    // We need to bypass the velocity engine to insert these historical baselines directly
    // since the velocity engine expects real-time sequential processing.
    
    // Amox velocity: 50 caps / day
    await db.insert(schema.consumptionBaselinesTable).values({
      rhuId,
      medicineId: amoxId,
      velocity: '50.0000',
      daysRemaining: '40.00', // 2000 / 50
      lastUpdated: dayMinus14,
    });

    // Paracetamol velocity: 100 tabs / day
    await db.insert(schema.consumptionBaselinesTable).values({
      rhuId,
      medicineId: paracetamolId,
      velocity: '100.0000',
      daysRemaining: '50.00', // 5000 / 100
      lastUpdated: dayMinus14,
    });


    // Mid-point count (Day -7)
    await db.insert(schema.stockEntriesTable).values([
      {
        rhuId,
        medicineId: amoxId,
        nurseId,
        quantityOnHand: 1650, // Consumed 350 over 7 days = 50 / day. (Matches baseline exactly)
        submittedAt: dayMinus7,
        syncedAt: dayMinus7,
      },
      {
        rhuId,
        medicineId: paracetamolId,
        nurseId,
        quantityOnHand: 4300, // Consumed 700 over 7 days = 100 / day (Matches baseline exactly)
        submittedAt: dayMinus7,
        syncedAt: dayMinus7,
      }
    ]);

    // Update Baselines again
    await db.update(schema.consumptionBaselinesTable).set({
      velocity: '50.0000',
      daysRemaining: '33.00', // 1650 / 50
      lastUpdated: dayMinus7,
    }).where(and(eq(schema.consumptionBaselinesTable.medicineId, amoxId)));

    await db.update(schema.consumptionBaselinesTable).set({
      velocity: '100.0000',
      daysRemaining: '43.00', // 4300 / 100
      lastUpdated: dayMinus7,
    }).where(and(eq(schema.consumptionBaselinesTable.medicineId, paracetamolId)));


    console.log('   ✅ Historical data inserted. Velocity baseline established (Amox: 50/day, Para: 100/day)\n');

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
