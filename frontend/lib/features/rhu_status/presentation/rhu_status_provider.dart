// ignore_for_file: avoid_print
import 'package:hackathon_cics/core/auth/auth_provider.dart';
import 'package:hackathon_cics/features/rhu_status/data/rhu_status_repository.dart';
import 'package:hackathon_cics/features/rhu_status/domain/rhu_status_model.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'rhu_status_provider.g.dart';

@riverpod
Future<RhuStatusSummary> rhuStatus(Ref ref) async {
  final rhuId = ref.watch(authProvider).rhuId ?? '';
  print('[RHU PROVIDER] fetching for rhuId: $rhuId');
  final result = await RhuStatusRepository().getRhuStatus(rhuId);
  print('[RHU PROVIDER] got ${result.medicines.length} medicines');
  return result;
}
