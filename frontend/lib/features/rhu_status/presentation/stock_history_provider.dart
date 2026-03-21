// ignore_for_file: avoid_print
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hackathon_cics/core/auth/auth_provider.dart';
import 'package:hackathon_cics/features/rhu_status/data/rhu_status_repository.dart';
import 'package:hackathon_cics/features/rhu_status/domain/stock_history_model.dart';

final stockHistoryProvider = FutureProvider.family<List<StockHistoryEntry>, String>(
  (ref, medicineId) async {
    final rhuId = ref.watch(authProvider).rhuId ?? '';
    print('[HISTORY PROVIDER] fetching history: rhuId=$rhuId medicineId=$medicineId');
    final result = await RhuStatusRepository().getStockHistory(
      rhuId: rhuId,
      medicineId: medicineId,
    );
    print('[HISTORY PROVIDER] got ${result.length} entries');
    return result;
  },
);
