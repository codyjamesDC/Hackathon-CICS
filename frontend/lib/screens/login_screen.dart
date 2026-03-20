import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'stock_entry_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController(text: 'nurse@rhu.local');
  final _password = TextEditingController(text: 'password');
  bool isLoading = false;
  String? error;

  Future<void> _login() async {
    setState(() {
      isLoading = true;
      error = null;
    });
    try {
      final api = ApiService();
      final res = await api.login(_email.text.trim(), _password.text.trim());
      final token = res['token']?.toString() ?? 'dummy-token';
      final rhuId = res['rhuId']?.toString() ?? '1';
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => StockEntryScreen(token: token, rhuId: rhuId)));
    } catch (e) {
      // For now fallback to a dummy nurse token if backend login isn't implemented
      final token = 'dummy-token';
      final rhuId = '1';
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => StockEntryScreen(token: token, rhuId: rhuId)));
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Agap Nurse Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
            const SizedBox(height: 12),
            TextField(controller: _password, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: isLoading ? null : _login, child: isLoading ? const CircularProgressIndicator() : const Text('Login')),
            if (error != null) ...[
              const SizedBox(height: 10),
              Text(error!, style: const TextStyle(color: Colors.red)),
            ],
          ],
        ),
      ),
    );
  }
}
