import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:go_router/go_router.dart';
import 'package:hackathon_cics/core/theme/app_colors.dart';
import 'package:hackathon_cics/core/utils/constants.dart';
import 'package:hackathon_cics/features/auth/presentation/login_provider.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  NurseAccount? _selected;

  @override
  void initState() {
    super.initState();
    if (kNurseAccounts.isNotEmpty) {
      _selected = kNurseAccounts.first;
    }
  }

  Future<void> _onContinue() async {
    if (_selected == null) return;
    final success = await ref.read(loginProvider.notifier).login(
          userId: _selected!.userId,
          rhuId: _selected!.rhuId,
          name: _selected!.name,
          rhuName: _selected!.rhuName,
        );
    if (success && mounted) {
      context.go('/stock-entry');
    }
  }

  @override
  Widget build(BuildContext context) {
    final loginState = ref.watch(loginProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 24.w),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              _buildHeader(),
              Gap(40.h),
              _buildCard(loginState),
              const Spacer(),
              _buildVersion(),
              Gap(16.h),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Text(
          'agap',
          style: TextStyle(
            fontSize: 40.sp,
            fontWeight: FontWeight.w800,
            color: AppColors.primary,
            letterSpacing: -1.5,
          ),
          textAlign: TextAlign.center,
        ),
        Gap(4.h),
        Text(
          'Medicine Stock Intelligence',
          style: TextStyle(
            fontSize: 14.sp,
            color: AppColors.textMuted,
            letterSpacing: 0.5,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildCard(LoginState loginState) {
    return ShadCard(
      backgroundColor: AppColors.surface,
      border: ShadBorder.all(color: AppColors.border, radius: BorderRadius.circular(12)),
      padding: EdgeInsets.all(24.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Welcome, Nurse',
            style: TextStyle(
              fontSize: 20.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          Gap(4.h),
          Text(
            'Select your account to continue',
            style: TextStyle(
              fontSize: 13.sp,
              color: AppColors.textSecondary,
            ),
          ),
          Gap(24.h),
          ShadSelect<NurseAccount>(
            placeholder: const Text('Select account'),
            initialValue: _selected,
            onChanged: (val) => setState(() => _selected = val),
            options: kNurseAccounts
                .map(
                  (a) => ShadOption(
                    value: a,
                    child: Text('${a.name} — ${a.rhuName}'),
                  ),
                )
                .toList(),
            selectedOptionBuilder: (context, value) =>
                Text('${value.name} — ${value.rhuName}'),
          ),
          if (loginState.error != null) ...[
            Gap(12.h),
            Text(
              loginState.error!,
              style: TextStyle(
                fontSize: 12.sp,
                color: AppColors.statusCritical,
              ),
            ),
          ],
          Gap(20.h),
          ShadButton(
            onPressed: loginState.isLoading || _selected == null
                ? null
                : _onContinue,
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
                    'Continue →',
                    style: TextStyle(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildVersion() {
    return Text(
      'v1.0.0 · Agap MVP',
      style: TextStyle(fontSize: 11.sp, color: AppColors.textMuted),
      textAlign: TextAlign.center,
    );
  }
}
