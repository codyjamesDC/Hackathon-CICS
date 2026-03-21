// ignore_for_file: avoid_print
import 'package:hackathon_cics/core/auth/auth_provider.dart';
import 'package:hackathon_cics/features/alerts/data/alerts_repository.dart';
import 'package:hackathon_cics/features/alerts/domain/alert_model.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'alerts_provider.g.dart';

@riverpod
Future<AlertSummary> alertSummary(Ref ref) async {
  final rhuId = ref.watch(authProvider).rhuId ?? '';
  print('[ALERTS PROVIDER] fetching for rhuId: $rhuId');
  final result = await AlertsRepository().getAlertsForRhu(rhuId);
  print('[ALERTS PROVIDER] got ${result.alerts.length} medicine statuses');
  return result;
}
