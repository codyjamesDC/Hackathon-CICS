import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:go_router/go_router.dart';
import 'package:hackathon_cics/core/auth/auth_provider.dart';
import 'package:hackathon_cics/core/network/connectivity_provider.dart';
import 'package:hackathon_cics/core/theme/app_colors.dart';
import 'package:hackathon_cics/features/alerts/presentation/alerts_provider.dart';
import 'package:hackathon_cics/features/rhu_status/presentation/rhu_status_provider.dart';
import 'package:hackathon_cics/features/stock_entry/presentation/stock_entry_provider.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';

class AppShell extends ConsumerWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  static const _tabs = [
    _TabItem(
      label: 'Stock Entry',
      icon: Iconsax.clipboard_tick,
      activeIcon: Iconsax.clipboard_tick_copy,
      path: '/stock-entry',
    ),
    _TabItem(
      label: 'Alerts',
      icon: Iconsax.notification,
      activeIcon: Iconsax.notification_copy,
      path: '/alerts',
    ),
    _TabItem(
      label: 'RHU Status',
      icon: Iconsax.health,
      activeIcon: Iconsax.health_copy,
      path: '/rhu-status',
    ),
  ];

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final idx = _tabs.indexWhere((t) => location.startsWith(t.path));
    return idx < 0 ? 0 : idx;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final online = ref.watch(isOnlineProvider);
    final currentIndex = _currentIndex(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 16.w,
        title: Row(
          children: [
            Text(
              'agap',
              style: TextStyle(
                fontSize: 18.sp,
                fontWeight: FontWeight.w800,
                color: AppColors.primary,
                letterSpacing: -0.5,
              ),
            ),
            const Spacer(),
            Container(
              width: 8.w,
              height: 8.w,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: online ? AppColors.statusOk : AppColors.statusCritical,
              ),
            ),
            SizedBox(width: 6.w),
            Text(
              online ? 'Online' : 'Offline',
              style: TextStyle(
                fontSize: 11.sp,
                color: online ? AppColors.statusOk : AppColors.statusCritical,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(36.h),
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.w).copyWith(bottom: 8.h),
            child: Row(
              children: [
                Text(
                  authState.rhuName ?? 'RHU',
                  style: TextStyle(
                    fontSize: 12.sp,
                    color: AppColors.textSecondary,
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () async {
                    final authNotifier = ref.read(authProvider.notifier);
                    await authNotifier.logout();
                    if (context.mounted) context.go('/login');
                  },
                  child: Text(
                    'Log out',
                    style: TextStyle(
                      fontSize: 12.sp,
                      color: AppColors.textMuted,
                      decoration: TextDecoration.underline,
                      decorationColor: AppColors.textMuted,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          if (!online)
            Container(
              width: double.infinity,
              color: AppColors.statusCritical.withValues(alpha: 0.12),
              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 6.h),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.wifi_off_rounded,
                      size: 13.sp, color: AppColors.statusCritical),
                  Gap(6.w),
                  Text(
                    'No internet connection — data may be outdated',
                    style: TextStyle(
                      fontSize: 11.sp,
                      color: AppColors.statusCritical,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          Expanded(child: child),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        backgroundColor: AppColors.surface,
        height: 64.h,
        selectedIndex: currentIndex,
        onDestinationSelected: (i) {
          // Invalidate data providers on tab switch so they refresh
          ref.invalidate(alertSummaryProvider);
          ref.invalidate(rhuStatusProvider);
          ref.invalidate(medicinesProvider);
          context.go(_tabs[i].path);
        },
        destinations: _tabs
            .map(
              (t) => NavigationDestination(
                icon: Icon(t.icon, size: 22.sp),
                selectedIcon: Icon(t.activeIcon, size: 22.sp),
                label: t.label,
              ),
            )
            .toList(),
      ),
    );
  }
}

class _TabItem {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final String path;

  const _TabItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.path,
  });
}
