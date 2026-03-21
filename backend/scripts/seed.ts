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
  await db.delete(schema.anomalyAlertsTable);
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
 
    const ABO_RHU_ID   = '00000000-0000-4000-8000-000000000010';
    const ABO_NURSE_ID  = '00000000-0000-4000-8000-000000000011';

    const rhus = await db.insert(schema.rhuTable).values(
      allBarangays.map((barangay, idx) => ({
        id: idx === 0 ? ABO_RHU_ID : crypto.randomUUID(),
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
      id: '00000000-0000-4000-8000-000000000001',
      email: 'mho.nagcarlan@example.com',
      name: 'Dr. Maria Clara (MHO Nagcarlan)',
      role: 'mho',
      municipalityId,
    }).returning();
 
    const nurses: typeof schema.usersTable.$inferSelect[] = [];
    for (let i = 0; i < rhus.length; i += 20) {
      const inserted = await db.insert(schema.usersTable).values(
        rhus.slice(i, i + 20).map((r, batchIdx) => ({
          id: i === 0 && batchIdx === 0 ? ABO_NURSE_ID : crypto.randomUUID(),
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
 
    const STEP_DAYS = 2; // entry every 2 days

    function daysAgo(n: number): Date {
      const d = new Date();
      d.setDate(d.getDate() - n);
      d.setHours(8, 0, 0, 0);
      return d;
    }

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
        if (i === 0) {
            // Abo Health Center — fixed demo RHU must always be critical
            rhuOverallSeverity = 'critical';
        } else if (mod === 0) {
            rhuOverallSeverity = 'silent';
        } else if (mod === 1 || mod === 2) {
            rhuOverallSeverity = 'critical';
        } else if (mod >= 3 && mod <= 5) {
            rhuOverallSeverity = 'warning';
        } else {
            rhuOverallSeverity = 'safe';
        }

        const isSilent = rhuOverallSeverity === 'silent';
        // silent: entries from day-14 to day-10; others: day-14 to day-0
        const startDaysAgo = 14;
        const endDaysAgo   = isSilent ? 10 : 0;
        const daysDiff     = startDaysAgo - endDaysAgo;

        for (let j = 0; j < targets.length; j++) {
            const target = targets[j];
            const medRecord = medicines.find(m => m.genericName === target.name);
            if (!medRecord) continue;

            const jitterVel = 0.85 + (Math.random() * 0.3);
            const finalVel  = Math.max(1, Math.round(target.baseVel * jitterVel));
            const finalStock = getFinalStock(rhuOverallSeverity, j, finalVel);
            const initialStock = finalStock + (finalVel * daysDiff);

            // Generate one entry every STEP_DAYS from startDaysAgo down to endDaysAgo
            for (let dOffset = startDaysAgo; dOffset >= endDaysAgo; dOffset -= STEP_DAYS) {
              const daysElapsed = startDaysAgo - dOffset;
              // small per-step noise (±5% of velocity * step)
              const noise = Math.round((Math.random() - 0.5) * finalVel * STEP_DAYS * 0.10);
              const stock = Math.max(1, Math.round(initialStock - finalVel * daysElapsed + noise));
              const ts = daysAgo(dOffset);
              allStockEntries.push({ rhuId: rhu.id, medicineId: medRecord.id, nurseId: nurse.id, quantityOnHand: stock, submittedAt: ts, syncedAt: ts });
            }

            const lastTs = daysAgo(endDaysAgo);
            allBaselines.push({ rhuId: rhu.id, medicineId: medRecord.id, velocity: finalVel.toFixed(4), daysRemaining: (finalStock / finalVel).toFixed(2), lastUpdated: lastTs });
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

    // 6. Threshold Breaches — derive from critical baselines
    console.log('6. Seeding Threshold Breaches from critical baselines');
    const medicineThresholdMap = new Map<string, number>(
      medicines.map(m => [m.id, m.criticalThresholdDays])
    );
    const breachRows: typeof schema.thresholdBreachesTable.$inferInsert[] = [];
    for (const baseline of allBaselines) {
      const threshold = medicineThresholdMap.get(baseline.medicineId) ?? 7;
      const days = parseFloat(baseline.daysRemaining as string);
      if (days <= threshold) {
        const projected = new Date();
        projected.setDate(projected.getDate() + Math.ceil(days));
        breachRows.push({
          rhuId: baseline.rhuId,
          medicineId: baseline.medicineId,
          daysRemaining: days.toFixed(2),
          projectedZeroDate: projected,
          status: 'open',
        });
      }
    }
    if (breachRows.length > 0) {
      const BCHUNK = 200;
      for (let i = 0; i < breachRows.length; i += BCHUNK) {
        await db.insert(schema.thresholdBreachesTable).values(breachRows.slice(i, i + BCHUNK));
      }
    }
    console.log(`   ✅ ${breachRows.length} threshold breaches seeded.\n`);

    // 7. Anomaly Alerts — seed spike events on critical RHUs
    console.log('7. Seeding Anomaly Alerts (spike events)');
    const anomalyRhus = rhus.filter((_, i) => i === 0 || i % 10 === 1 || i % 10 === 2).slice(0, 6);
    const paracetamol = medicines.find(m => m.genericName === 'Paracetamol 500mg');
    const amoxicillin = medicines.find(m => m.genericName === 'Amoxicillin 500mg');
    const anomalyEntries: typeof schema.anomalyAlertsTable.$inferInsert[] = [];
    for (const rhu of anomalyRhus) {
      if (paracetamol) {
        const baseline = 82;
        const current  = baseline * (2.3 + Math.random() * 0.8);
        anomalyEntries.push({
          rhuId: rhu.id,
          medicineId: paracetamol.id,
          baselineVelocity: baseline.toFixed(4),
          currentVelocity:  current.toFixed(4),
          velocityRatio:    (current / baseline).toFixed(4),
          status: 'open',
        });
      }
      if (amoxicillin && anomalyEntries.length % 2 === 0) {
        const baseline = 47;
        const current  = baseline * (2.1 + Math.random() * 0.5);
        anomalyEntries.push({
          rhuId: rhu.id,
          medicineId: amoxicillin.id,
          baselineVelocity: baseline.toFixed(4),
          currentVelocity:  current.toFixed(4),
          velocityRatio:    (current / baseline).toFixed(4),
          status: 'open',
        });
      }
    }
    if (anomalyEntries.length > 0) {
      await db.insert(schema.anomalyAlertsTable).values(anomalyEntries);
    }
    console.log(`   ✅ ${anomalyEntries.length} anomaly alerts seeded.\n`);
    console.log(`   ✅ Summary: ${breachRows.length} breaches + ${anomalyEntries.length} anomalies ready for demo.\n`);

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
    console.log(`- MHO_ID:          ${mho.id}   (fixed)`);
    console.log(`- NURSE_ID:        ${nurses[0].id}   (fixed — Abo nurse)`);
    console.log(`- RHU_ID:          ${rhus[0].id}   (fixed — Abo Health Center)`);
    console.log(`- MUNICIPALITY_ID: 00000000-0000-0000-0000-000000000002   (fixed)`);
 
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await client.end();
  }
}
 
seed();