import * as rhuRepository from './rhu.repository.js';

/** RHU Service — business logic for Rural Health Units */

export async function getRhusByMunicipality(municipalityId: string) {
  return rhuRepository.findByMunicipality(municipalityId);
}

export async function getRhuById(id: string) {
  return rhuRepository.findById(id);
}
