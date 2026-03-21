// ignore_for_file: avoid_print
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:hackathon_cics/core/theme/app_colors.dart';
import 'package:hackathon_cics/features/alerts/domain/alert_model.dart';
import 'package:hackathon_cics/features/alerts/presentation/alerts_provider.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import 'package:skeletonizer/skeletonizer.dart';

class AlertsScreen extends ConsumerWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alertsAsync = ref.watch(alertSummaryProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: alertsAsync.when(
        loading: () {
          print('[SCREEN] alerts loading...');
          return _buildSkeleton();
        },
        error: (e, st) {
          print('[SCREEN] alerts ERROR: $e');
          return _buildError(e.toString(), ref);
        },
        data: (summary) {
          print('[SCREEN] alerts loaded: ${summary.alerts.length} items');
          return _buildContent(context, ref, summary);
        },
      ),
    );
  }

  Widget _buildSkeleton() {
    return Skeletonizer(
      enabled: true,
      child: ListView.separated(
        padding: EdgeInsets.all(16.w),
        itemCount: 5,
        separatorBuilder: (context, index) => Gap(8.h),
        itemBuilder: (context, index) => _AlertCard(
          alert: const MedicineAlert(
            medicineId: 'x',
            medicineName: 'Medicine Name Placeholder',
            unit: 'tablet',
            daysRemaining: 2.5,
            velocityPerDay: 12.0,
            currentStock: 30,
            severity: AlertSeverity.critical,
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
              'Could not load alerts',
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
              onPressed: () => ref.invalidate(alertSummaryProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(
      BuildContext context, WidgetRef ref, AlertSummary summary) {
    final actionRequired = summary.actionRequired;

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(alertSummaryProvider),
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _buildSummaryBanner(summary)),
          if (actionRequired.isEmpty)
            SliverFillRemaining(
              child: _buildAllClear(),
            )
          else
            SliverPadding(
              padding:
                  EdgeInsets.fromLTRB(16.w, 0, 16.w, 24.h),
              sliver: SliverList.separated(
                itemCount: actionRequired.length,
                separatorBuilder: (context, index) => Gap(8.h),
                itemBuilder: (_, i) => _AlertCard(alert: actionRequired[i]),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryBanner(AlertSummary summary) {
    final criticalCount = summary.critical.length;
    final warningCount = summary.warnings.length;

    return Container(
      color: AppColors.surface,
      padding: EdgeInsets.fromLTRB(16.w, 12.h, 16.w, 12.h),
      margin: EdgeInsets.only(bottom: 12.h),
      child: Row(
        children: [
          _SummaryChip(
            count: criticalCount,
            label: 'Critical',
            color: AppColors.statusCritical,
            icon: Iconsax.warning_2,
          ),
          Gap(12.w),
          _SummaryChip(
            count: warningCount,
            label: 'Warning',
            color: AppColors.statusWarning,
            icon: Iconsax.info_circle,
          ),
          const Spacer(),
          GestureDetector(
            onTap: () {},
            child: Text(
              '${summary.alerts.length} medicines tracked',
              style: TextStyle(
                fontSize: 11.sp,
                color: AppColors.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAllClear() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Iconsax.tick_circle, size: 48.sp, color: AppColors.statusOk),
          Gap(12.h),
          Text(
            'All medicines are stable',
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          Gap(4.h),
          Text(
            'No threshold breaches detected.',
            style: TextStyle(fontSize: 13.sp, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  final int count;
  final String label;
  final Color color;
  final IconData icon;

  const _SummaryChip({
    required this.count,
    required this.label,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13.sp, color: color),
          Gap(5.w),
          Text(
            '$count $label',
            style: TextStyle(
              fontSize: 12.sp,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  final MedicineAlert alert;

  const _AlertCard({required this.alert});

  @override
  Widget build(BuildContext context) {
    final color = _severityColor(alert.severity);
    final icon = _severityIcon(alert.severity);
    final daysText = alert.daysRemaining < 1
        ? '< 1 day'
        : '${alert.daysRemaining.toStringAsFixed(1)} days';

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      padding: EdgeInsets.all(14.w),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: EdgeInsets.all(8.w),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18.sp, color: color),
          ),
          Gap(12.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert.medicineName,
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                Gap(3.h),
                Row(
                  children: [
                    _InfoPill(
                      label: daysText,
                      color: color,
                    ),
                    Gap(6.w),
                    Text(
                      '${alert.currentStock} ${alert.unit} left',
                      style: TextStyle(
                        fontSize: 11.sp,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
                Gap(4.h),
                Text(
                  '${alert.velocityPerDay.toStringAsFixed(1)} ${alert.unit}/day usage',
                  style: TextStyle(
                    fontSize: 11.sp,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _severityColor(AlertSeverity s) {
    return switch (s) {
      AlertSeverity.critical => AppColors.statusCritical,
      AlertSeverity.warning => AppColors.statusWarning,
      AlertSeverity.ok => AppColors.statusOk,
    };
  }

  IconData _severityIcon(AlertSeverity s) {
    return switch (s) {
      AlertSeverity.critical => Iconsax.warning_2,
      AlertSeverity.warning => Iconsax.info_circle,
      AlertSeverity.ok => Iconsax.tick_circle,
    };
  }
}

class _InfoPill extends StatelessWidget {
  final String label;
  final Color color;

  const _InfoPill({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 7.w, vertical: 2.h),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11.sp,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
