import 'package:flutter/material.dart';
import '../models/medicine.dart';
import '../services/api_service.dart';
import '../data/local_database.dart';

class StockState {
  final bool isLoading;
  final String? error;
  final List<Medicine> medicines;

  StockState({this.isLoading = false, this.error, this.medicines = const []});

  StockState copyWith({bool? isLoading, String? error, List<Medicine>? medicines}) {
    return StockState(
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
      medicines: medicines ?? this.medicines,
    );
  }
}

class StockNotifier extends ChangeNotifier {
  StockState state = StockState();
  final _api = ApiService();
  final _db = LocalDatabase();

  StockNotifier() {
    _db.init();
  }

  Future<void> loadMedicines(String token) async {
    state = state.copyWith(isLoading: true, error: null);
    notifyListeners();
    try {
      final data = await _api.fetchMedicines(token);
      final meds = data.map((e) => Medicine.fromJson(Map<String, dynamic>.from(e))).toList();
      state = state.copyWith(isLoading: false, medicines: meds);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Cannot load medicines: $e');
    }
    notifyListeners();
  }

  Future<bool> saveStockEntry(String token, String medicineId, int quantity, String rhuId) async {
    final entryId = DateTime.now().millisecondsSinceEpoch.toString();
    await _db.saveEntry(id: entryId, medicineId: medicineId, quantity: quantity, rhuId: rhuId);
    try {
      await _api.submitStockEntry(token, {
        'medicineId': medicineId,
        'quantity': quantity,
        'rhuId': rhuId,
        'timestamp': DateTime.now().toIso8601String(),
      });
      await _db.markSynced(entryId);
      return true;
    } catch (e) {
      return false;
    }
  }
}

final stockProvider = StockNotifier();
