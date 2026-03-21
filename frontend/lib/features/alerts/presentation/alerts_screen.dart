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
          return _buildContent(ref, summary);
        },
      ),
    );
  }

  Widget _buildSkeleton() {
    return Skeletonizer(
      enabled: true,
      child: ListView.separated(
        padding: EdgeInsets.all(16.w),
        itemCount: 4,
        separatorBuilder: (_, __) => Gap(8.h),
        itemBuilder: (_, __) => _AlertCard(
          alert: NurseAlert(
            id: 'x',
            rhuId: 'x',
            rhuName: 'Placeholder Health Center',
            type: NurseAlertType.thresholdBreach,
            severity: NurseAlertSeverity.critical,
            title: 'Threshold Breach',
            message: 'Paracetamol 500mg is projected to run out in 1.2 days.',
            medicineName: 'Paracetamol 500mg',
            relatedRequisitionId: null,
            createdAt: DateTime.now(),
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

  Widget _buildContent(WidgetRef ref, AlertSummary summary) {
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(alertSummaryProvider),
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _buildSummaryBanner(summary)),
          if (summary.alerts.isEmpty)
            SliverFillRemaining(child: _buildAllClear())
          else
            SliverPadding(
              padding: EdgeInsets.fromLTRB(16.w, 0, 16.w, 24.h),
              sliver: SliverList.separated(
                itemCount: summary.alerts.length,
                separatorBuilder: (_, __) => Gap(8.h),
                itemBuilder: (_, i) => _AlertCard(alert: summary.alerts[i]),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryBanner(AlertSummary summary) {
    final criticalCount = summary.critical.length;
    final spikeCount = summary.anomalySpikes.length;

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
          Gap(10.w),
          _SummaryChip(
            count: spikeCount,
            label: 'Spikes',
            color: AppColors.statusWarning,
            icon: Iconsax.trend_up,
          ),
          const Spacer(),
          Text(
            '${summary.alerts.length} active',
            style: TextStyle(fontSize: 11.sp, color: AppColors.textMuted),
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
            'No active alerts',
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          Gap(4.h),
          Text(
            'Your RHU is operating normally.',
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
  final NurseAlert alert;

  const _AlertCard({required this.alert});

  @override
  Widget build(BuildContext context) {
    return switch (alert.type) {
      NurseAlertType.anomalySpike => _buildAnomalyCard(context),
      NurseAlertType.participationAlert => _buildParticipationCard(context),
      NurseAlertType.thresholdBreach => _buildBreachCard(context),
    };
  }

  Widget _buildBreachCard(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.statusCritical.withValues(alpha: 0.4)),
      ),
      padding: EdgeInsets.all(14.w),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: EdgeInsets.all(8.w),
            decoration: BoxDecoration(
              color: AppColors.statusCritical.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Iconsax.warning_2, size: 18.sp, color: AppColors.statusCritical),
          ),
          Gap(12.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        alert.medicineName ?? alert.title,
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    _TypePill(label: 'Breach', color: AppColors.statusCritical),
                  ],
                ),
                Gap(4.h),
                Text(
                  alert.message,
                  style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnomalyCard(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.statusWarning.withValues(alpha: 0.4)),
      ),
      padding: EdgeInsets.all(14.w),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: EdgeInsets.all(8.w),
            decoration: BoxDecoration(
              color: AppColors.statusWarning.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Iconsax.trend_up, size: 18.sp, color: AppColors.statusWarning),
          ),
          Gap(12.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        alert.medicineName ?? 'Anomaly Detected',
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    _TypePill(label: 'Spike', color: AppColors.statusWarning),
                  ],
                ),
                Gap(4.h),
                Text(
                  alert.message,
                  style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildParticipationCard(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.statusSilent.withValues(alpha: 0.35)),
      ),
      padding: EdgeInsets.all(14.w),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: EdgeInsets.all(8.w),
            decoration: BoxDecoration(
              color: AppColors.statusSilent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Iconsax.notification_status, size: 18.sp, color: AppColors.statusSilent),
          ),
          Gap(12.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        alert.rhuName.isNotEmpty ? alert.rhuName : 'Silent Facility',
                        style: TextStyle(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    _TypePill(label: 'Silent', color: AppColors.statusSilent),
                  ],
                ),
                Gap(4.h),
                Text(
                  alert.message,
                  style: TextStyle(fontSize: 12.sp, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TypePill extends StatelessWidget {
  final String label;
  final Color color;

  const _TypePill({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 7.w, vertical: 2.h),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10.sp,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}
