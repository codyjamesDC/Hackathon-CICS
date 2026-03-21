import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'connectivity_provider.g.dart';

@Riverpod(keepAlive: true)
Stream<List<ConnectivityResult>> connectivityStream(Ref ref) {
  return Connectivity().onConnectivityChanged;
}

@Riverpod(keepAlive: true)
bool isOnline(Ref ref) {
  final result = ref.watch(connectivityStreamProvider);
  return result.maybeWhen(
    data: (results) =>
        results.isNotEmpty &&
        results.any((r) => r != ConnectivityResult.none),
    orElse: () => true,
  );
}
