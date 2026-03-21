import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract final class StorageKeys {
  static const String userId = 'userId';
  static const String rhuId = 'rhuId';
  static const String userName = 'userName';
  static const String rhuName = 'rhuName';
}

class SecureStorageWrapper {
  SecureStorageWrapper._();
  static final SecureStorageWrapper instance = SecureStorageWrapper._();

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(),
  );

  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  Future<String?> read(String key) => _storage.read(key: key);

  Future<void> delete(String key) => _storage.delete(key: key);

  Future<void> deleteAll() => _storage.deleteAll();
}
