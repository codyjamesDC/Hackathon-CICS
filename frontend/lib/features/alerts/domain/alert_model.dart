enum NurseAlertType { thresholdBreach, anomalySpike, participationAlert }

enum NurseAlertSeverity { critical, warning, info }

class NurseAlert {
  final String id;
  final String rhuId;
  final String rhuName;
  final NurseAlertType type;
  final NurseAlertSeverity severity;
  final String title;
  final String message;
  final String? medicineName;
  final String? relatedRequisitionId;
  final DateTime createdAt;

  const NurseAlert({
    required this.id,
    required this.rhuId,
    required this.rhuName,
    required this.type,
    required this.severity,
    required this.title,
    required this.message,
    required this.medicineName,
    required this.relatedRequisitionId,
    required this.createdAt,
  });

  factory NurseAlert.fromJson(Map<String, dynamic> json) {
    final typeStr = json['type'] as String? ?? 'threshold_breach';
    final severityStr = json['severity'] as String? ?? 'warning';

    final type = switch (typeStr) {
      'anomaly_spike' => NurseAlertType.anomalySpike,
      'participation_alert' => NurseAlertType.participationAlert,
      _ => NurseAlertType.thresholdBreach,
    };

    final severity = switch (severityStr) {
      'critical' => NurseAlertSeverity.critical,
      'info' => NurseAlertSeverity.info,
      _ => NurseAlertSeverity.warning,
    };

    return NurseAlert(
      id: json['id'] as String? ?? '',
      rhuId: json['rhuId'] as String? ?? '',
      rhuName: json['rhuName'] as String? ?? '',
      type: type,
      severity: severity,
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
      medicineName: json['medicineName'] as String?,
      relatedRequisitionId: json['relatedRequisitionId'] as String?,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

class AlertSummary {
  final List<NurseAlert> alerts;

  const AlertSummary({required this.alerts});

  List<NurseAlert> get critical =>
      alerts.where((a) => a.severity == NurseAlertSeverity.critical).toList();

  List<NurseAlert> get warnings =>
      alerts.where((a) => a.severity == NurseAlertSeverity.warning).toList();

  List<NurseAlert> get anomalySpikes =>
      alerts.where((a) => a.type == NurseAlertType.anomalySpike).toList();
}
