import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:go_router/go_router.dart';
import 'package:hackathon_cics/core/theme/app_colors.dart';
import 'package:hackathon_cics/core/utils/constants.dart';
import 'package:hackathon_cics/features/auth/presentation/login_provider.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loginState = ref.watch(loginProvider);
    final account = kNurseAccounts.first;

    Future<void> onLogin() async {
      final success = await ref.read(loginProvider.notifier).login(
            userId: account.userId,
            rhuId: account.rhuId,
            name: account.name,
            rhuName: account.rhuName,
          );
      if (success && context.mounted) {
        context.go('/stock-entry');
      }
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 28.w),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(flex: 2),
              Text(
                'agap',
                style: TextStyle(
                  fontSize: 44.sp,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                  letterSpacing: -1.5,
                ),
              ),
              Gap(6.h),
              Text(
                'Medicine Stock Intelligence',
                style: TextStyle(
                  fontSize: 13.sp,
                  color: AppColors.textMuted,
                  letterSpacing: 0.5,
                ),
              ),
              const Spacer(flex: 1),
              _LoginCard(loginState: loginState, account: account, onLogin: onLogin),
              const Spacer(flex: 2),
              Text(
                'v1.0.0 · Agap MVP',
                style: TextStyle(fontSize: 11.sp, color: AppColors.textMuted),
              ),
              Gap(20.h),
            ],
          ),
        ),
      ),
    );
  }
}

class _LoginCard extends StatelessWidget {
  final LoginState loginState;
  final NurseAccount account;
  final VoidCallback onLogin;

  const _LoginCard({
    required this.loginState,
    required this.account,
    required this.onLogin,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(24.w),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            'Sign In',
            style: TextStyle(
              fontSize: 20.sp,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          Gap(4.h),
          Text(
            'Account configured for demo purposes',
            style: TextStyle(
              fontSize: 13.sp,
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          Gap(24.h),
          _ReadOnlyField(
            icon: Icons.person_outline_rounded,
            value: account.name,
            label: 'Name',
          ),
          Gap(12.h),
          _ReadOnlyField(
            icon: Icons.local_hospital_outlined,
            value: account.rhuName,
            label: 'Health Facility',
          ),
          if (loginState.error != null) ...[
            Gap(12.h),
            Text(
              loginState.error!,
              style: TextStyle(
                fontSize: 12.sp,
                color: AppColors.statusCritical,
              ),
              textAlign: TextAlign.center,
            ),
          ],
          Gap(24.h),
          SizedBox(
            width: double.infinity,
            child: ShadButton(
              onPressed: loginState.isLoading ? null : onLogin,
              child: loginState.isLoading
                  ? SizedBox(
                      width: 16.w,
                      height: 16.w,
                      child: const CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.background,
                      ),
                    )
                  : Text(
                      'Log In',
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReadOnlyField extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  const _ReadOnlyField({
    required this.icon,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 13.h),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16.sp, color: AppColors.textMuted),
          Gap(10.w),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          Icon(Icons.lock_outline_rounded, size: 13.sp, color: AppColors.border),
        ],
      ),
    );
  }
}
