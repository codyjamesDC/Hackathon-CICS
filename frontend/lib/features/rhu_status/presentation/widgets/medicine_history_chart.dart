import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:gap/gap.dart';
import 'package:hackathon_cics/core/theme/app_colors.dart';
import 'package:hackathon_cics/features/rhu_status/domain/rhu_status_model.dart';
import 'package:hackathon_cics/features/rhu_status/domain/stock_history_model.dart';
import 'package:hackathon_cics/features/rhu_status/presentation/stock_history_provider.dart';
import 'package:skeletonizer/skeletonizer.dart';

class MedicineHistoryChart extends ConsumerWidget {
  final MedicineStatus medicine;

  const MedicineHistoryChart({super.key, required this.medicine});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(stockHistoryProvider(medicine.medicineId));

    return historyAsync.when(
      loading: () => Skeletonizer(
        enabled: true,
        child: _ChartShell(
          medicine: medicine,
          child: SizedBox(height: 140.h),
        ),
      ),
      error: (e, _) => Padding(
        padding: EdgeInsets.symmetric(vertical: 12.h),
        child: Text(
          'No history data available.',
          style: TextStyle(fontSize: 11.sp, color: AppColors.textMuted),
        ),
      ),
      data: (entries) {
        if (entries.length < 2) {
          return Padding(
            padding: EdgeInsets.symmetric(vertical: 12.h),
            child: Text(
              'Not enough data to plot — need at least 2 entries.',
              style: TextStyle(fontSize: 11.sp, color: AppColors.textMuted),
            ),
          );
        }
        return _ChartShell(
          medicine: medicine,
          child: _LineChart(medicine: medicine, entries: entries),
        );
      },
    );
  }
}

class _ChartShell extends StatelessWidget {
  final MedicineStatus medicine;
  final Widget child;

  const _ChartShell({required this.medicine, required this.child});

  @override
  Widget build(BuildContext context) {
    final color = _urgencyColor(medicine.urgency);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Stock History',
              style: TextStyle(
                fontSize: 11.sp,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
        Gap(8.h),
        child,
      ],
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

class _LineChart extends StatelessWidget {
  final MedicineStatus medicine;
  final List<StockHistoryEntry> entries;

  const _LineChart({required this.medicine, required this.entries});

  Color get _lineColor => switch (medicine.urgency) {
        RhuUrgency.critical => AppColors.statusCritical,
        RhuUrgency.warning => AppColors.statusWarning,
        RhuUrgency.ok => AppColors.statusOk,
        RhuUrgency.silent => AppColors.statusSilent,
        RhuUrgency.unmonitored => AppColors.textMuted,
      };

  // breach threshold in units = criticalThresholdDays × velocity
  double get _breachY =>
      medicine.criticalThresholdDays * medicine.velocityPerDay;

  String _fmtDate(DateTime dt) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[dt.month - 1]} ${dt.day}';
  }

  @override
  Widget build(BuildContext context) {
    final spots = entries
        .asMap()
        .entries
        .map((e) => FlSpot(e.key.toDouble(), e.value.quantityOnHand.toDouble()))
        .toList();

    final maxY = (entries.map((e) => e.quantityOnHand).reduce((a, b) => a > b ? a : b) * 1.15).ceilToDouble();
    final minY = 0.0;

    // Pick a sparse set of x labels so they don't crowd
    final xStep = (entries.length / 4).ceil().clamp(1, entries.length);

    return SizedBox(
      height: 140.h,
      child: LineChart(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOut,
        LineChartData(
          minX: 0,
          maxX: (entries.length - 1).toDouble(),
          minY: minY,
          maxY: maxY,

          // ── Grid ─────────────────────────────────────────────────────────
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: maxY / 4,
            getDrawingHorizontalLine: (_) => FlLine(
              color: const Color(0xFF2A2A2A),
              strokeWidth: 1,
            ),
          ),

          // ── Border ───────────────────────────────────────────────────────
          borderData: FlBorderData(
            show: true,
            border: Border(
              bottom: BorderSide(color: const Color(0xFF2A2A2A), width: 1),
            ),
          ),

          // ── Axes ─────────────────────────────────────────────────────────
          titlesData: FlTitlesData(
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 34.w,
                getTitlesWidget: (val, meta) {
                  if (val == meta.max || val == meta.min) return const SizedBox.shrink();
                  return Text(
                    val.round().toString(),
                    style: TextStyle(
                      fontSize: 9.sp,
                      color: AppColors.textMuted,
                    ),
                  );
                },
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 20.h,
                interval: xStep.toDouble(),
                getTitlesWidget: (val, meta) {
                  final idx = val.round();
                  if (idx < 0 || idx >= entries.length) return const SizedBox.shrink();
                  if (idx % xStep != 0) return const SizedBox.shrink();
                  return Padding(
                    padding: EdgeInsets.only(top: 4.h),
                    child: Text(
                      _fmtDate(entries[idx].submittedAt),
                      style: TextStyle(
                        fontSize: 9.sp,
                        color: AppColors.textMuted,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

          // ── Breach threshold dashed line ─────────────────────────────────
          extraLinesData: _breachY > 0 && _breachY < maxY
              ? ExtraLinesData(
                  horizontalLines: [
                    HorizontalLine(
                      y: _breachY,
                      color: AppColors.statusCritical.withValues(alpha: 0.5),
                      strokeWidth: 1.5,
                      dashArray: [4, 4],
                      label: HorizontalLineLabel(
                        show: true,
                        alignment: Alignment.topRight,
                        padding: EdgeInsets.only(right: 4.w, bottom: 2.h),
                        style: TextStyle(
                          fontSize: 9.sp,
                          color: AppColors.statusCritical.withValues(alpha: 0.8),
                          fontWeight: FontWeight.w600,
                        ),
                        labelResolver: (_) => 'Breach',
                      ),
                    ),
                  ],
                )
              : const ExtraLinesData(),

          // ── Touch / tooltip ──────────────────────────────────────────────
          lineTouchData: LineTouchData(
            handleBuiltInTouches: true,
            touchTooltipData: LineTouchTooltipData(
              getTooltipColor: (_) => const Color(0xF0111111),
              tooltipBorder: BorderSide(
                color: _lineColor.withValues(alpha: 0.3),
              ),
              getTooltipItems: (spots) => spots.map((s) {
                final idx = s.x.round().clamp(0, entries.length - 1);
                final date = _fmtDate(entries[idx].submittedAt);
                return LineTooltipItem(
                  '$date\n',
                  TextStyle(
                    fontSize: 10.sp,
                    color: AppColors.textMuted,
                    fontWeight: FontWeight.w400,
                  ),
                  children: [
                    TextSpan(
                      text: '${s.y.round()} ${medicine.unit}',
                      style: TextStyle(
                        fontSize: 12.sp,
                        color: _lineColor,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),

          // ── Line data ────────────────────────────────────────────────────
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: true,
              curveSmoothness: 0.35,
              color: _lineColor,
              barWidth: 2,
              isStrokeCapRound: true,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    _lineColor.withValues(alpha: 0.22),
                    _lineColor.withValues(alpha: 0.01),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
