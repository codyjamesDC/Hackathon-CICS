import 'package:hackathon_cics/core/auth/auth_provider.dart';
import 'package:hackathon_cics/core/auth/auth_service.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'login_provider.g.dart';

class LoginState {
  final bool isLoading;
  final String? error;

  const LoginState({this.isLoading = false, this.error});

  LoginState copyWith({bool? isLoading, String? error}) => LoginState(
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

@riverpod
class Login extends _$Login {
  @override
  LoginState build() => const LoginState();

  Future<bool> login({
    required String userId,
    required String rhuId,
    required String name,
    required String rhuName,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    // Capture notifier before first await — never use ref after an await
    final authNotifier = ref.read(authProvider.notifier);
    try {
      final session = NurseSession(
        userId: userId,
        rhuId: rhuId,
        userName: name,
        rhuName: rhuName,
      );
      await authNotifier.login(session);
      // Guard: provider may be disposed if the screen navigated away
      if (ref.mounted) state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      if (ref.mounted) state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }
}
