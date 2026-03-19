import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../src/db/schema/index.js';
 
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');
 
const client = postgres(connectionString);
const db = drizzle(client, { schema });
 
async function nukeDatabase() {
  console.log('Nuking existing data...');
  await db.delete(schema.auditLogTable);
  await db.delete(schema.requisitionItemsTable);
  await db.delete(schema.requisitionsTable);
  await db.delete(schema.thresholdBreachesTable);
  await db.delete(schema.stockEntriesTable);          // FK → medicines, users, rhu
  await db.delete(schema.consumptionBaselinesTable);  // FK → medicines, rhu
  await db.delete(schema.usersTable);                 // FK → rhu, municipalities
  await db.delete(schema.medicinesTable);             // safe now
  await db.delete(schema.rhuTable);                   // FK → municipalities
  await db.delete(schema.municipalitiesTable);
  console.log('Database cleared\n');
}
 
async function seed() {
  console.log('Starting Database Seeding...\n');
 
  try {
    await nukeDatabase();
 
    // 1. Municipality
    console.log('1. Creating Municipality (Nagcarlan)');
    const [municipality] = await db.insert(schema.municipalitiesTable).values({
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Nagcarlan',
      province: 'Laguna',
    }).returning();
    const municipalityId = municipality.id;
    console.log(`   ✅ Municipality ID: ${municipalityId}\n`);
 
    // 2. RHUs
    console.log('2. Creating 50 RHUs');
    const allBarangays = [
      "Abo", "Alibungbungan", "Alumbrado", "Balayong", "Balimbing", "Balinacon",
      "Bambang", "Banago", "Banca-banca", "Bangcuro", "Banilad", "Bayaquitos",
      "Buboy", "Buenavista", "Buhanginan", "Bukal", "Bunga", "Cabuyew",
      "Calumpang", "Kanluran Kabubuhayan", "Silangan Kabubuhayan", "Labangan",
      "Lawaguin", "Kanluran Lazaan", "Silangan Lazaan", "Lagulo", "Maiit",
      "Malaya", "Malinao", "Manaol", "Maravilla", "Nagcalbang", "Poblacion II",
      "Poblacion III", "Oples", "Palayan", "Palina", "Sabang", "San Francisco",
      "Sibulan", "Silangan Napapatid", "Silangan Ilaya", "Sinipian", "Santa Lucia",
      "Talahib", "Talangan", "Taytay", "Tipacan", "Wakat", "Yukos",
    ];
 
    const rhus = await db.insert(schema.rhuTable).values(
      allBarangays.map((barangay) => ({
        id: crypto.randomUUID(),
        name: `${barangay} Health Center`,
        barangay,
        municipalityId,
        lat: 14.1500 + (Math.random() - 0.5) * 0.05,
        lng: 121.4100 + (Math.random() - 0.5) * 0.05,
      }))
    ).returning();
    console.log(`   ✅ ${rhus.length} RHUs created.\n`);
 
    // 3. Users
    console.log('3. Creating Users (MHO & 50 Nurses)');
    const [mho] = await db.insert(schema.usersTable).values({
      email: 'mho.nagcarlan@example.com',
      name: 'Dr. Maria Clara (MHO Nagcarlan)',
      role: 'mho',
      municipalityId,
    }).returning();
 
    const nurses: typeof schema.usersTable.$inferSelect[] = [];
    for (let i = 0; i < rhus.length; i += 20) {
      const chunk = rhus.slice(i, i + 20);
      const inserted = await db.insert(schema.usersTable).values(
        chunk.map((r) => ({
          email: `nurse.${r.id.slice(0, 8)}@example.com`,
          name: `Nurse ${r.barangay}`,
          role: 'nurse' as const,
          rhuId: r.id,
          municipalityId,
        }))
      ).returning();
      nurses.push(...inserted);
    }
    console.log(`   ✅ MHO and ${nurses.length} Nurses seeded.\n`);
 
    // 4. Medicines
    console.log('4. Creating Medicines');
    const medicines = await db.insert(schema.medicinesTable).values([
      { genericName: 'Amoxicillin 500mg',     unit: 'capsule', category: 'antibiotic',       criticalThresholdDays: 15 },
      { genericName: 'Paracetamol 500mg',      unit: 'tablet',  category: 'analgesic',        criticalThresholdDays: 14 },
      { genericName: 'Mefenamic Acid 500mg',   unit: 'capsule', category: 'analgesic',        criticalThresholdDays: 7  },
      { genericName: 'Cetirizine 10mg',        unit: 'tablet',  category: 'antihistamine',    criticalThresholdDays: 15 },
      { genericName: 'Metformin 500mg',        unit: 'tablet',  category: 'antidiabetic',     criticalThresholdDays: 7  },
      { genericName: 'Amlodipine 5mg',         unit: 'tablet',  category: 'antihypertensive', criticalThresholdDays: 10 },
      { genericName: 'Atorvastatin 20mg',      unit: 'tablet',  category: 'lipid-lowering',   criticalThresholdDays: 14 },
      { genericName: 'Cotrimoxazole 400mg',    unit: 'tablet',  category: 'antibiotic',       criticalThresholdDays: 7  },
      { genericName: 'Salbutamol 2mg',         unit: 'tablet',  category: 'bronchodilator',   criticalThresholdDays: 10 },
      { genericName: 'Oral Rehydration Salts', unit: 'sachet',  category: 'electrolytes',     criticalThresholdDays: 7  },
      { genericName: 'Ferrous Sulfate 325mg',  unit: 'tablet',  category: 'supplement',       criticalThresholdDays: 10 },
      { genericName: 'Vitamin A 100000IU',     unit: 'capsule', category: 'supplement',       criticalThresholdDays: 14 },
    ]).returning();
    console.log(`   ✅ Created ${medicines.length} medicines.\n`);
 
    // 5. Stock Entries + Baselines — BATCHED (3 queries instead of 2400)
    console.log('5. Injecting Procedural Telemetry for 50 distinct RHUs (batched)');
 
    const dayMinus14 = new Date(); dayMinus14.setDate(dayMinus14.getDate() - 14);
    const dayMinus10 = new Date(); dayMinus10.setDate(dayMinus10.getDate() - 10);
    const dayMinus1  = new Date(); dayMinus1.setDate(dayMinus1.getDate() - 1);
 
    const targets = [
      { name: 'Amoxicillin 500mg',     baseStock: 700,  baseVel: 47, status: 'critical' },
      { name: 'Paracetamol 500mg',     baseStock: 4000, baseVel: 82, status: 'safe'     },
      { name: 'Mefenamic Acid 500mg',  baseStock: 80,   baseVel: 9,  status: 'warning'  },
      { name: 'Cetirizine 10mg',       baseStock: 150,  baseVel: 8,  status: 'warning'  },
      { name: 'Metformin 500mg',       baseStock: 500,  baseVel: 12, status: 'safe'     },
      { name: 'Amlodipine 5mg',        baseStock: 45,   baseVel: 5,  status: 'critical' },
      { name: 'Atorvastatin 20mg',     baseStock: 300,  baseVel: 6,  status: 'safe'     },
      { name: 'Cotrimoxazole 400mg',   baseStock: 60,   baseVel: 7,  status: 'warning'  },
      { name: 'Salbutamol 2mg',        baseStock: 30,   baseVel: 4,  status: 'critical' },
      { name: 'Oral Rehydration Salts',baseStock: 200,  baseVel: 15, status: 'safe'     },
      { name: 'Ferrous Sulfate 325mg', baseStock: 120,  baseVel: 9,  status: 'warning'  },
      { name: 'Vitamin A 100000IU',    baseStock: 800,  baseVel: 6,  status: 'safe'     },
    ];
 
    // Build all rows in memory first, then insert in 2 bulk queries
    const allStockEntries: typeof schema.stockEntriesTable.$inferInsert[] = [];
    const allBaselines:    typeof schema.consumptionBaselinesTable.$inferInsert[] = [];
 
    for (let i = 0; i < rhus.length; i++) {
      const rhu      = rhus[i];
      const nurse    = nurses[i];
      const isSilent = i % 10 === 0;
      const endDay   = isSilent ? dayMinus10 : dayMinus1;
      const daysDiff = isSilent ? 4 : 13;
 
      for (const target of targets) {
        const medRecord = medicines.find(m => m.genericName === target.name);
        if (!medRecord) continue;
 
        let healthMultiplier: number;
        if (target.status === 'critical') {
          healthMultiplier = 0.1 + Math.random() * 0.15;
        } else if (target.status === 'warning') {
          healthMultiplier = 0.5 + Math.random() * 0.3;
        } else {
          healthMultiplier = 1.8 + Math.random() * 1.5;
        }
        healthMultiplier *= (0.85 + Math.random() * 0.3); // per-RHU jitter
 
        const finalVel     = Math.max(1, Math.round(target.baseVel * (0.85 + Math.random() * 0.3)));
        const finalStock   = Math.max(0, Math.round(target.baseStock * healthMultiplier));
        const initialStock = finalStock + finalVel * daysDiff;
 
        // Initial entry (day -14)
        allStockEntries.push({
          rhuId: rhu.id, medicineId: medRecord.id, nurseId: nurse.id,
          quantityOnHand: initialStock, submittedAt: dayMinus14, syncedAt: dayMinus14,
        });
 
        // Latest entry (day -1 or day -10 for silent)
        allStockEntries.push({
          rhuId: rhu.id, medicineId: medRecord.id, nurseId: nurse.id,
          quantityOnHand: finalStock, submittedAt: endDay, syncedAt: endDay,
        });
 
        // Final baseline (reflects current state)
        allBaselines.push({
          rhuId: rhu.id, medicineId: medRecord.id,
          velocity: finalVel.toFixed(4),
          daysRemaining: (finalStock / finalVel).toFixed(2),
          lastUpdated: endDay,
        });
      }
    }
 
    // 3 bulk inserts instead of 2400 individual round-trips
    console.log(`   Inserting ${allStockEntries.length} stock entries...`);
    const CHUNK = 500;
    for (let i = 0; i < allStockEntries.length; i += CHUNK) {
      await db.insert(schema.stockEntriesTable).values(allStockEntries.slice(i, i + CHUNK));
    }
 
    console.log(`   Inserting ${allBaselines.length} consumption baselines...`);
    for (let i = 0; i < allBaselines.length; i += CHUNK) {
      await db.insert(schema.consumptionBaselinesTable).values(allBaselines.slice(i, i + CHUNK));
    }
 
    console.log('   ✅ All telemetry seeded.\n');
 
    console.log('====================================================');
    console.log('Seeding Complete! Ready for end-to-end testing.');
    console.log('====================================================\n');
    console.log('Test Scenario IDs:');
    console.log(`- MHO_ID:          ${mho.id}`);
    console.log(`- NURSE_ID:        ${nurses[0].id}`);
    console.log(`- RHU_ID:          ${rhus[0].id}`);
    console.log(`- MUNICIPALITY_ID: 00000000-0000-0000-0000-000000000002`);
 
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await client.end();
  }
}
 
seed();