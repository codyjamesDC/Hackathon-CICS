import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const AgapApp());
}

class AgapApp extends StatelessWidget {
  const AgapApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Agap',
      debugShowCheckedModeBanner: false,
      theme: AgapTheme.themeData,
      home: const LoginScreen(),
    );
  }
}