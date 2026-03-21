// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rhu_status_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(rhuStatus)
final rhuStatusProvider = RhuStatusProvider._();

final class RhuStatusProvider
    extends
        $FunctionalProvider<
          AsyncValue<RhuStatusSummary>,
          RhuStatusSummary,
          FutureOr<RhuStatusSummary>
        >
    with $FutureModifier<RhuStatusSummary>, $FutureProvider<RhuStatusSummary> {
  RhuStatusProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'rhuStatusProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$rhuStatusHash();

  @$internal
  @override
  $FutureProviderElement<RhuStatusSummary> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<RhuStatusSummary> create(Ref ref) {
    return rhuStatus(ref);
  }
}

String _$rhuStatusHash() => r'99cdeda586aadc522b4b607dee49a4af5baaaa5b';
