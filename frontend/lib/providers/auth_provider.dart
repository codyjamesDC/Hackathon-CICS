import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AuthState {
  final String? token;
  final String? rhuId;
  final bool isLoading;
  final String? error;

  AuthState({this.token, this.rhuId, this.isLoading = false, this.error});

  AuthState copyWith({String? token, String? rhuId, bool? isLoading, String? error}) {
    return AuthState(
      token: token ?? this.token,
      rhuId: rhuId ?? this.rhuId,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class AuthNotifier extends ChangeNotifier {
  AuthState state = AuthState();
  final _apiService = ApiService();

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    notifyListeners();
    try {
      final res = await _apiService.login(email, password);
      final token = res['token'] ?? 'dummy-token';
      final rhuId = res['rhuId']?.toString() ?? '1';
      state = AuthState(token: token, rhuId: rhuId, isLoading: false);
    } catch (e) {
      state = AuthState(isLoading: false, error: 'Login failed: ${e.toString()}');
    }
    notifyListeners();
  }

  void logout() {
    state = AuthState();
    notifyListeners();
  }
}

final authProvider = AuthNotifier();
