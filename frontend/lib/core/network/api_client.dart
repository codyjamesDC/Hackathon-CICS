// ignore_for_file: avoid_print
import 'package:dio/dio.dart';
import 'package:hackathon_cics/core/auth/auth_service.dart';
import 'package:hackathon_cics/core/network/api_endpoints.dart';

class AuthInterceptor extends Interceptor {
  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final session = await AuthService.instance.loadSession();
    print('[AUTH] Request URL: ${options.uri}');
    if (session != null) {
      options.headers['X-User-Id'] = session.userId;
      options.headers['X-User-Role'] = 'nurse';
      options.headers['X-Rhu-Id'] = session.rhuId;
      print('[AUTH] Injecting headers — userId: ${session.userId}, rhuId: ${session.rhuId}, role: nurse');
    } else {
      print('[AUTH] No session found — headers NOT injected');
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    print('[DIO ERROR] type: ${err.type}');
    print('[DIO ERROR] message: ${err.message}');
    print('[DIO ERROR] url: ${err.requestOptions.uri}');
    print('[DIO ERROR] response: ${err.response?.data}');
    handler.next(err);
  }
}

class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  late final Dio _dio = Dio(
    BaseOptions(
      baseUrl: ApiEndpoints.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      sendTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ),
  )..interceptors.addAll([
    AuthInterceptor(),
    LogInterceptor(
      requestHeader: true,
      requestBody: true,
      responseHeader: false,
      responseBody: true,
      error: true,
      logPrint: (log) => print('[DIO] $log'),
    ),
  ]);

  Dio get dio => _dio;
}
