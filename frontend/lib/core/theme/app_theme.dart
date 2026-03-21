import 'package:flutter/material.dart';
import 'package:hackathon_cics/core/theme/app_colors.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

abstract final class AppTheme {
  static ShadThemeData dark() {
    return ShadThemeData(
      brightness: Brightness.dark,
      colorScheme: const ShadSlateColorScheme.dark(
        background: AppColors.background,
        card: AppColors.surface,
        primary: AppColors.primary,
        border: AppColors.border,
        foreground: AppColors.textPrimary,
        mutedForeground: AppColors.textMuted,
      ),
      radius: BorderRadius.circular(12),
    );
  }

  static ThemeData materialDark() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        surface: AppColors.surface,
        primary: AppColors.primary,
        onPrimary: AppColors.background,
        onSurface: AppColors.textPrimary,
        outline: AppColors.border,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface,
        indicatorColor: AppColors.primary.withValues(alpha: 0.15),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final isSelected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
            color: isSelected ? AppColors.primary : AppColors.textMuted,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final isSelected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: isSelected ? AppColors.primary : AppColors.textMuted,
          );
        }),
      ),
      appBarTheme: const AppBarTheme(
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      dividerColor: AppColors.border,
      cardColor: AppColors.surface,
    );
  }
}
