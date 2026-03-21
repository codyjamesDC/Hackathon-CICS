// ignore_for_file: avoid_print
import 'package:hackathon_cics/features/alerts/data/alerts_repository.dart';
import 'package:hackathon_cics/features/alerts/domain/alert_model.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'alerts_provider.g.dart';

@riverpod
Future<AlertSummary> alertSummary(Ref ref) async {
  print('[ALERTS PROVIDER] fetching alerts');
  final result = await AlertsRepository().getAlerts();
  print('[ALERTS PROVIDER] got ${result.alerts.length} alerts');
  return result;
}
