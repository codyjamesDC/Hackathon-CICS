// ignore_for_file: avoid_print
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:hackathon_cics/core/auth/auth_provider.dart';
import 'package:hackathon_cics/core/theme/app_colors.dart';
import 'package:hackathon_cics/features/rhu_status/domain/rhu_status_model.dart';
import 'package:hackathon_cics/features/rhu_status/presentation/rhu_status_provider.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import 'package:skeletonizer/skeletonizer.dart';

class RhuStatusScreen extends ConsumerWidget {
  const RhuStatusScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusAsync = ref.watch(rhuStatusProvider);
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: statusAsync.when(
        loading: () {
          print('[SCREEN] rhu status loading...');
          return _buildSkeleton();
        },
        error: (e, st) {
          print('[SCREEN] rhu status ERROR: $e');
          return _buildError(e.toString(), ref);
        },
        data: (summary) {
          print('[SCREEN] rhu status loaded: ${summary.medicines.length} medicines');
          return _buildContent(context, ref, summary, authState.rhuName ?? 'My RHU');
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
        separatorBuilder: (context, index) => Gap(8.h),
        itemBuilder: (context, index) => _MedicineStatusTile(
          medicine: const MedicineStatus(
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

  Widget _buildError(String message, WidgetRef ref) {
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

  Widget _buildContent(
    BuildContext context,
    WidgetRef ref,
    RhuStatusSummary summary,
    String rhuName,
  ) {
    final sorted = summary.sorted;

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(rhuStatusProvider),
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _buildStatusHeader(summary, rhuName)),
          SliverPadding(
            padding: EdgeInsets.fromLTRB(16.w, 0, 16.w, 24.h),
            sliver: SliverList.separated(
              itemCount: sorted.length,
              separatorBuilder: (context, index) => Gap(8.h),
              itemBuilder: (context, i) =>
                  _MedicineStatusTile(medicine: sorted[i]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusHeader(RhuStatusSummary summary, String rhuName) {
    final urgencyColor = _urgencyColor(summary.overallUrgency);
    final urgencyLabel = _urgencyLabel(summary.overallUrgency);

    return Container(
      color: AppColors.surface,
      padding: EdgeInsets.fromLTRB(16.w, 14.h, 16.w, 14.h),
      margin: EdgeInsets.only(bottom: 12.h),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
                decoration: BoxDecoration(
                  color: urgencyColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                  border:
                      Border.all(color: urgencyColor.withValues(alpha: 0.35)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 7.w,
                      height: 7.w,
                      decoration: BoxDecoration(
                        color: urgencyColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Gap(5.w),
                    Text(
                      urgencyLabel,
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.w600,
                        color: urgencyColor,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                '${summary.medicines.length} medicines',
                style:
                    TextStyle(fontSize: 12.sp, color: AppColors.textMuted),
              ),
            ],
          ),
          Gap(12.h),
          Row(
            children: [
              _StatPill(
                label: '${summary.criticalCount}',
                sublabel: 'Critical',
                color: AppColors.statusCritical,
              ),
              Gap(8.w),
              _StatPill(
                label: '${summary.warningCount}',
                sublabel: 'Warning',
                color: AppColors.statusWarning,
              ),
              Gap(8.w),
              _StatPill(
                label: '${summary.okCount}',
                sublabel: 'Stable',
                color: AppColors.statusOk,
              ),
            ],
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

class _StatPill extends StatelessWidget {
  final String label;
  final String sublabel;
  final Color color;

  const _StatPill({
    required this.label,
    required this.sublabel,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 18.sp,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          Text(
            sublabel,
            style: TextStyle(
              fontSize: 10.sp,
              color: color.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }
}

class _MedicineStatusTile extends StatelessWidget {
  final MedicineStatus medicine;

  const _MedicineStatusTile({required this.medicine});

  @override
  Widget build(BuildContext context) {
    final color = _urgencyColor(medicine.urgency);
    final daysText = medicine.daysRemaining >= 999
        ? '—'
        : medicine.daysRemaining < 1
            ? '< 1 day'
            : '${medicine.daysRemaining.toStringAsFixed(1)} days';

    return Container(
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
                padding:
                    EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
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
            ],
          ),
          Gap(8.h),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: medicine.progressValue,
              minHeight: 4.h,
              backgroundColor: AppColors.border,
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
          Gap(8.h),
          Row(
            children: [
              Icon(Iconsax.chart, size: 11.sp, color: AppColors.textMuted),
              Gap(4.w),
              Text(
                '${medicine.velocityPerDay.toStringAsFixed(1)} ${medicine.unit}/day',
                style:
                    TextStyle(fontSize: 11.sp, color: AppColors.textMuted),
              ),
              Gap(12.w),
              Icon(Iconsax.box, size: 11.sp, color: AppColors.textMuted),
              Gap(4.w),
              Text(
                '${medicine.currentStock} ${medicine.unit} on hand',
                style:
                    TextStyle(fontSize: 11.sp, color: AppColors.textMuted),
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
}
