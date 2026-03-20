import 'package:flutter/material.dart';
import '../models/medicine.dart';
import '../services/api_service.dart';

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
    try {
      await _api.submitStockEntry(token, {
        'medicineId': medicineId,
        'quantityOnHand': quantity,
        'rhuId': rhuId,
        'submittedAt': DateTime.now().toUtc().toIso8601String(),
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}

final stockProvider = StockNotifier();