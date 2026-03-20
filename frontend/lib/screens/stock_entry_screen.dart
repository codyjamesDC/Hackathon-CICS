import 'package:flutter/material.dart';
import '../models/medicine.dart';
import '../services/api_service.dart';

class StockEntryScreen extends StatefulWidget {
  final String token;
  final String rhuId;

  const StockEntryScreen({super.key, required this.token, required this.rhuId});

  @override
  State<StockEntryScreen> createState() => _StockEntryScreenState();
}

class _StockEntryScreenState extends State<StockEntryScreen> {
  final _quantities = <String, String>{};
  final _api = ApiService();

  List<Medicine> medicines = [];
  bool isLoading = true;
  String? error;
  final Map<String, int> velocityByMedicineId = {};

  @override
  void initState() {
    super.initState();
    _loadMedicines();
  }

  Future<void> _loadMedicines() async {
    setState(() {
      isLoading = true;
      error = null;
    });
    try {
      final data = await _api.fetchMedicines(widget.token);
      setState(() {
        medicines = data.map((e) => Medicine.fromJson(Map<String, dynamic>.from(e))).toList();
      });
    } catch (e) {
      setState(() {
        error = 'Failed to load medicines: $e';
      });
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  Future<void> _submitEntries() async {
    setState(() {
      isLoading = true;
      error = null;
    });

    final submitted = <String>[];
    final failed = <String>[];
    final velocities = <String, int>{};

    for (final med in medicines) {
      final raw = _quantities[med.id];
      final qty = int.tryParse(raw ?? '');
      if (qty == null || qty <= 0) continue;

      try {
        final result = await _api.submitStockEntry(widget.token, {
          'medicineId': med.id,
          'quantityOnHand': qty,
          'rhuId': widget.rhuId,
          'submittedAt': DateTime.now().toIso8601String(),
        });

        final velocity = result['velocity'];
        if (velocity is Map<String, dynamic>) {
          final days = velocity['daysRemaining'];
          if (days is int) {
            velocities[med.id] = days;
          }
        }
        submitted.add(med.name);
      } catch (e) {
        failed.add(med.name);
      }
    }

    if (mounted) {
      setState(() {
        velocityByMedicineId.addAll(velocities);
        isLoading = false;
      });
      final msg = failed.isEmpty
          ? 'Submitted ${submitted.length} entries successfully.'
          : 'Failed for ${failed.join(', ')}. Please try again.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  Future<void> _syncPendingEntries() async {
    // Offline sync disabled for MVP.
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Offline sync disabled in MVP.')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nurse Stock Entry')),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                children: [
                  const Text('Enter quantities'),
                  const SizedBox(height: 12),
                  if (error != null) ...[
                    Text(error!, style: const TextStyle(color: Colors.red)),
                    const SizedBox(height: 10),
                  ],
                  Expanded(
                    child: ListView.builder(
                      itemCount: medicines.length,
                      itemBuilder: (context, index) {
                        final med = medicines[index];
                        final days = velocityByMedicineId[med.id];
                        return Card(
                          margin: const EdgeInsets.symmetric(vertical: 6),
                          child: ListTile(
                            title: Text(med.name),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Prev: ${med.previousQuantity}'),
                                if (days != null)
                                  Text('Days remaining: $days', style: const TextStyle(color: Colors.green)),
                              ],
                            ),
                            trailing: SizedBox(
                              width: 90,
                              child: TextField(
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(hintText: 'Qty'),
                                onChanged: (v) => _quantities[med.id] = v,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  Row(
                    children: [
                      Expanded(child: ElevatedButton(onPressed: _submitEntries, child: const Text('Submit'))),
                      const SizedBox(width: 8),
                      Expanded(child: OutlinedButton(onPressed: _syncPendingEntries, child: const Text('Sync (disabled)'))),
                    ],
                  ),
                ],
              ),
            ),
    );
  }
}
