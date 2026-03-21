class StockHistoryEntry {
  final DateTime submittedAt;
  final int quantityOnHand;

  const StockHistoryEntry({
    required this.submittedAt,
    required this.quantityOnHand,
  });

  factory StockHistoryEntry.fromJson(Map<String, dynamic> json) =>
      StockHistoryEntry(
        submittedAt: DateTime.parse(json['submittedAt'] as String).toLocal(),
        quantityOnHand: (json['quantityOnHand'] as num).toInt(),
      );
}
