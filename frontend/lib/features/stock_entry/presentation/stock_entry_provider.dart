// ignore_for_file: avoid_print
import 'package:hackathon_cics/core/auth/auth_provider.dart';
import 'package:hackathon_cics/core/utils/date_utils.dart';
import 'package:hackathon_cics/features/stock_entry/data/stock_entry_repository.dart';
import 'package:hackathon_cics/features/stock_entry/domain/stock_entry_model.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'stock_entry_provider.g.dart';

@riverpod
Future<List<MedicineModel>> medicines(Ref ref) async {
  print('[PROVIDER] medicinesProvider building...');
  final result = await StockEntryRepository().getMedicines();
  print('[PROVIDER] medicinesProvider got ${result.length} medicines');
  return result;
}

class StockEntryState {
  final Map<String, int> quantities;
  final bool isSubmitting;
  final bool submitted;
  final String? error;
  final List<StockEntryResponse> results;

  const StockEntryState({
    this.quantities = const {},
    this.isSubmitting = false,
    this.submitted = false,
    this.error,
    this.results = const [],
  });

  StockEntryState copyWith({
    Map<String, int>? quantities,
    bool? isSubmitting,
    bool? submitted,
    String? error,
    List<StockEntryResponse>? results,
  }) =>
      StockEntryState(
        quantities: quantities ?? this.quantities,
        isSubmitting: isSubmitting ?? this.isSubmitting,
        submitted: submitted ?? this.submitted,
        error: error,
        results: results ?? this.results,
      );
}

@riverpod
class StockEntryNotifier extends _$StockEntryNotifier {
  @override
  StockEntryState build() => const StockEntryState();

  void updateQuantity(String medicineId, int qty) {
    final updated = Map<String, int>.from(state.quantities);
    if (qty <= 0) {
      updated.remove(medicineId);
    } else {
      updated[medicineId] = qty;
    }
    state = state.copyWith(quantities: updated);
  }

  void reset() => state = const StockEntryState();

  Future<BatchStockEntryResponse?> submitAll(List<MedicineModel> medicines) async {
    print('[NOTIFIER] submitAll() called');
    print('[NOTIFIER] quantities: ${state.quantities}');
    if (state.quantities.isEmpty) return null;

    state = state.copyWith(isSubmitting: true, error: null);

    // Capture everything needed before any await
    final rhuId = ref.read(authProvider).rhuId ?? '';
    final repo = StockEntryRepository();
    final entries = state.quantities.entries.map((e) => StockEntryRequest(
          medicineId: e.key,
          quantityOnHand: e.value,
          rhuId: rhuId,
          submittedAt: AgapDateUtils.nowUtcIso(),
        )).toList();

    try {
      final result = await repo.submitBatch(entries);
      print('[NOTIFIER] submitAll() complete — ${result.entries.length} entries returned');
      if (ref.mounted) {
        state = state.copyWith(
          isSubmitting: false,
          submitted: true,
          results: result.entries,
        );
      }
      return result;
    } catch (e) {
      if (ref.mounted) {
        state = state.copyWith(isSubmitting: false, error: e.toString());
      }
      return null;
    }
  }
}
