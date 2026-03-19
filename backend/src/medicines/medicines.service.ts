import * as medicinesRepository from './medicines.repository.js';

/** Medicines Service — business logic for medicine catalog */

export async function getAllMedicines() {
  return medicinesRepository.findAll();
}

export async function getMedicineById(id: string) {
  return medicinesRepository.findById(id);
}
