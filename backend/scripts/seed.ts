import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
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
  await db.delete(schema.stockEntriesTable);
  await db.delete(schema.consumptionBaselinesTable);
  await db.delete(schema.usersTable);
  await db.delete(schema.medicinesTable);
  await db.delete(schema.rhuTable);
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
      const inserted = await db.insert(schema.usersTable).values(
        rhus.slice(i, i + 20).map((r) => ({
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
 
    // 5. Stock Entries + Baselines
    console.log('5. Injecting Procedural Telemetry (batched)');
 
    const dayMinus14 = new Date(); dayMinus14.setDate(dayMinus14.getDate() - 14);
    const dayMinus10 = new Date(); dayMinus10.setDate(dayMinus10.getDate() - 10);
    const dayMinus1  = new Date(); dayMinus1.setDate(dayMinus1.getDate() - 1);
 
    const targets = [
      { name: 'Amoxicillin 500mg',     baseStock: 700,  baseVel: 47 },
      { name: 'Paracetamol 500mg',     baseStock: 4000, baseVel: 82 },
      { name: 'Mefenamic Acid 500mg',  baseStock: 80,   baseVel: 9  },
      { name: 'Cetirizine 10mg',       baseStock: 150,  baseVel: 8  },
      { name: 'Metformin 500mg',       baseStock: 500,  baseVel: 12 },
      { name: 'Amlodipine 5mg',        baseStock: 45,   baseVel: 5  },
      { name: 'Atorvastatin 20mg',     baseStock: 300,  baseVel: 6  },
      { name: 'Cotrimoxazole 400mg',   baseStock: 60,   baseVel: 7  },
      { name: 'Salbutamol 2mg',        baseStock: 30,   baseVel: 4  },
      { name: 'Oral Rehydration Salts',baseStock: 200,  baseVel: 15 },
      { name: 'Ferrous Sulfate 325mg', baseStock: 120,  baseVel: 9  },
      { name: 'Vitamin A 100000IU',    baseStock: 800,  baseVel: 6  },
    ];
 
    const allStockEntries: typeof schema.stockEntriesTable.$inferInsert[] = [];
    const allBaselines: typeof schema.consumptionBaselinesTable.$inferInsert[] = [];

    const medicineStatusProfile: ('critical' | 'safe' | 'warning')[] = [
      'critical', // Amoxicillin 500mg
      'safe',     // Paracetamol 500mg
      'warning',  // Mefenamic Acid 500mg
      'safe',     // Cetirizine 10mg
      'warning',  // Metformin 500mg
      'critical', // Amlodipine 5mg
      'safe',     // Atorvastatin 20mg
      'warning',  // Cotrimoxazole 400mg
      'critical', // Salbutamol 2mg
      'safe',     // Oral Rehydration Salts
      'warning',  // Ferrous Sulfate 325mg
      'safe',     // Vitamin A 100000IU
    ];

    function getFinalStock(rhuProfile: string, medicineIndex: number, finalVel: number): number {
      if (rhuProfile === 'critical') {
        if (medicineIndex === 0 || medicineIndex === 5 || medicineIndex === 8) {
          // Force critical: 2-6 days remaining
          const targetDays = 2 + Math.random() * 4;
          return Math.max(1, Math.round(finalVel * targetDays));
        }
        // Other medicines in critical RHU: warning or safe
        if (medicineIndex % 2 === 0) {
          const targetDays = 8 + Math.random() * 5; // warning: 8-13 days
          return Math.max(1, Math.round(finalVel * targetDays));
        }
        const targetDays = 20 + Math.random() * 30; // safe: 20-50 days
        return Math.max(1, Math.round(finalVel * targetDays));
      }

      if (rhuProfile === 'warning') {
        // NO medicine goes critical — worst must be 7-13 days
        if (medicineIndex % 3 === 0) {
          const targetDays = 7.5 + Math.random() * 5; // warning: 7.5-12.5 days
          return Math.max(1, Math.round(finalVel * targetDays));
        }
        const targetDays = 20 + Math.random() * 30; // safe: 20-50 days
        return Math.max(1, Math.round(finalVel * targetDays));
      }

      if (rhuProfile === 'safe') {
        // ALL medicines >= 15 days
        const targetDays = 15 + Math.random() * 60; // safe: 15-75 days
        return Math.max(1, Math.round(finalVel * targetDays));
      }

      // silent — normal safe stock, old timestamp makes it gray
      const targetDays = 15 + Math.random() * 40;
      return Math.max(1, Math.round(finalVel * targetDays));
    }

    for (let i = 0; i < rhus.length; i++) {
        const rhu = rhus[i];
        const nurse = nurses[i];
        
        let rhuOverallSeverity: 'critical' | 'warning' | 'safe' | 'silent';
        
        const mod = i % 10;
        if (mod === 0) {
            rhuOverallSeverity = 'silent'; 
        } else if (mod === 1 || mod === 2) {
            rhuOverallSeverity = 'critical'; 
        } else if (mod >= 3 && mod <= 5) {
            rhuOverallSeverity = 'warning'; 
        } else if (i === 6 || i === 7 || i === 8) {
            // Exception: Force these 3 to be "Extra Safe"
            rhuOverallSeverity = 'safe';
        } else {
            rhuOverallSeverity = 'safe'; 
        }

        const isSilent = rhuOverallSeverity === 'silent';
        const startDay = isSilent ? dayMinus14 : dayMinus14;
        const endDay = isSilent ? dayMinus10 : dayMinus1;
        const daysDiff = isSilent ? 4 : 13;
        
        for (let j = 0; j < targets.length; j++) {
            const target = targets[j];
            const medRecord = medicines.find(m => m.genericName === target.name);
            if (!medRecord) continue;
            
            const jitterVel = 0.85 + (Math.random() * 0.3);
            const finalVel = Math.max(1, Math.round(target.baseVel * jitterVel));
            const finalStock = getFinalStock(rhuOverallSeverity, j, finalVel);
            const initialStock = finalStock + (finalVel * daysDiff);

            allStockEntries.push({ rhuId: rhu.id, medicineId: medRecord.id, nurseId: nurse.id, quantityOnHand: initialStock, submittedAt: startDay, syncedAt: startDay });
            allStockEntries.push({ rhuId: rhu.id, medicineId: medRecord.id, nurseId: nurse.id, quantityOnHand: finalStock, submittedAt: endDay, syncedAt: endDay });
            allBaselines.push({ rhuId: rhu.id, medicineId: medRecord.id, velocity: finalVel.toFixed(4), daysRemaining: (finalStock / finalVel).toFixed(2), lastUpdated: endDay });
        }
    }
 
    // Bulk insert in 500-row chunks
    const CHUNK = 500;
    console.log(`   Inserting ${allStockEntries.length} stock entries...`);
    for (let i = 0; i < allStockEntries.length; i += CHUNK) {
      await db.insert(schema.stockEntriesTable).values(allStockEntries.slice(i, i + CHUNK));
    }
 
    console.log(`   Inserting ${allBaselines.length} baselines...`);
    for (let i = 0; i < allBaselines.length; i += CHUNK) {
      await db.insert(schema.consumptionBaselinesTable).values(allBaselines.slice(i, i + CHUNK));
    }
 
    console.log('   ✅ Done.\n');
    console.log('====================================================');
    console.log('Seeding Complete!');
    console.log('====================================================');
    console.log('Expected heatmap distribution:');
    console.log('  🔴 Critical : ~10 RHUs (20%)');
    console.log('  🟡 Warning  : ~15 RHUs (30%)');
    console.log('  🟢 Safe     : ~20 RHUs (40%)');
    console.log('  ⚫ Silent   :  ~5 RHUs (10%)');
    console.log('');
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