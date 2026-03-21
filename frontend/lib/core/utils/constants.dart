const String kBaseUrl = 'http://localhost:3000';

// Fixed deterministic UUIDs — stable across all `npm run seed` runs.
// Abo Health Center is always seeded with these IDs.
const String kSeedNurseId = '00000000-0000-4000-8000-000000000011';
const String kSeedRhuId = '00000000-0000-4000-8000-000000000010';
const String kSeedMunicipalityId = '00000000-0000-0000-0000-000000000002';

const int kSilenceThresholdDays = 3;

class NurseAccount {
  final String userId;
  final String rhuId;
  final String name;
  final String rhuName;

  const NurseAccount({
    required this.userId,
    required this.rhuId,
    required this.name,
    required this.rhuName,
  });
}

const List<NurseAccount> kNurseAccounts = [
  NurseAccount(
    userId: kSeedNurseId,
    rhuId: kSeedRhuId,
    name: 'Nurse Abo',
    rhuName: 'Abo Health Center',
  ),
];
