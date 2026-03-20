class StockEntry {
  final String id;
  final String medicineId;
  final int quantity;
  final String rhuId;
  final DateTime createdAt;

  StockEntry({
    required this.id,
    required this.medicineId,
    required this.quantity,
    required this.rhuId,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'medicineId': medicineId,
      'quantity': quantity,
      'rhuId': rhuId,
      'timestamp': createdAt.toIso8601String(),
    };
  }
}
