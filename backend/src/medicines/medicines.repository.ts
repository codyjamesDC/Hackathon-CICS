/** Medicines Repository — database queries for medicine catalog */

const seedMedicines = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    genericName: 'Amoxicillin 500mg',
    unit: 'capsule',
    category: 'antibiotic',
    criticalThresholdDays: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    genericName: 'Paracetamol 500mg',
    unit: 'tablet',
    category: 'analgesic',
    criticalThresholdDays: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function findAll() {
  return seedMedicines;
}

export async function findById(id: string) {
  return seedMedicines.find((m) => m.id === id) ?? null;
}
