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

    // 2. Create RHUs dynamically for Nagcarlan
    console.log('2. Creating 50 RHUs (Leaving 2 empty gaps)');
    const allBarangays = [
      "Abo", "Alibungbungan", "Alumbrado", "Balayong", "Balimbing", "Balinacon", "Bambang", "Banago", "Banca-banca", "Bangcuro", "Banilad", "Bayaquitos", "Buboy", "Buenavista", "Buhanginan", "Bukal", "Bunga", "Cabuyew", "Calumpang", "Kanluran Kabubuhayan", "Silangan Kabubuhayan", "Labangan", "Lawaguin", "Kanluran Lazaan", "Silangan Lazaan", "Lagulo", "Maiit", "Malaya", "Malinao", "Manaol", "Maravilla", "Nagcalbang", "Poblacion II", "Poblacion III", "Oples", "Palayan", "Palina", "Sabang", "San Francisco", "Sibulan", "Silangan Napapatid", "Silangan Ilaya", "Sinipian", "Santa Lucia", "Talahib", "Talangan", "Taytay", "Tipacan", "Wakat", "Yukos"
      // Skipped: "Poblacion I", "Sulsuguin" to simulate gaps/uncovered RHUs
    ];

    const rhus = await db.insert(schema.rhuTable).values(
      allBarangays.map((barangay, i) => ({
        id: crypto.randomUUID(),
        name: `${barangay} Health Center`,
        barangay,
        municipalityId,
        // Approximate varying coordinates around Nagcarlan center
        lat: 14.1500 + (Math.random() - 0.5) * 0.05,
        lng: 121.4100 + (Math.random() - 0.5) * 0.05,
      }))
    ).returning();
    const rhuId = rhus[0].id; // Retained for terminal output
    console.log(`   ✅ 50 RHUs created.\n`);

    // 3. Create Users (MHO and 50 Nurses)
    console.log('3. Creating Users (MHO & 50 Nurses)');
    const mhoRes = await db.insert(schema.usersTable).values({
      email: 'mho.nagcarlan@example.com',
      name: 'Dr. Maria Clara (MHO Nagcarlan)',
      role: 'mho',
      municipalityId,
    }).returning();
    const mhoId = mhoRes[0].id;

    // chunk nurse insertion to avoid Drizzle params limit
    const nurses = [];
    const chunkSize = 20;
    for (let i = 0; i < rhus.length; i += chunkSize) {
      const chunk = rhus.slice(i, i + chunkSize);
      const inserted = await db.insert(schema.usersTable).values(
        chunk.map((r, index) => ({
          email: `nurse.${r.id.slice(0, 8)}@example.com`,
          name: `Nurse ${r.barangay}`,
          role: 'nurse' as const,
          rhuId: r.id,
          municipalityId,
        }))
      ).returning();
      nurses.push(...inserted);
    }
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
    console.log('5. Injecting Procedural Telemetry for 50 distinct RHUs');
    
    // Timeframes
    const dayMinus14 = new Date(); dayMinus14.setDate(dayMinus14.getDate() - 14);
    const dayMinus10 = new Date(); dayMinus10.setDate(dayMinus10.getDate() - 10); 
    const dayMinus1 = new Date(); dayMinus1.setDate(dayMinus1.getDate() - 1); 

    for (let i = 0; i < rhus.length; i++) {
        const rhu = rhus[i];
        const nurse = nurses[i];
        const isSilent = i % 10 === 0; // 10% silent
        const isCritical = i % 7 === 0; // ~14% critical
        const isWarning = i % 5 === 0 && !isCritical; // ~20% warning
        
        let amoxVelocity = Math.floor(Math.random() * 40) + 10; 
        let amoxInitial = amoxVelocity * 13 + (isCritical ? 50 : (isWarning ? 300 : 2000));
        
        let paraVelocity = Math.floor(Math.random() * 80) + 20; 
        let paraInitial = paraVelocity * 13 + (isWarning ? 600 : 4000);
        
        const startDay = isSilent ? dayMinus14 : dayMinus14;
        const endDay = isSilent ? dayMinus10 : dayMinus1;
        const daysDiff = isSilent ? 4 : 13;
        
        const amoxEnd = Math.max(0, amoxInitial - (amoxVelocity * daysDiff));
        await db.insert(schema.stockEntriesTable).values({ rhuId: rhu.id, medicineId: amoxId, nurseId: nurse.id, quantityOnHand: amoxInitial, submittedAt: startDay, syncedAt: startDay });
        await db.insert(schema.consumptionBaselinesTable).values({ rhuId: rhu.id, medicineId: amoxId, velocity: amoxVelocity.toFixed(4), daysRemaining: (amoxInitial / amoxVelocity).toFixed(2), lastUpdated: startDay });
        await db.insert(schema.stockEntriesTable).values({ rhuId: rhu.id, medicineId: amoxId, nurseId: nurse.id, quantityOnHand: amoxEnd, submittedAt: endDay, syncedAt: endDay });
        await db.update(schema.consumptionBaselinesTable).set({ velocity: amoxVelocity.toFixed(4), daysRemaining: (amoxEnd / amoxVelocity).toFixed(2), lastUpdated: endDay }).where(and(eq(schema.consumptionBaselinesTable.medicineId, amoxId), eq(schema.consumptionBaselinesTable.rhuId, rhu.id)));
        
        const paraEnd = Math.max(0, paraInitial - (paraVelocity * daysDiff));
        await db.insert(schema.stockEntriesTable).values({ rhuId: rhu.id, medicineId: paracetamolId, nurseId: nurse.id, quantityOnHand: paraInitial, submittedAt: startDay, syncedAt: startDay });
        await db.insert(schema.consumptionBaselinesTable).values({ rhuId: rhu.id, medicineId: paracetamolId, velocity: paraVelocity.toFixed(4), daysRemaining: (paraInitial / paraVelocity).toFixed(2), lastUpdated: startDay });
        await db.insert(schema.stockEntriesTable).values({ rhuId: rhu.id, medicineId: paracetamolId, nurseId: nurse.id, quantityOnHand: paraEnd, submittedAt: endDay, syncedAt: endDay });
        await db.update(schema.consumptionBaselinesTable).set({ velocity: paraVelocity.toFixed(4), daysRemaining: (paraEnd / paraVelocity).toFixed(2), lastUpdated: endDay }).where(and(eq(schema.consumptionBaselinesTable.medicineId, paracetamolId), eq(schema.consumptionBaselinesTable.rhuId, rhu.id)));
    }

    console.log('   ✅ 50 Dense Data Profiles procedurally seeded (Critical, Healthy, Warning, Silent clusters mapping correctly)\n');

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
      quantityOnHand: 400, 
      submittedAt: new Date().toISOString()
    }, null, 2));

  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await client.end();
  }
}

seed();
