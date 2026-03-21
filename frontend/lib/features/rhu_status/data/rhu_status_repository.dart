// ignore_for_file: avoid_print
import 'package:hackathon_cics/core/network/api_client.dart';
import 'package:hackathon_cics/features/rhu_status/domain/rhu_status_model.dart';

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
}
