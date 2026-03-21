enum AlertSeverity { critical, warning, ok }

class MedicineAlert {
  final String medicineId;
  final String medicineName;
  final String unit;
  final double daysRemaining;
  final double velocityPerDay;
  final int currentStock;
  final AlertSeverity severity;

  const MedicineAlert({
    required this.medicineId,
    required this.medicineName,
    required this.unit,
    required this.daysRemaining,
    required this.velocityPerDay,
    required this.currentStock,
    required this.severity,
  });

  factory MedicineAlert.fromDrilldown(Map<String, dynamic> json) {
    final days = (json['daysRemaining'] as num?)?.toDouble() ?? 0.0;
    AlertSeverity severity;
    if (days <= 3) {
      severity = AlertSeverity.critical;
    } else if (days <= 7) {
      severity = AlertSeverity.warning;
    } else {
      severity = AlertSeverity.ok;
    }

    return MedicineAlert(
      medicineId: json['medicineId'] as String? ?? '',
      medicineName: json['genericName'] as String? ?? 'Unknown',
      unit: json['unit'] as String? ?? '',
      daysRemaining: days,
      velocityPerDay: (json['velocityPerDay'] as num?)?.toDouble() ?? 0.0,
      currentStock: (json['currentStock'] as num?)?.toInt() ?? 0,
      severity: severity,
    );
  }
}

class AlertSummary {
  final List<MedicineAlert> alerts;

  const AlertSummary({required this.alerts});

  List<MedicineAlert> get critical =>
      alerts.where((a) => a.severity == AlertSeverity.critical).toList();

  List<MedicineAlert> get warnings =>
      alerts.where((a) => a.severity == AlertSeverity.warning).toList();

  List<MedicineAlert> get actionRequired =>
      alerts.where((a) => a.severity != AlertSeverity.ok).toList();
}
