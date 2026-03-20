class LocalDatabase {
  final List<Map<String, dynamic>> _entries = [];

  Future<void> init() async {
    // In-memory local queue for minimal nurse flow.
    return;
  }

  Future<void> saveEntry({required String id, required String medicineId, required int quantity, required String rhuId}) async {
    _entries.add({
      'id': id,
      'medicineId': medicineId,
      'quantity': quantity,
      'rhuId': rhuId,
      'createdAt': DateTime.now().toIso8601String(),
      'synced': false,
    });
  }

  Future<List<Map<String, dynamic>>> getPendingEntries() async {
    return _entries.where((e) => e['synced'] == false).toList();
  }

  Future<void> markSynced(String id) async {
    for (final e in _entries) {
      if (e['id'] == id) {
        e['synced'] = true;
      }
    }
  }
}
