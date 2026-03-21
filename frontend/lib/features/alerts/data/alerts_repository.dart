// ignore_for_file: avoid_print
import 'package:hackathon_cics/core/network/api_client.dart';
import 'package:hackathon_cics/core/network/api_endpoints.dart';
import 'package:hackathon_cics/features/alerts/domain/alert_model.dart';

class AlertsRepository {
  final _dio = ApiClient.instance.dio;

  Future<AlertSummary> getAlerts() async {
    print('[ALERTS REPO] getAlerts()');
    try {
      final response = await _dio.get(ApiEndpoints.alerts);
      print('[ALERTS REPO] → ${response.statusCode}');
      final data = response.data['data'] as List? ?? [];
      final alerts = data
          .map((e) => NurseAlert.fromJson(e as Map<String, dynamic>))
          .toList();
      print('[ALERTS REPO] parsed ${alerts.length} alerts');
      return AlertSummary(alerts: alerts);
    } catch (e, st) {
      print('[ALERTS REPO] ERROR: $e');
      print('[ALERTS REPO] StackTrace: $st');
      rethrow;
    }
  }
}
