// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'stock_entry_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(medicines)
final medicinesProvider = MedicinesProvider._();

final class MedicinesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<MedicineModel>>,
          List<MedicineModel>,
          FutureOr<List<MedicineModel>>
        >
    with
        $FutureModifier<List<MedicineModel>>,
        $FutureProvider<List<MedicineModel>> {
  MedicinesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'medicinesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$medicinesHash();

  @$internal
  @override
  $FutureProviderElement<List<MedicineModel>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<MedicineModel>> create(Ref ref) {
    return medicines(ref);
  }
}

String _$medicinesHash() => r'ba57c81d899a35b68db42b917dd0b3d5f9ef7edc';

@ProviderFor(StockEntryNotifier)
final stockEntryProvider = StockEntryNotifierProvider._();

final class StockEntryNotifierProvider
    extends $NotifierProvider<StockEntryNotifier, StockEntryState> {
  StockEntryNotifierProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'stockEntryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$stockEntryNotifierHash();

  @$internal
  @override
  StockEntryNotifier create() => StockEntryNotifier();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(StockEntryState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<StockEntryState>(value),
    );
  }
}

String _$stockEntryNotifierHash() =>
    r'039b896d9c5e5f60c9d4dd9b0c07fbd77732e76c';

abstract class _$StockEntryNotifier extends $Notifier<StockEntryState> {
  StockEntryState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<StockEntryState, StockEntryState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<StockEntryState, StockEntryState>,
              StockEntryState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
