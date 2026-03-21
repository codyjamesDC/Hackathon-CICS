import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';
import 'package:hackathon_cics/core/auth/auth_provider.dart';
import 'package:hackathon_cics/core/theme/app_theme.dart';
import 'package:hackathon_cics/features/auth/presentation/login_screen.dart';
import 'package:hackathon_cics/features/alerts/presentation/alerts_screen.dart';
import 'package:hackathon_cics/features/rhu_status/presentation/rhu_status_screen.dart';
import 'package:hackathon_cics/features/stock_entry/presentation/stock_entry_screen.dart';
import 'package:hackathon_cics/shared/widgets/app_shell.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

part 'router.dart';

class AgapApp extends ConsumerStatefulWidget {
  const AgapApp({super.key});

  @override
  ConsumerState<AgapApp> createState() => _AgapAppState();
}

class _AgapAppState extends ConsumerState<AgapApp> {
  late final GoRouter _router = AppRouter.build(ref);

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(390, 844),
      minTextAdapt: true,
      builder: (context, child) => ShadApp.router(
        debugShowCheckedModeBanner: false,
        darkTheme: AppTheme.dark(),
        materialThemeBuilder: (context, theme) => AppTheme.materialDark(),
        themeMode: ThemeMode.dark,
        routerConfig: _router,
        builder: (context, child) => ShadToaster(child: child!),
      ),
    );
  }
}
