import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/medicine.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

enum _ScreenState { table, submitting, result }

class StockEntryScreen extends StatefulWidget {
  final String token;
  final String rhuId;

  const StockEntryScreen({super.key, required this.token, required this.rhuId});

  @override
  State<StockEntryScreen> createState() => _StockEntryScreenState();
}

class _StockEntryScreenState extends State<StockEntryScreen>
    with TickerProviderStateMixin {
  final _api = ApiService();
  final _quantities = <String, TextEditingController>{};
  final _focusNodes = <String, FocusNode>{};

  List<Medicine> medicines = [];
  bool _loadingMeds = true;
  String? _loadError;
  _ScreenState _screen = _ScreenState.table;

  // Submission results
  final Map<String, double> _daysRemaining = {};
  final Map<String, double> _velocityPerDay = {};
  final Map<String, bool> _submitted = {};
  final Map<String, bool> _failed = {};
  int _successCount = 0;

  // Animations
  late AnimationController _tableController;
  late AnimationController _resultController;
  late Animation<double> _tableFade;
  late Animation<Offset> _resultSlide;
  late Animation<double> _resultFade;

  @override
  void initState() {
    super.initState();

    _tableController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _tableFade = CurvedAnimation(
        parent: _tableController, curve: Curves.easeOut);

    _resultController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _resultSlide = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(
        parent: _resultController, curve: Curves.easeOutCubic));
    _resultFade = CurvedAnimation(
        parent: _resultController, curve: Curves.easeOut);

    _loadMedicines();
  }

  @override
  void dispose() {
    _tableController.dispose();
    _resultController.dispose();
    for (final c in _quantities.values) c.dispose();
    for (final f in _focusNodes.values) f.dispose();
    super.dispose();
  }

  Future<void> _loadMedicines() async {
    setState(() {
      _loadingMeds = true;
      _loadError = null;
    });
    try {
      final data = await _api.fetchMedicines(widget.token);
      final meds = data
          .map((e) => Medicine.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      for (final med in meds) {
        _quantities[med.id] = TextEditingController();
        _focusNodes[med.id] = FocusNode();
      }
      setState(() => medicines = meds);
      _tableController.forward();
    } catch (_) {
      setState(() => _loadError = 'Could not load medicines. Check your connection.');
    } finally {
      setState(() => _loadingMeds = false);
    }
  }

  int get _filledCount =>
      _quantities.values.where((c) => c.text.trim().isNotEmpty).length;

  Future<void> _submit() async {
    final toSubmit = medicines
        .where((m) => int.tryParse(_quantities[m.id]?.text ?? '') != null)
        .toList();
    if (toSubmit.isEmpty) return;

    setState(() => _screen = _ScreenState.submitting);
    await Future.delayed(const Duration(milliseconds: 200));

    final newDays = <String, double>{};
    final newVel = <String, double>{};
    final newOk = <String, bool>{};
    final newFail = <String, bool>{};
    int ok = 0;

    for (final med in toSubmit) {
      final qty = int.parse(_quantities[med.id]!.text);
      try {
        final res = await _api.submitStockEntry(widget.token, {
          'medicineId': med.id,
          'quantityOnHand': qty,
          'rhuId': widget.rhuId,
          'submittedAt': DateTime.now().toUtc().toIso8601String(),
        });
        final v = res['velocity'];
        if (v is Map<String, dynamic>) {
          final days = v['daysRemaining'];
          final vel = v['velocityPerDay'];
          if (days != null) newDays[med.id] = (days as num).toDouble();
          if (vel != null) newVel[med.id] = (vel as num).toDouble();
        }
        newOk[med.id] = true;
        ok++;
      } catch (_) {
        newFail[med.id] = true;
      }
    }

    setState(() {
      _daysRemaining.addAll(newDays);
      _velocityPerDay.addAll(newVel);
      _submitted.addAll(newOk);
      _failed.addAll(newFail);
      _successCount = ok;
      _screen = _ScreenState.result;
    });

    _resultController.forward();
  }

  void _resetForm() {
    for (final c in _quantities.values) c.clear();
    _submitted.clear();
    _failed.clear();
    _daysRemaining.clear();
    _velocityPerDay.clear();
    _resultController.reset();
    _tableController.reset();
    setState(() => _screen = _ScreenState.table);
    _tableController.forward();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AgapTheme.slate50,
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 350),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeIn,
        child: switch (_screen) {
          _ScreenState.submitting => _buildSubmitting(),
          _ScreenState.result => _buildResult(),
          _ => _buildTableScreen(),
        },
      ),
    );
  }

  // ── TABLE SCREEN ───────────────────────────────────────────────────────────

  Widget _buildTableScreen() {
    return Scaffold(
      key: const ValueKey('table'),
      backgroundColor: AgapTheme.slate50,
      body: Column(
        children: [
          _buildHeader(),
          if (_loadingMeds) _buildLoadingBody(),
          if (_loadError != null && !_loadingMeds) _buildErrorBody(),
          if (!_loadingMeds && _loadError == null)
            Expanded(
              child: FadeTransition(
                opacity: _tableFade,
                child: Column(
                  children: [
                    _buildSummaryStrip(),
                    _buildColumnHeaders(),
                    Expanded(child: _buildMedicineList()),
                  ],
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: (!_loadingMeds && _loadError == null)
          ? _buildSubmitBar()
          : null,
    );
  }

  Widget _buildHeader() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AgapTheme.teal900, AgapTheme.teal700],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AgapTheme.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: AgapTheme.white.withOpacity(0.2), width: 1),
                ),
                child: const Icon(Icons.medication_liquid_rounded,
                    color: AgapTheme.white, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Stock Entry',
                      style: TextStyle(
                        color: AgapTheme.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                    ),
                    Text(
                      'RHU · ${widget.rhuId.length > 12 ? '${widget.rhuId.substring(0, 12)}…' : widget.rhuId}',
                      style: TextStyle(
                        color: AgapTheme.teal100.withOpacity(0.8),
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              // Date badge
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AgapTheme.white.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _todayLabel(),
                  style: const TextStyle(
                    color: AgapTheme.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _todayLabel() {
    final now = DateTime.now();
    const months = [
      'Jan','Feb','Mar','Apr','May','Jun',
      'Jul','Aug','Sep','Oct','Nov','Dec'
    ];
    return '${months[now.month - 1]} ${now.day}';
  }

  Widget _buildLoadingBody() {
    return const Expanded(
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(
                color: AgapTheme.teal600, strokeWidth: 2.5),
            SizedBox(height: 16),
            Text('Loading medicine catalog…',
                style: TextStyle(
                    color: AgapTheme.slate500, fontSize: 14)),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorBody() {
    return Expanded(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(36),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AgapTheme.red50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.wifi_off_rounded,
                    color: AgapTheme.red500, size: 30),
              ),
              const SizedBox(height: 20),
              Text(_loadError!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: AgapTheme.slate500, fontSize: 14)),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _loadMedicines,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryStrip() {
    final filled = _filledCount;
    return Container(
      color: AgapTheme.white,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
      child: Row(
        children: [
          _chip(
            icon: Icons.medication_outlined,
            label: '${medicines.length} total',
            color: AgapTheme.teal600,
          ),
          const SizedBox(width: 8),
          _chip(
            icon: Icons.edit_rounded,
            label: '$filled filled',
            color: filled > 0 ? AgapTheme.teal700 : AgapTheme.slate400,
          ),
          const Spacer(),
          if (filled > 0)
            _chip(
              icon: Icons.check_rounded,
              label: 'Ready',
              color: AgapTheme.green500,
            ),
        ],
      ),
    );
  }

  Widget _chip(
      {required IconData icon,
      required String label,
      required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(label,
              style: TextStyle(
                  fontSize: 11,
                  color: color,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildColumnHeaders() {
    return Container(
      decoration: const BoxDecoration(
        color: AgapTheme.slate100,
        border: Border.symmetric(
            horizontal: BorderSide(color: AgapTheme.slate200)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 9),
      child: Row(
        children: [
          const Expanded(
            flex: 3,
            child: Text('MEDICINE',
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: AgapTheme.slate500,
                    letterSpacing: 0.9)),
          ),
          SizedBox(
            width: 108,
            child: Text('QTY ON HAND',
                textAlign: TextAlign.center,
                style: AgapTheme.label()),
          ),
          SizedBox(
            width: 76,
            child: Text('DAYS LEFT',
                textAlign: TextAlign.center,
                style: AgapTheme.label()),
          ),
        ],
      ),
    );
  }

  Widget _buildMedicineList() {
    return ListView.builder(
      itemCount: medicines.length,
      itemBuilder: (context, i) {
        final med = medicines[i];
        return _MedicineRow(
          medicine: med,
          index: i,
          controller: _quantities[med.id]!,
          focusNode: _focusNodes[med.id]!,
          nextFocusNode: i < medicines.length - 1
              ? _focusNodes[medicines[i + 1].id]
              : null,
          daysRemaining: _daysRemaining[med.id],
          isSubmitted: _submitted[med.id] == true,
          isFailed: _failed[med.id] == true,
          onChanged: () => setState(() {}),
        );
      },
    );
  }

  Widget _buildSubmitBar() {
    final filled = _filledCount;
    final canSubmit = filled > 0;
    return Container(
      decoration: BoxDecoration(
        color: AgapTheme.white,
        border: const Border(
            top: BorderSide(color: AgapTheme.slate200)),
        boxShadow: [
          BoxShadow(
            color: AgapTheme.slate900.withOpacity(0.06),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(
          20, 14, 20, MediaQuery.of(context).padding.bottom + 14),
      child: SizedBox(
        width: double.infinity,
        height: 54,
        child: ElevatedButton(
          onPressed: canSubmit ? _submit : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AgapTheme.teal700,
            disabledBackgroundColor: AgapTheme.slate200,
            foregroundColor: AgapTheme.white,
            disabledForegroundColor: AgapTheme.slate400,
            elevation: 0,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.upload_rounded, size: 20),
              const SizedBox(width: 8),
              Text(
                canSubmit
                    ? 'Submit $filled ${filled == 1 ? 'Entry' : 'Entries'}'
                    : 'Enter quantities to submit',
                style: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── SUBMITTING SCREEN ──────────────────────────────────────────────────────

  Widget _buildSubmitting() {
    return Scaffold(
      key: const ValueKey('submitting'),
      backgroundColor: AgapTheme.slate50,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AgapTheme.teal50,
                shape: BoxShape.circle,
                border: Border.all(color: AgapTheme.teal100, width: 2),
              ),
              child: const Padding(
                padding: EdgeInsets.all(18),
                child: CircularProgressIndicator(
                    color: AgapTheme.teal600, strokeWidth: 3),
              ),
            ),
            const SizedBox(height: 24),
            Text('Submitting entries…',
                style: AgapTheme.display(size: 18)),
            const SizedBox(height: 8),
            Text(
              'Sending to RHU server',
              style: AgapTheme.body(size: 13, color: AgapTheme.slate500),
            ),
          ],
        ),
      ),
    );
  }

  // ── RESULT SCREEN ──────────────────────────────────────────────────────────

  Widget _buildResult() {
    final failCount = _failed.length;
    final allGood = failCount == 0;

    return Scaffold(
      key: const ValueKey('result'),
      backgroundColor: AgapTheme.slate50,
      body: SlideTransition(
        position: _resultSlide,
        child: FadeTransition(
          opacity: _resultFade,
          child: Column(
            children: [
              _buildResultHeader(allGood, failCount),
              Expanded(child: _buildResultList()),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _buildResultFooter(),
    );
  }

  Widget _buildResultHeader(bool allGood, int failCount) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: allGood
              ? [const Color(0xFF065F46), const Color(0xFF059669)]
              : [const Color(0xFF7C2D12), const Color(0xFFDC2626)],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AgapTheme.white.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      allGood
                          ? Icons.check_rounded
                          : Icons.warning_amber_rounded,
                      color: AgapTheme.white,
                      size: 24,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AgapTheme.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _todayLabel(),
                      style: const TextStyle(
                          color: AgapTheme.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                allGood ? 'All Submitted!' : 'Partially Submitted',
                style: const TextStyle(
                  color: AgapTheme.white,
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                allGood
                    ? '$_successCount ${_successCount == 1 ? 'entry' : 'entries'} sent successfully'
                    : '$_successCount submitted · $failCount failed',
                style: TextStyle(
                  color: AgapTheme.white.withOpacity(0.8),
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 20),
              // Stats row
              Row(
                children: [
                  _resultStat(
                    label: 'Submitted',
                    value: '$_successCount',
                    icon: Icons.check_circle_outline_rounded,
                  ),
                  const SizedBox(width: 12),
                  if (failCount > 0)
                    _resultStat(
                      label: 'Failed',
                      value: '$failCount',
                      icon: Icons.cancel_outlined,
                    ),
                  const SizedBox(width: 12),
                  _resultStat(
                    label: 'Total',
                    value: '${_successCount + failCount}',
                    icon: Icons.list_alt_rounded,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _resultStat(
      {required String label,
      required String value,
      required IconData icon}) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AgapTheme.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: AgapTheme.white, size: 18),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value,
                    style: const TextStyle(
                        color: AgapTheme.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        height: 1)),
                Text(label,
                    style: TextStyle(
                        color: AgapTheme.white.withOpacity(0.7),
                        fontSize: 10,
                        fontWeight: FontWeight.w500)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultList() {
    final shown = medicines
        .where((m) => _submitted[m.id] == true || _failed[m.id] == true)
        .toList();

    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: shown.length,
      separatorBuilder: (_, __) =>
          const Divider(height: 1, color: AgapTheme.slate200),
      itemBuilder: (context, i) {
        final med = shown[i];
        final days = _daysRemaining[med.id];
        final vel = _velocityPerDay[med.id];
        final ok = _submitted[med.id] == true;
        final qty = int.tryParse(_quantities[med.id]?.text ?? '');

        return Container(
          color: ok ? AgapTheme.white : AgapTheme.red50,
          padding:
              const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Row(
            children: [
              // Status icon
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: ok
                      ? AgapTheme.green50
                      : AgapTheme.red50,
                  shape: BoxShape.circle,
                  border: Border.all(
                      color: ok
                          ? AgapTheme.green500.withOpacity(0.3)
                          : AgapTheme.red500.withOpacity(0.3)),
                ),
                child: Icon(
                  ok
                      ? Icons.check_rounded
                      : Icons.close_rounded,
                  color: ok ? AgapTheme.green500 : AgapTheme.red500,
                  size: 18,
                ),
              ),
              const SizedBox(width: 12),

              // Medicine name + qty
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(med.name,
                        style: AgapTheme.body(
                            size: 13, weight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Text(
                          qty != null ? '$qty units' : '—',
                          style: AgapTheme.body(
                              size: 11,
                              color: AgapTheme.slate500),
                        ),
                        if (vel != null) ...[
                          Text(' · ',
                              style: AgapTheme.body(
                                  size: 11,
                                  color: AgapTheme.slate400)),
                          Text(
                            '${vel.toStringAsFixed(1)}/day',
                            style: AgapTheme.body(
                                size: 11,
                                color: AgapTheme.slate500),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),

              // Days badge
              if (ok && days != null)
                _DaysBadge(days: days)
              else if (!ok)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AgapTheme.red50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                        color: AgapTheme.red500.withOpacity(0.3)),
                  ),
                  child: const Text('Failed',
                      style: TextStyle(
                          fontSize: 11,
                          color: AgapTheme.red500,
                          fontWeight: FontWeight.w700)),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildResultFooter() {
    return Container(
      decoration: BoxDecoration(
        color: AgapTheme.white,
        border: const Border(
            top: BorderSide(color: AgapTheme.slate200)),
        boxShadow: [
          BoxShadow(
            color: AgapTheme.slate900.withOpacity(0.06),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(
          20, 14, 20, MediaQuery.of(context).padding.bottom + 14),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: _resetForm,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('New Entry'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AgapTheme.teal700,
                side: const BorderSide(color: AgapTheme.teal600),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton.icon(
              onPressed: () {
                // Navigation to home/dashboard would go here
              },
              icon: const Icon(Icons.home_rounded, size: 18),
              label: const Text('Done'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AgapTheme.teal700,
                foregroundColor: AgapTheme.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Sub-widgets ──────────────────────────────────────────────────────────────

class _MedicineRow extends StatefulWidget {
  final Medicine medicine;
  final int index;
  final TextEditingController controller;
  final FocusNode focusNode;
  final FocusNode? nextFocusNode;
  final double? daysRemaining;
  final bool isSubmitted;
  final bool isFailed;
  final VoidCallback onChanged;

  const _MedicineRow({
    required this.medicine,
    required this.index,
    required this.controller,
    required this.focusNode,
    required this.nextFocusNode,
    required this.daysRemaining,
    required this.isSubmitted,
    required this.isFailed,
    required this.onChanged,
  });

  @override
  State<_MedicineRow> createState() => _MedicineRowState();
}

class _MedicineRowState extends State<_MedicineRow> {
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    widget.focusNode.addListener(() {
      setState(() => _focused = widget.focusNode.hasFocus);
    });
  }

  @override
  Widget build(BuildContext context) {
    final hasValue = widget.controller.text.trim().isNotEmpty;

    Color rowBg = AgapTheme.white;
    if (widget.isSubmitted) rowBg = AgapTheme.green50;
    if (widget.isFailed) rowBg = AgapTheme.red50;
    if (!widget.isSubmitted && !widget.isFailed && hasValue) {
      rowBg = AgapTheme.teal50;
    }

    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      color: rowBg,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: 20, vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Index + name
                Expanded(
                  flex: 3,
                  child: Row(
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: _focused
                              ? AgapTheme.teal600
                              : AgapTheme.teal600.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(9),
                        ),
                        child: Center(
                          child: Text(
                            '${widget.index + 1}',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: _focused
                                  ? AgapTheme.white
                                  : AgapTheme.teal600,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.medicine.name,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AgapTheme.slate900,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 1),
                            Text(
                              'Prev: ${widget.medicine.previousQuantity}',
                              style: const TextStyle(
                                  fontSize: 10,
                                  color: AgapTheme.slate500),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Qty input
                SizedBox(
                  width: 108,
                  child: Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8),
                    child: TextField(
                      controller: widget.controller,
                      focusNode: widget.focusNode,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly
                      ],
                      textInputAction: widget.nextFocusNode != null
                          ? TextInputAction.next
                          : TextInputAction.done,
                      onSubmitted: (_) =>
                          widget.nextFocusNode?.requestFocus(),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AgapTheme.slate900,
                      ),
                      decoration: InputDecoration(
                        hintText: '0',
                        hintStyle: const TextStyle(
                            color: AgapTheme.slate200,
                            fontSize: 16,
                            fontWeight: FontWeight.w400),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 10),
                        filled: true,
                        fillColor: _focused
                            ? AgapTheme.teal50
                            : AgapTheme.slate50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(9),
                          borderSide: const BorderSide(
                              color: AgapTheme.slate200),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(9),
                          borderSide: BorderSide(
                              color: hasValue
                                  ? AgapTheme.teal500
                                  : AgapTheme.slate200),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(9),
                          borderSide: const BorderSide(
                              color: AgapTheme.teal600, width: 2),
                        ),
                      ),
                      onChanged: (_) => widget.onChanged(),
                    ),
                  ),
                ),

                // Days cell
                SizedBox(
                  width: 76,
                  child: widget.daysRemaining != null
                      ? _DaysBadge(days: widget.daysRemaining!)
                      : const Center(
                          child: Text('—',
                              style: TextStyle(
                                  color: AgapTheme.slate300,
                                  fontSize: 18))),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AgapTheme.slate200),
        ],
      ),
    );
  }
}

class _DaysBadge extends StatelessWidget {
  final double days;
  const _DaysBadge({required this.days});

  @override
  Widget build(BuildContext context) {
    final color = AgapTheme.statusColor(days);
    final bg = AgapTheme.statusBg(days);
    final label = AgapTheme.statusLabel(days);
    final icon = AgapTheme.statusIcon(days);

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(7),
              border: Border.all(color: color.withOpacity(0.35)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 10, color: color),
                const SizedBox(width: 3),
                Text(
                  '${days.toStringAsFixed(1)}d',
                  style: TextStyle(
                      fontSize: 11,
                      color: color,
                      fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
          const SizedBox(height: 3),
          Text(label,
              style: TextStyle(
                  fontSize: 9,
                  color: color,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}