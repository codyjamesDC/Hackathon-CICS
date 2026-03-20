import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Agap design system — shared tokens and theme configuration.
class AgapTheme {
  AgapTheme._();

  // ── Brand palette ────────────────────────────────────────────────────────
  static const teal900 = Color(0xFF134E4A);
  static const teal800 = Color(0xFF115E59);
  static const teal700 = Color(0xFF0F766E);
  static const teal600 = Color(0xFF0D9488);
  static const teal500 = Color(0xFF14B8A6);
  static const teal100 = Color(0xFFCCFBF1);
  static const teal50  = Color(0xFFF0FDFA);

  static const slate900 = Color(0xFF0F172A);
  static const slate800 = Color(0xFF1E293B);
  static const slate700 = Color(0xFF334155);
  static const slate500 = Color(0xFF64748B);
  static const slate400 = Color(0xFF94A3B8);
  static const slate300 = Color(0xFFCBD5E1);
  static const slate200 = Color(0xFFE2E8F0);
  static const slate100 = Color(0xFFF1F5F9);
  static const slate50  = Color(0xFFF8FAFC);

  static const red500   = Color(0xFFEF4444);
  static const red50    = Color(0xFFFEF2F2);
  static const amber500 = Color(0xFFF59E0B);
  static const amber50  = Color(0xFFFFFBEB);
  static const green500 = Color(0xFF22C55E);
  static const green50  = Color(0xFFF0FDF4);

  static const white = Colors.white;

  // ── Typography ───────────────────────────────────────────────────────────
  static TextStyle display(
          {double size = 28, FontWeight weight = FontWeight.w800}) =>
      TextStyle(
        fontSize: size,
        fontWeight: weight,
        letterSpacing: -0.5,
        color: slate900,
      );

  static TextStyle label({
    double size = 10,
    Color color = const Color(0xFF64748B),
    double spacing = 0.8,
  }) =>
      TextStyle(
        fontSize: size,
        fontWeight: FontWeight.w700,
        letterSpacing: spacing,
        color: color,
      );

  static TextStyle body({
    double size = 14,
    Color color = const Color(0xFF0F172A),
    FontWeight weight = FontWeight.w400,
  }) =>
      TextStyle(fontSize: size, fontWeight: weight, color: color);

  // ── ThemeData ─────────────────────────────────────────────────────────────
  static ThemeData get themeData => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: teal600,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: slate50,
        appBarTheme: const AppBarTheme(
          backgroundColor: teal800,
          foregroundColor: white,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          systemOverlayStyle: SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.light,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: teal600,
            foregroundColor: white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
            textStyle: const TextStyle(
                fontSize: 15, fontWeight: FontWeight.w700),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: white,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: slate200),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: slate200),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: teal600, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: red500),
          ),
          labelStyle: const TextStyle(color: slate500),
          hintStyle: const TextStyle(color: slate400),
        ),
      );

  // ── Helpers ───────────────────────────────────────────────────────────────
  static Color statusColor(double days) {
    if (days < 7) return red500;
    if (days < 14) return amber500;
    return green500;
  }

  static Color statusBg(double days) {
    if (days < 7) return red50;
    if (days < 14) return amber50;
    return green50;
  }

  static String statusLabel(double days) {
    if (days < 7) return 'Critical';
    if (days < 14) return 'Low';
    return 'OK';
  }

  static IconData statusIcon(double days) {
    if (days < 7) return Icons.warning_amber_rounded;
    if (days < 14) return Icons.schedule_rounded;
    return Icons.check_circle_outline_rounded;
  }
}