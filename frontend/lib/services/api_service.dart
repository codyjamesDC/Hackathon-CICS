import 'package:dio/dio.dart';
import '../core/env.dart';

class ApiService {
  ApiService({String? baseUrl}) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl ?? Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 8),
      headers: {
        'Accept': 'application/json',
      },
    ));
  }

  late final Dio _dio;

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final res = await _dio.post('/api/users/login', data: {'email': email, 'password': password});
      return Map<String, dynamic>.from(res.data ?? {});
    } catch (e) {
      // Backend login not yet implemented; fallback to dummy values.
      return {'token': 'dummy-token', 'rhuId': Env.defaultRhuId};
    }
  }

  Future<List<dynamic>> fetchMedicines(String token) async {
    final res = await _dio.get('/api/medicines', options: Options(headers: {
      'Authorization': 'Bearer $token',
      'X-User-Id': Env.defaultUserId,
      'X-User-Role': 'nurse',
      'X-Rhu-Id': Env.defaultRhuId,
    }));
    final payload = res.data;
    if (payload is Map && payload.containsKey('data')) {
      return List<dynamic>.from(payload['data']);
    }
    if (payload is List) {
      return payload;
    }
    return [];
  }

  Future<Map<String, dynamic>> submitStockEntry(String token, Map<String, dynamic> body) async {
    final res = await _dio.post('/api/stock-entries',
        data: body,
        options: Options(headers: {
          'Authorization': 'Bearer $token',
          'X-User-Id': Env.defaultUserId,
          'X-User-Role': 'nurse',
          'X-Rhu-Id': Env.defaultRhuId,
        }));
    return Map<String, dynamic>.from(res.data ?? {});
  }

  Future<Map<String, dynamic>> submitStockEntriesBatch(String token, List<Map<String, dynamic>> entries) async {
    final res = await _dio.post('/api/stock-entries/batch',
        data: {'entries': entries},
        options: Options(headers: {
          'Authorization': 'Bearer $token',
          'X-User-Id': Env.defaultUserId,
          'X-User-Role': 'nurse',
          'X-Rhu-Id': Env.defaultRhuId,
        }));
    return Map<String, dynamic>.from(res.data ?? {});
  }
}
