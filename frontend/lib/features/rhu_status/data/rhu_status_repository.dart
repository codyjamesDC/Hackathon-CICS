// ignore_for_file: avoid_print
import 'package:hackathon_cics/core/network/api_client.dart';
import 'package:hackathon_cics/core/network/api_endpoints.dart';
import 'package:hackathon_cics/features/rhu_status/domain/rhu_status_model.dart';
import 'package:hackathon_cics/features/rhu_status/domain/stock_history_model.dart';

class RhuStatusRepository {
  final _dio = ApiClient.instance.dio;

  Future<RhuStatusSummary> getRhuStatus(String rhuId) async {
    print('[RHU REPO] getRhuStatus($rhuId)');
    try {
      final response = await _dio.get('/api/dashboard/rhu/$rhuId');
      print('[RHU REPO] → ${response.statusCode}');
      final envelope = response.data['data'] as Map<String, dynamic>;
      final data = envelope['medicines'] as List? ?? [];
      final medicines = data
          .map((e) => MedicineStatus.fromJson(e as Map<String, dynamic>))
          .toList();
      return RhuStatusSummary(medicines: medicines);
    } catch (e, st) {
      print('[RHU REPO] ERROR: $e');
      print('[RHU REPO] StackTrace: $st');
      rethrow;
    }
  }

  Future<List<StockHistoryEntry>> getStockHistory({
    required String rhuId,
    required String medicineId,
  }) async {
    print('[RHU REPO] getStockHistory(rhuId=$rhuId, medicineId=$medicineId)');
    try {
      final response = await _dio.get(
        ApiEndpoints.stockEntriesByRhuAndMedicine(rhuId, medicineId),
      );
      print('[RHU REPO] getStockHistory → ${response.statusCode}');
      final data = response.data['data'] as List? ?? [];
      final entries = data
          .map((e) => StockHistoryEntry.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => a.submittedAt.compareTo(b.submittedAt));
      return entries;
    } catch (e, st) {
      print('[RHU REPO] getStockHistory ERROR: $e');
      print('[RHU REPO] StackTrace: $st');
      rethrow;
    }
  }
}
