class Medicine {
  final String id;
  final String name;
  final int previousQuantity;

  Medicine({required this.id, required this.name, required this.previousQuantity});

  factory Medicine.fromJson(Map<String, dynamic> json) {
    return Medicine(
      id: json['id'].toString(),
      name: json['name'] ?? json['medicineName'] ?? 'Medicine',
      previousQuantity: json['previousQuantity'] is int ? json['previousQuantity'] : int.tryParse(json['previousQuantity']?.toString() ?? '0') ?? 0,
    );
  }
}
