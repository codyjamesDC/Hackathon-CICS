// ignore_for_file: avoid_print
import 'package:hackathon_cics/core/network/api_client.dart';
import 'package:hackathon_cics/features/alerts/domain/alert_model.dart';

class AlertsRepository {
  final _dio = ApiClient.instance.dio;

  Future<AlertSummary> getAlertsForRhu(String rhuId) async {
    print('[ALERTS REPO] getAlertsForRhu($rhuId)');
    try {
      final response = await _dio.get('/api/dashboard/rhu/$rhuId');
      print('[ALERTS REPO] → ${response.statusCode}');
      final envelope = response.data['data'] as Map<String, dynamic>;
      final data = envelope['medicines'] as List? ?? [];
      final alerts = data
          .map((e) => MedicineAlert.fromDrilldown(e as Map<String, dynamic>))
          .toList();
      return AlertSummary(alerts: alerts);
    } catch (e, st) {
      print('[ALERTS REPO] ERROR: $e');
      print('[ALERTS REPO] StackTrace: $st');
      rethrow;
    }
  }
}
