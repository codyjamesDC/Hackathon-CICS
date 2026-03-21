enum RhuUrgency { critical, warning, ok, silent, unmonitored }

class MedicineStatus {
  final String medicineId;
  final String medicineName;
  final String unit;
  final int currentStock;
  final double velocityPerDay;
  final double daysRemaining;
  final bool breachTriggered;
  final RhuUrgency urgency;
  final int criticalThresholdDays;

  const MedicineStatus({
    required this.medicineId,
    required this.medicineName,
    required this.unit,
    required this.currentStock,
    required this.velocityPerDay,
    required this.daysRemaining,
    required this.breachTriggered,
    required this.urgency,
    this.criticalThresholdDays = 7,
  });

  factory MedicineStatus.fromJson(Map<String, dynamic> json) {
    final days = (json['daysRemaining'] as num?)?.toDouble() ?? 999.0;
    final velocity = (json['velocityPerDay'] as num?)?.toDouble() ?? 0.0;
    final breach = json['breachTriggered'] as bool? ?? false;

    RhuUrgency urgency;
    if (velocity == 0) {
      urgency = RhuUrgency.silent;
    } else if (breach || days <= 3) {
      urgency = RhuUrgency.critical;
    } else if (days <= 7) {
      urgency = RhuUrgency.warning;
    } else {
      urgency = RhuUrgency.ok;
    }

    return MedicineStatus(
      medicineId: json['medicineId'] as String? ?? '',
      medicineName: json['genericName'] as String? ?? 'Unknown',
      unit: json['unit'] as String? ?? '',
      currentStock: (json['currentStock'] as num?)?.toInt() ?? 0,
      velocityPerDay: velocity,
      daysRemaining: days,
      breachTriggered: breach,
      urgency: urgency,
      criticalThresholdDays: (json['criticalThresholdDays'] as num?)?.toInt() ?? 7,
    );
  }

  double get progressValue {
    if (daysRemaining >= 30) return 1.0;
    return (daysRemaining / 30.0).clamp(0.0, 1.0);
  }
}

class RhuStatusSummary {
  final List<MedicineStatus> medicines;

  const RhuStatusSummary({required this.medicines});

  int get criticalCount =>
      medicines.where((m) => m.urgency == RhuUrgency.critical).length;
  int get warningCount =>
      medicines.where((m) => m.urgency == RhuUrgency.warning).length;
  int get okCount =>
      medicines.where((m) => m.urgency == RhuUrgency.ok).length;

  RhuUrgency get overallUrgency {
    if (criticalCount > 0) return RhuUrgency.critical;
    if (warningCount > 0) return RhuUrgency.warning;
    return RhuUrgency.ok;
  }

  List<MedicineStatus> get sorted {
    final order = [
      RhuUrgency.critical,
      RhuUrgency.warning,
      RhuUrgency.ok,
      RhuUrgency.silent,
      RhuUrgency.unmonitored
    ];
    return [...medicines]
      ..sort((a, b) =>
          order.indexOf(a.urgency).compareTo(order.indexOf(b.urgency)));
  }
}
