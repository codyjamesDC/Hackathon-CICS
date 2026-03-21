part of 'app.dart';

abstract final class AppRouter {
  static GoRouter build(WidgetRef ref) => GoRouter(
        initialLocation: '/login',
        redirect: (context, state) async {
          final isLoggedIn = ref.read(authProvider).isLoggedIn;
          final onLogin = state.matchedLocation == '/login';
          if (!isLoggedIn && !onLogin) return '/login';
          if (isLoggedIn && onLogin) return '/stock-entry';
          return null;
        },
        routes: [
          GoRoute(
            path: '/login',
            name: 'login',
            builder: (context, state) => const LoginScreen(),
          ),
          ShellRoute(
            pageBuilder: (context, state, child) => CustomTransitionPage(
              key: state.pageKey,
              child: AppShell(child: child),
              transitionDuration: const Duration(milliseconds: 380),
              reverseTransitionDuration: const Duration(milliseconds: 280),
              transitionsBuilder: (context, animation, secondary, child) {
                final fade = CurvedAnimation(
                  parent: animation,
                  curve: Curves.easeOut,
                );
                final slide = Tween<Offset>(
                  begin: const Offset(0, 0.04),
                  end: Offset.zero,
                ).animate(CurvedAnimation(
                  parent: animation,
                  curve: Curves.easeOutCubic,
                ));
                return FadeTransition(
                  opacity: fade,
                  child: SlideTransition(position: slide, child: child),
                );
              },
            ),
            routes: [
              GoRoute(
                path: '/stock-entry',
                name: 'stock-entry',
                builder: (context, state) => const StockEntryScreen(),
              ),
              GoRoute(
                path: '/rhu-status',
                name: 'rhu-status',
                builder: (context, state) => const RhuStatusScreen(),
              ),
              GoRoute(
                path: '/profile',
                name: 'profile',
                builder: (context, state) => const ProfileScreen(),
              ),
              GoRoute(
                path: '/alerts',
                name: 'alerts',
                redirect: (_, __) => '/rhu-status',
              ),
            ],
          ),
        ],
      );
}

