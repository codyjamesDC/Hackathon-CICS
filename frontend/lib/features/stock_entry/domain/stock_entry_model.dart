class MedicineModel {
  final String id;
  final String genericName;
  final String unit;
  final String category;
  final int criticalThresholdDays;

  const MedicineModel({
    required this.id,
    required this.genericName,
    required this.unit,
    required this.category,
    required this.criticalThresholdDays,
  });

  factory MedicineModel.fromJson(Map<String, dynamic> json) => MedicineModel(
        id: json['id'] as String,
        genericName: json['genericName'] as String,
        unit: json['unit'] as String,
        category: json['category'] as String,
        criticalThresholdDays: (json['criticalThresholdDays'] as num).toInt(),
      );
}

class StockEntryRequest {
  final String rhuId;
  final String medicineId;
  final int quantityOnHand;
  final String submittedAt;

  const StockEntryRequest({
    required this.rhuId,
    required this.medicineId,
    required this.quantityOnHand,
    required this.submittedAt,
  });

  Map<String, dynamic> toJson() => {
        'rhuId': rhuId,
        'medicineId': medicineId,
        'quantityOnHand': quantityOnHand,
        'submittedAt': submittedAt,
      };
}

class StockEntryVelocity {
  final double velocityPerDay;
  final double daysRemaining;
  final bool breachTriggered;

  const StockEntryVelocity({
    required this.velocityPerDay,
    required this.daysRemaining,
    required this.breachTriggered,
  });

  factory StockEntryVelocity.fromJson(Map<String, dynamic> json) =>
      StockEntryVelocity(
        velocityPerDay: (json['velocityPerDay'] as num).toDouble(),
        daysRemaining: (json['daysRemaining'] as num).toDouble(),
        breachTriggered: json['breachTriggered'] as bool? ?? false,
      );
}

class StockEntryResponse {
  final String id;
  final String rhuId;
  final String medicineId;
  final StockEntryVelocity velocity;

  const StockEntryResponse({
    required this.id,
    required this.rhuId,
    required this.medicineId,
    required this.velocity,
  });

  factory StockEntryResponse.fromJson(Map<String, dynamic> json) =>
      StockEntryResponse(
        id: json['id'] as String? ?? '',
        rhuId: json['rhuId'] as String? ?? '',
        medicineId: json['medicineId'] as String,
        velocity: StockEntryVelocity.fromJson(
            json['velocity'] as Map<String, dynamic>),
      );
}

class BatchStockEntryResponse {
  final List<StockEntryResponse> entries;

  const BatchStockEntryResponse({required this.entries});

  factory BatchStockEntryResponse.fromJson(Map<String, dynamic> json) {
    final wrapper = json['data'];
    // Batch endpoint returns { data: { processed, failed, results: [...] } }
    if (wrapper is Map<String, dynamic>) {
      final rawResults = wrapper['results'] as List? ?? [];
      return BatchStockEntryResponse(
        entries: rawResults
            .where((e) => (e as Map<String, dynamic>)['status'] == 'ok')
            .map((e) => StockEntryResponse.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
    }
    return const BatchStockEntryResponse(entries: []);
  }
}
