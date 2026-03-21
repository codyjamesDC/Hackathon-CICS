// ignore_for_file: avoid_print
import 'package:hackathon_cics/core/auth/auth_service.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'auth_provider.g.dart';

class AuthState {
  final String? userId;
  final String? rhuId;
  final String? userName;
  final String? rhuName;
  final bool isLoggedIn;

  const AuthState({
    this.userId,
    this.rhuId,
    this.userName,
    this.rhuName,
    this.isLoggedIn = false,
  });

  AuthState copyWith({
    String? userId,
    String? rhuId,
    String? userName,
    String? rhuName,
    bool? isLoggedIn,
  }) {
    return AuthState(
      userId: userId ?? this.userId,
      rhuId: rhuId ?? this.rhuId,
      userName: userName ?? this.userName,
      rhuName: rhuName ?? this.rhuName,
      isLoggedIn: isLoggedIn ?? this.isLoggedIn,
    );
  }
}

@Riverpod(keepAlive: true)
class Auth extends _$Auth {
  @override
  AuthState build() => const AuthState();

  Future<bool> tryRestoreSession() async {
    print('[AUTH] tryRestoreSession() called');
    final session = await AuthService.instance.loadSession();
    print('[AUTH] session loaded: userId=${session?.userId}, rhuId=${session?.rhuId}');
    if (session != null) {
      state = AuthState(
        userId: session.userId,
        rhuId: session.rhuId,
        userName: session.userName,
        rhuName: session.rhuName,
        isLoggedIn: true,
      );
      return true;
    }
    print('[AUTH] no session found, redirecting to login');
    return false;
  }

  Future<void> login(NurseSession session) async {
    await AuthService.instance.saveSession(session);
    state = AuthState(
      userId: session.userId,
      rhuId: session.rhuId,
      userName: session.userName,
      rhuName: session.rhuName,
      isLoggedIn: true,
    );
  }

  Future<void> logout() async {
    await AuthService.instance.clearSession();
    state = const AuthState();
  }
}
