// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'alerts_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(alertSummary)
final alertSummaryProvider = AlertSummaryProvider._();

final class AlertSummaryProvider
    extends
        $FunctionalProvider<
          AsyncValue<AlertSummary>,
          AlertSummary,
          FutureOr<AlertSummary>
        >
    with $FutureModifier<AlertSummary>, $FutureProvider<AlertSummary> {
  AlertSummaryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'alertSummaryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$alertSummaryHash();

  @$internal
  @override
  $FutureProviderElement<AlertSummary> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<AlertSummary> create(Ref ref) {
    return alertSummary(ref);
  }
}

String _$alertSummaryHash() => r'6ff429b1477cdc465c4e4bbd959d2b857efebc48';
