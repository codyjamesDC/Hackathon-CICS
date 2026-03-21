// ignore_for_file: avoid_print
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:hackathon_cics/core/auth/auth_provider.dart';
import 'package:hackathon_cics/core/theme/app_colors.dart';
import 'package:hackathon_cics/features/rhu_status/domain/rhu_status_model.dart';
import 'package:hackathon_cics/features/rhu_status/presentation/rhu_status_provider.dart';
import 'package:hackathon_cics/features/rhu_status/presentation/widgets/medicine_history_chart.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import 'package:skeletonizer/skeletonizer.dart';

class RhuStatusScreen extends ConsumerStatefulWidget {
  const RhuStatusScreen({super.key});

  @override
  ConsumerState<RhuStatusScreen> createState() => _RhuStatusScreenState();
}

class _RhuStatusScreenState extends ConsumerState<RhuStatusScreen> {
  RhuUrgency? _filter;

  @override
  Widget build(BuildContext context) {
    final statusAsync = ref.watch(rhuStatusProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: statusAsync.when(
        loading: () {
          print('[SCREEN] rhu status loading...');
          return _buildSkeleton();
        },
        error: (e, st) {
          print('[SCREEN] rhu status ERROR: $e');
          return _buildError(e.toString());
        },
        data: (summary) {
          print('[SCREEN] rhu status loaded: ${summary.medicines.length} medicines');
          return _buildContent(summary);
        },
      ),
    );
  }

  Widget _buildSkeleton() {
    return Skeletonizer(
      enabled: true,
      child: ListView.separated(
        padding: EdgeInsets.all(16.w),
        itemCount: 6,
        separatorBuilder: (_, __) => Gap(8.h),
        itemBuilder: (_, __) => const _MedicineStatusTile(
          medicine: MedicineStatus(
            medicineId: 'x',
            medicineName: 'Medicine Name Placeholder',
            unit: 'tablet',
            currentStock: 120,
            velocityPerDay: 8.5,
            daysRemaining: 14.1,
            breachTriggered: false,
            urgency: RhuUrgency.ok,
          ),
        ),
      ),
    );
  }

  Widget _buildError(String message) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(24.w),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.warning_amber_rounded,
                size: 48.sp, color: AppColors.textMuted),
            Gap(12.h),
            Text(
              'Could not load RHU status',
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
              onPressed: () => ref.invalidate(rhuStatusProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(RhuStatusSummary summary) {
    final sorted = summary.sorted;
    final filtered = _filter == null
        ? sorted
        : sorted.where((m) => m.urgency == _filter).toList();

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(rhuStatusProvider),
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _buildHeader(summary)),
          if (filtered.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Text(
                  'No medicines in this category.',
                  style: TextStyle(fontSize: 13.sp, color: AppColors.textMuted),
                ),
              ),
            )
          else
            SliverPadding(
              padding: EdgeInsets.fromLTRB(16.w, 0, 16.w, 24.h),
              sliver: SliverList.separated(
                itemCount: filtered.length,
                separatorBuilder: (_, __) => Gap(8.h),
                itemBuilder: (_, i) => _MedicineStatusTile(medicine: filtered[i]),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeader(RhuStatusSummary summary) {
    final urgencyColor = _urgencyColor(summary.overallUrgency);
    final urgencyLabel = _urgencyLabel(summary.overallUrgency);

    final filters = <({RhuUrgency? urgency, String label})>[
      (urgency: null, label: 'All'),
      (urgency: RhuUrgency.critical, label: 'Critical'),
      (urgency: RhuUrgency.warning, label: 'Warning'),
      (urgency: RhuUrgency.ok, label: 'Stable'),
    ];

    final rhuName = ref.watch(authProvider).rhuName ?? 'My RHU';

    return Container(
      color: AppColors.surface,
      padding: EdgeInsets.fromLTRB(16.w, 14.h, 16.w, 12.h),
      margin: EdgeInsets.only(bottom: 12.h),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Text(
                  rhuName,
                  style: TextStyle(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Gap(8.w),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 9.w, vertical: 4.h),
                decoration: BoxDecoration(
                  color: urgencyColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: urgencyColor.withValues(alpha: 0.35)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6.w,
                      height: 6.w,
                      decoration: BoxDecoration(
                        color: urgencyColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Gap(5.w),
                    Text(
                      urgencyLabel,
                      style: TextStyle(
                        fontSize: 11.sp,
                        fontWeight: FontWeight.w600,
                        color: urgencyColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          Gap(12.h),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: filters.map((f) {
                final selected = _filter == f.urgency;
                final chipColor = f.urgency == null
                    ? AppColors.primary
                    : _urgencyColor(f.urgency!);
                return Padding(
                  padding: EdgeInsets.only(right: 8.w),
                  child: GestureDetector(
                    onTap: () => setState(() => _filter = f.urgency),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 6.h),
                      decoration: BoxDecoration(
                        color: selected
                            ? chipColor.withValues(alpha: 0.18)
                            : AppColors.background,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: selected
                              ? chipColor.withValues(alpha: 0.6)
                              : AppColors.border,
                        ),
                      ),
                      child: Text(
                        f.label,
                        style: TextStyle(
                          fontSize: 12.sp,
                          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                          color: selected ? chipColor : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Color _urgencyColor(RhuUrgency u) => switch (u) {
        RhuUrgency.critical => AppColors.statusCritical,
        RhuUrgency.warning => AppColors.statusWarning,
        RhuUrgency.ok => AppColors.statusOk,
        RhuUrgency.silent => AppColors.statusSilent,
        RhuUrgency.unmonitored => AppColors.textMuted,
      };

  String _urgencyLabel(RhuUrgency u) => switch (u) {
        RhuUrgency.critical => 'Critical',
        RhuUrgency.warning => 'Warning',
        RhuUrgency.ok => 'Stable',
        RhuUrgency.silent => 'Silent',
        RhuUrgency.unmonitored => 'Unmonitored',
      };
}

class _MedicineStatusTile extends StatefulWidget {
  final MedicineStatus medicine;

  const _MedicineStatusTile({required this.medicine});

  @override
  State<_MedicineStatusTile> createState() => _MedicineStatusTileState();
}

class _MedicineStatusTileState extends State<_MedicineStatusTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final medicine = widget.medicine;
    final color = _urgencyColor(medicine.urgency);
    final daysText = medicine.daysRemaining >= 999
        ? 'No data'
        : medicine.daysRemaining < 1
            ? '< 1 day'
            : '${medicine.daysRemaining.toStringAsFixed(1)} days';

    return GestureDetector(
      onTap: () => setState(() => _expanded = !_expanded),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      padding: EdgeInsets.all(14.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  medicine.medicineName,
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Text(
                  daysText,
                  style: TextStyle(
                    fontSize: 11.sp,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              ),
              Gap(6.w),
              AnimatedRotation(
                  turns: _expanded ? 0 : -0.5,
                  duration: const Duration(milliseconds: 200),
                  child: Icon(
                    Icons.keyboard_arrow_down_rounded,
                    size: 18.sp,
                    color: AppColors.textMuted,
                  ),
              ),
            ],
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            child: _expanded
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Gap(8.h),
                      Row(
                        children: [
                          Icon(Iconsax.chart, size: 11.sp, color: AppColors.textMuted),
                          Gap(4.w),
                          Text(
                            '${medicine.velocityPerDay.toStringAsFixed(1)} ${medicine.unit}/day',
                            style: TextStyle(fontSize: 11.sp, color: AppColors.textMuted),
                          ),
                          Gap(12.w),
                          Icon(Iconsax.box, size: 11.sp, color: AppColors.textMuted),
                          Gap(4.w),
                          Text(
                            '${medicine.currentStock} ${medicine.unit} on hand',
                            style: TextStyle(fontSize: 11.sp, color: AppColors.textMuted),
                          ),
                          if (medicine.breachTriggered) ...[
                            const Spacer(),
                            Icon(Iconsax.warning_2,
                                size: 12.sp, color: AppColors.statusCritical),
                            Gap(3.w),
                            Text(
                              'Breach',
                              style: TextStyle(
                                fontSize: 10.sp,
                                color: AppColors.statusCritical,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ],
                      ),
                      Gap(16.h),
                      Container(
                        width: double.infinity,
                        padding: EdgeInsets.all(12.w),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: MedicineHistoryChart(medicine: medicine),
                      ),
                    ],
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    ),
    );
  }

  Color _urgencyColor(RhuUrgency u) => switch (u) {
        RhuUrgency.critical => AppColors.statusCritical,
        RhuUrgency.warning => AppColors.statusWarning,
        RhuUrgency.ok => AppColors.statusOk,
        RhuUrgency.silent => AppColors.statusSilent,
        RhuUrgency.unmonitored => AppColors.textMuted,
      };
}
