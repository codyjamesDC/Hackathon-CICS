// ignore_for_file: avoid_print
import 'package:hackathon_cics/core/network/api_client.dart';
import 'package:hackathon_cics/core/network/api_endpoints.dart';
import 'package:hackathon_cics/features/stock_entry/domain/stock_entry_model.dart';

class StockEntryRepository {
  final _dio = ApiClient.instance.dio;

  Future<List<MedicineModel>> getMedicines() async {
    print('[REPO] getMedicines() called');
    print('[REPO] URL: ${ApiEndpoints.medicines}');
    try {
      final response = await _dio.get(ApiEndpoints.medicines);
      print('[REPO] getMedicines() → ${response.statusCode} — ${response.data}');
      final data = response.data['data'] as List;
      return data
          .map((e) => MedicineModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e, st) {
      print('[REPO] getMedicines() ERROR: $e');
      print('[REPO] StackTrace: $st');
      rethrow;
    }
  }

  Future<BatchStockEntryResponse> submitBatch(
      List<StockEntryRequest> entries) async {
    print('[REPO] submitBatch() called with ${entries.length} entries');
    try {
      final response = await _dio.post(
        ApiEndpoints.stockEntriesBatch,
        data: {'entries': entries.map((e) => e.toJson()).toList()},
      );
      print('[REPO] submitBatch() → ${response.statusCode}');
      print('[REPO] submitBatch() response: ${response.data}');
      return BatchStockEntryResponse.fromJson(
          response.data as Map<String, dynamic>);
    } catch (e, st) {
      print('[REPO] submitBatch() ERROR: $e');
      print('[REPO] StackTrace: $st');
      rethrow;
    }
  }
}
