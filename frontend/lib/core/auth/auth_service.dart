// ignore_for_file: avoid_print
import 'package:hackathon_cics/core/auth/secure_storage.dart';

class NurseSession {
  final String userId;
  final String rhuId;
  final String userName;
  final String rhuName;

  const NurseSession({
    required this.userId,
    required this.rhuId,
    required this.userName,
    required this.rhuName,
  });
}

class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  final _storage = SecureStorageWrapper.instance;

  Future<void> saveSession(NurseSession session) async {
    print('[STORAGE] saveSession() — userId: ${session.userId}, rhuId: ${session.rhuId}');
    await Future.wait([
      _storage.write(StorageKeys.userId, session.userId),
      _storage.write(StorageKeys.rhuId, session.rhuId),
      _storage.write(StorageKeys.userName, session.userName),
      _storage.write(StorageKeys.rhuName, session.rhuName),
    ]);
    print('[STORAGE] saveSession() complete');
  }

  Future<NurseSession?> loadSession() async {
    print('[STORAGE] loadSession() called');
    final results = await Future.wait([
      _storage.read(StorageKeys.userId),
      _storage.read(StorageKeys.rhuId),
      _storage.read(StorageKeys.userName),
      _storage.read(StorageKeys.rhuName),
    ]);

    final userId = results[0];
    final rhuId = results[1];
    final userName = results[2];
    final rhuName = results[3];

    print('[STORAGE] loadSession() result — userId: $userId, rhuId: $rhuId');
    if (userId == null || rhuId == null || userName == null || rhuName == null) {
      print('[STORAGE] loadSession() — incomplete session, returning null');
      return null;
    }

    return NurseSession(
      userId: userId,
      rhuId: rhuId,
      userName: userName,
      rhuName: rhuName,
    );
  }

  Future<void> clearSession() => _storage.deleteAll();
}
