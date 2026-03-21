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
            builder: (context, state, child) => AppShell(child: child),
            routes: [
              GoRoute(
                path: '/stock-entry',
                name: 'stock-entry',
                builder: (context, state) => const StockEntryScreen(),
              ),
              GoRoute(
                path: '/alerts',
                name: 'alerts',
                builder: (context, state) => const AlertsScreen(),
              ),
              GoRoute(
                path: '/rhu-status',
                name: 'rhu-status',
                builder: (context, state) => const RhuStatusScreen(),
              ),
            ],
          ),
        ],
      );
}

