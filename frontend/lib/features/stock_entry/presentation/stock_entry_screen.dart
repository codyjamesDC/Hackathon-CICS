// ignore_for_file: avoid_print
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:go_router/go_router.dart';
import 'package:hackathon_cics/core/network/connectivity_provider.dart';
import 'package:hackathon_cics/core/theme/app_colors.dart';
import 'package:hackathon_cics/features/stock_entry/domain/stock_entry_model.dart';
import 'package:hackathon_cics/features/stock_entry/presentation/stock_entry_provider.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import 'package:skeletonizer/skeletonizer.dart';

class StockEntryScreen extends ConsumerWidget {
  const StockEntryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final medicinesAsync = ref.watch(medicinesProvider);
    final entryState = ref.watch(stockEntryProvider);
    final online = ref.watch(isOnlineProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: medicinesAsync.when(
        loading: () {
          print('[SCREEN] medicines loading...');
          return _buildSkeleton();
        },
        error: (e, st) {
          print('[SCREEN] medicines ERROR: $e');
          print('[SCREEN] stackTrace: $st');
          return _buildError(e.toString(), ref);
        },
        data: (medicines) {
          print('[SCREEN] medicines loaded: ${medicines.length} items');
          return _buildContent(
            context,
            ref,
            medicines,
            entryState,
            online,
          );
        },
      ),
    );
  }

  Widget _buildSkeleton() {
    return Skeletonizer(
      enabled: true,
      child: ListView.separated(
        padding: EdgeInsets.all(16.w),
        itemCount: 8,
        separatorBuilder: (context, index) => Gap(8.h),
        itemBuilder: (context, index) => _MedicineTile(
          medicine: const MedicineModel(
            id: 'x',
            genericName: 'Medicine Name Placeholder',
            unit: 'tablet',
            category: 'Category',
            criticalThresholdDays: 7,
          ),
          quantity: 0,
          onChanged: (_) {},
        ),
      ),
    );
  }

  Widget _buildError(String message, WidgetRef ref) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(24.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded, size: 48.sp, color: AppColors.textMuted),
            Gap(12.h),
            Text(
              'Could not load medicines',
              style: TextStyle(
                fontSize: 16.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            Gap(6.h),
            Text(
              message,
              style: TextStyle(fontSize: 12.sp, color: AppColors.textMuted),
              textAlign: TextAlign.center,
            ),
            Gap(20.h),
            ShadButton.outline(
              onPressed: () => ref.invalidate(medicinesProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    WidgetRef ref,
    List<MedicineModel> medicines,
    StockEntryState entryState,
    bool online,
  ) {
    final filledCount = entryState.quantities.length;

    return Column(
      children: [
        _buildProgressHeader(filledCount, medicines.length),
        Expanded(
          child: ListView.separated(
            padding: EdgeInsets.fromLTRB(16.w, 12.h, 16.w, 100.h),
            itemCount: medicines.length,
            separatorBuilder: (context, index) => Gap(8.h),
            itemBuilder: (context, i) {
              final med = medicines[i];
              return _MedicineTile(
                medicine: med,
                quantity: entryState.quantities[med.id] ?? 0,
                onChanged: (val) => ref
                    .read(stockEntryProvider.notifier)
                    .updateQuantity(med.id, val),
              );
            },
          ),
        ),
        _buildSubmitBar(context, ref, medicines, entryState, online, filledCount),
      ],
    );
  }

  Widget _buildProgressHeader(int filled, int total) {
    final progress = total == 0 ? 0.0 : filled / total;
    return Container(
      color: AppColors.surface,
      padding: EdgeInsets.fromLTRB(16.w, 12.h, 16.w, 12.h),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '$filled / $total medicines filled',
                style: TextStyle(
                  fontSize: 13.sp,
                  color: AppColors.textSecondary,
                ),
              ),
              const Spacer(),
              Text(
                '${(progress * 100).round()}%',
                style: TextStyle(
                  fontSize: 13.sp,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          Gap(8.h),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 4.h,
              backgroundColor: AppColors.border,
              valueColor: const AlwaysStoppedAnimation(AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitBar(
    BuildContext context,
    WidgetRef ref,
    List<MedicineModel> medicines,
    StockEntryState entryState,
    bool online,
    int filledCount,
  ) {
    final canSubmit = online && filledCount > 0 && !entryState.isSubmitting;

    return Container(
      padding: EdgeInsets.fromLTRB(16.w, 12.h, 16.w, 24.h),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: ShadButton(
        onPressed: canSubmit
            ? () => _submit(context, ref, medicines, entryState)
            : null,
        width: double.infinity,
        child: entryState.isSubmitting
            ? SizedBox(
                width: 16.w,
                height: 16.w,
                child: const CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.background,
                ),
              )
            : Text(
                online
                    ? 'Submit Stock Count ($filledCount)'
                    : 'Offline — Cannot Submit',
                style: TextStyle(
                  fontSize: 14.sp,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

  Future<void> _submit(
    BuildContext context,
    WidgetRef ref,
    List<MedicineModel> medicines,
    StockEntryState entryState,
  ) async {
    FocusScope.of(context).unfocus();
    final notifier = ref.read(stockEntryProvider.notifier);
    final result = await notifier.submitAll(medicines);

    if (!context.mounted) return;

    if (result != null) {
      final breaches = result.entries.where((e) => e.velocity.breachTriggered).toList();
      ShadToaster.of(context).show(
        ShadToast(
          alignment: Alignment.topCenter,
          title: Text(breaches.isEmpty
              ? 'Stock count submitted!'
              : '⚠️ ${breaches.length} threshold breach${breaches.length > 1 ? 'es' : ''} detected'),
          description: Text('${result.entries.length} entries recorded.'),
        ),
      );
      notifier.reset();
    } else {
      final error = ref.read(stockEntryProvider).error;
      ShadToaster.of(context).show(
        ShadToast.destructive(
          alignment: Alignment.topCenter,
          title: const Text('Submission failed'),
          description: Text(error ?? 'Unknown error'),
        ),
      );
    }
  }
}

class _MedicineTile extends StatefulWidget {
  final MedicineModel medicine;
  final int quantity;
  final ValueChanged<int> onChanged;

  const _MedicineTile({
    required this.medicine,
    required this.quantity,
    required this.onChanged,
  });

  @override
  State<_MedicineTile> createState() => _MedicineTileState();
}

class _MedicineTileState extends State<_MedicineTile> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(
      text: widget.quantity > 0 ? widget.quantity.toString() : '',
    );
  }

  @override
  void didUpdateWidget(_MedicineTile old) {
    super.didUpdateWidget(old);
    final newText = widget.quantity > 0 ? widget.quantity.toString() : '';
    if (_ctrl.text != newText) {
      _ctrl.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: newText.length),
      );
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filled = widget.quantity > 0;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: filled ? AppColors.primary.withValues(alpha: 0.4) : AppColors.border,
        ),
      ),
      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.medicine.genericName,
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                Gap(2.h),
                Text(
                  '${widget.medicine.unit} · ${widget.medicine.category}',
                  style: TextStyle(
                    fontSize: 11.sp,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Gap(12.w),
          SizedBox(
            width: 80.w,
            child: TextFormField(
              controller: _ctrl,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
              decoration: InputDecoration(
                hintText: '0',
                hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 15.sp),
                filled: true,
                fillColor: AppColors.surfaceAlt,
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 8.w,
                  vertical: 10.h,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: AppColors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: AppColors.primary),
                ),
              ),
              onChanged: (val) {
                final parsed = int.tryParse(val) ?? 0;
                widget.onChanged(parsed);
              },
            ),
          ),
        ],
      ),
    );
  }
}
