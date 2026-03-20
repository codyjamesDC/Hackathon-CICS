import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'stock_entry_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with TickerProviderStateMixin {
  final _emailCtrl = TextEditingController(text: 'nurse@rhu.local');
  final _passCtrl = TextEditingController(text: 'password');
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _obscurePass = true;
  String? _error;

  late final List<AnimationController> _controllers;
  late final List<Animation<double>> _slides;
  late final List<Animation<double>> _fades;

  @override
  void initState() {
    super.initState();
    // Stagger: hero, subtitle, fields, button — 4 stages
    _controllers = List.generate(
      4,
      (i) => AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 600),
      ),
    );
    _slides = _controllers.map((c) {
      return Tween<double>(begin: 24, end: 0).animate(
        CurvedAnimation(parent: c, curve: Curves.easeOutCubic),
      );
    }).toList();
    _fades = _controllers.map((c) {
      return CurvedAnimation(parent: c, curve: Curves.easeOut);
    }).toList();

    _runStagger();
  }

  Future<void> _runStagger() async {
    for (int i = 0; i < _controllers.length; i++) {
      await Future.delayed(Duration(milliseconds: 80 * i));
      if (mounted) _controllers[i].forward();
    }
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Widget _staggered(int index, Widget child) {
    return AnimatedBuilder(
      animation: _controllers[index],
      builder: (_, __) => Opacity(
        opacity: _fades[index].value,
        child: Transform.translate(
          offset: Offset(0, _slides[index].value),
          child: child,
        ),
      ),
    );
  }

  Future<void> _login() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final api = ApiService();
      final res =
          await api.login(_emailCtrl.text.trim(), _passCtrl.text.trim());
      final token = res['token']?.toString() ?? 'dummy-token';
      final rhuId = res['rhuId']?.toString() ?? '1';
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (_, a1, a2) =>
              StockEntryScreen(token: token, rhuId: rhuId),
          transitionsBuilder: (_, a1, __, child) => FadeTransition(
            opacity: a1,
            child: child,
          ),
          transitionDuration: const Duration(milliseconds: 400),
        ),
      );
    } catch (_) {
      // Fallback for MVP — backend auth not yet wired
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (_, a1, a2) =>
              StockEntryScreen(token: 'dummy-token', rhuId: '1'),
          transitionsBuilder: (_, a1, __, child) =>
              FadeTransition(opacity: a1, child: child),
          transitionDuration: const Duration(milliseconds: 400),
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AgapTheme.slate50,
      body: Stack(
        children: [
          // Background gradient header block
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: MediaQuery.of(context).size.height * 0.42,
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AgapTheme.teal900, AgapTheme.teal700],
                ),
              ),
              child: Stack(
                children: [
                  // Subtle grid pattern
                  Opacity(
                    opacity: 0.06,
                    child: CustomPaint(
                      painter: _GridPainter(),
                      child: const SizedBox.expand(),
                    ),
                  ),
                ],
              ),
            ),
          ),

          SafeArea(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  const SizedBox(height: 48),

                  // ── Hero block ─────────────────────────────────────────
                  _staggered(
                    0,
                    Column(
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: AgapTheme.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                                color: AgapTheme.white.withOpacity(0.25),
                                width: 1.5),
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.medication_liquid_rounded,
                              color: AgapTheme.white,
                              size: 36,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'Agap',
                          style: TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w900,
                            color: AgapTheme.white,
                            letterSpacing: -1,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 8),

                  // ── Subtitle ───────────────────────────────────────────
                  _staggered(
                    1,
                    const Text(
                      'Medicine Stock Intelligence',
                      style: TextStyle(
                        fontSize: 14,
                        color: AgapTheme.teal100,
                        letterSpacing: 0.2,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),

                  const SizedBox(height: 40),

                  // ── Card ───────────────────────────────────────────────
                  _staggered(
                    2,
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Container(
                        decoration: BoxDecoration(
                          color: AgapTheme.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: AgapTheme.teal900.withOpacity(0.12),
                              blurRadius: 32,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(28),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Sign in',
                                  style: AgapTheme.display(size: 22)),
                              const SizedBox(height: 4),
                              Text(
                                'Enter your RHU nurse credentials',
                                style: AgapTheme.body(
                                    size: 13, color: AgapTheme.slate500),
                              ),
                              const SizedBox(height: 28),

                              // Email field
                              _FieldLabel(text: 'EMAIL ADDRESS'),
                              const SizedBox(height: 6),
                              TextFormField(
                                controller: _emailCtrl,
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                style: AgapTheme.body(
                                    weight: FontWeight.w500),
                                decoration: InputDecoration(
                                  hintText: 'nurse@rhu.gov.ph',
                                  prefixIcon: const Icon(
                                      Icons.person_outline_rounded,
                                      color: AgapTheme.slate400,
                                      size: 20),
                                ),
                                validator: (v) => (v == null || v.isEmpty)
                                    ? 'Required'
                                    : null,
                              ),

                              const SizedBox(height: 18),

                              // Password field
                              _FieldLabel(text: 'PASSWORD'),
                              const SizedBox(height: 6),
                              TextFormField(
                                controller: _passCtrl,
                                obscureText: _obscurePass,
                                textInputAction: TextInputAction.done,
                                onFieldSubmitted: (_) => _login(),
                                style: AgapTheme.body(
                                    weight: FontWeight.w500),
                                decoration: InputDecoration(
                                  hintText: '••••••••',
                                  prefixIcon: const Icon(
                                      Icons.lock_outline_rounded,
                                      color: AgapTheme.slate400,
                                      size: 20),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscurePass
                                          ? Icons.visibility_off_outlined
                                          : Icons.visibility_outlined,
                                      color: AgapTheme.slate400,
                                      size: 20,
                                    ),
                                    onPressed: () => setState(
                                        () => _obscurePass = !_obscurePass),
                                  ),
                                ),
                                validator: (v) => (v == null || v.isEmpty)
                                    ? 'Required'
                                    : null,
                              ),

                              // Error message
                              if (_error != null) ...[
                                const SizedBox(height: 14),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: AgapTheme.red50,
                                    borderRadius:
                                        BorderRadius.circular(10),
                                    border: Border.all(
                                        color: AgapTheme.red500
                                            .withOpacity(0.3)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(
                                          Icons.error_outline_rounded,
                                          color: AgapTheme.red500,
                                          size: 16),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(_error!,
                                            style: AgapTheme.body(
                                                size: 12,
                                                color: AgapTheme.red500)),
                                      ),
                                    ],
                                  ),
                                ),
                              ],

                              const SizedBox(height: 28),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // ── Button ─────────────────────────────────────────────
                  _staggered(
                    3,
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _login,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AgapTheme.teal700,
                            disabledBackgroundColor:
                                AgapTheme.slate200,
                            foregroundColor: AgapTheme.white,
                            padding: const EdgeInsets.symmetric(
                                vertical: 18),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 0,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                      color: AgapTheme.white,
                                      strokeWidth: 2.5),
                                )
                              : const Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.center,
                                  children: [
                                    Text('Sign In',
                                        style: TextStyle(
                                            fontSize: 16,
                                            fontWeight:
                                                FontWeight.w700)),
                                    SizedBox(width: 8),
                                    Icon(Icons.arrow_forward_rounded,
                                        size: 18),
                                  ],
                                ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),

                  // ── Footer ─────────────────────────────────────────────
                  Text(
                    'Agap · Nagcarlan RHU Network',
                    style: AgapTheme.body(
                        size: 11, color: AgapTheme.slate400),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel({required this.text});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: AgapTheme.label(size: 10, color: AgapTheme.slate500),
    );
  }
}

/// Subtle dot-grid background painter.
class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 1;
    const gap = 28.0;
    for (double x = 0; x < size.width; x += gap) {
      for (double y = 0; y < size.height; y += gap) {
        canvas.drawCircle(Offset(x, y), 1.5, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_) => false;
}