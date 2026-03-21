import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:go_router/go_router.dart';
import 'package:hackathon_cics/core/auth/auth_provider.dart';
import 'package:hackathon_cics/core/network/connectivity_provider.dart';
import 'package:hackathon_cics/core/theme/app_colors.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final online = ref.watch(isOnlineProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: ListView(
        padding: EdgeInsets.symmetric(horizontal: 20.w),
        children: [
          Gap(40.h),
          Center(
            child: Container(
              width: 72.w,
              height: 72.w,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withValues(alpha: 0.12),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.3),
                  width: 2,
                ),
              ),
              child: Icon(
                Icons.person_rounded,
                size: 36.sp,
                color: AppColors.primary,
              ),
            ),
          ),
          Gap(14.h),
          Center(
            child: Column(
              children: [
                Text(
                  auth.userName ?? 'Nurse',
                  style: TextStyle(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                Gap(4.h),
                Text(
                  auth.rhuName ?? 'RHU',
                  style: TextStyle(
                    fontSize: 13.sp,
                    color: AppColors.textSecondary,
                  ),
                ),
                Gap(2.h),
                Text(
                  'Nagcarlan, Laguna',
                  style: TextStyle(
                    fontSize: 12.sp,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Gap(28.h),
          _InfoCard(
            children: [
              _InfoRow(label: 'Role', value: 'Nurse'),
              _RowDivider(),
              _InfoRow(label: 'RHU', value: auth.rhuName ?? '—'),
              _RowDivider(),
              _InfoRow(label: 'Municipality', value: 'Nagcarlan, Laguna'),
            ],
          ),
          Gap(12.h),
          _InfoCard(
            children: [
              _InfoRow(label: 'App Version', value: '1.0.0'),
              _RowDivider(),
              _InfoRow(
                label: 'Backend',
                value: online ? 'Connected' : 'Offline',
                valueColor:
                    online ? AppColors.statusOk : AppColors.statusCritical,
              ),
            ],
          ),
          Gap(36.h),
          ShadButton.destructive(
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
            width: double.infinity,
            child: Text(
              'Log Out',
              style: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Gap(32.h),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final List<Widget> children;
  const _InfoCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(children: children),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 13.h),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 13.sp, color: AppColors.textMuted),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13.sp,
              fontWeight: FontWeight.w500,
              color: valueColor ?? AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _RowDivider extends StatelessWidget {
  const _RowDivider();

  @override
  Widget build(BuildContext context) =>
      Divider(height: 1, color: AppColors.border);
}
