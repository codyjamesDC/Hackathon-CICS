class AgapDateUtils {
  AgapDateUtils._();

  static String toIso8601Utc(DateTime dt) {
    final u = dt.toUtc();
    final y  = u.year.toString().padLeft(4, '0');
    final mo = u.month.toString().padLeft(2, '0');
    final d  = u.day.toString().padLeft(2, '0');
    final h  = u.hour.toString().padLeft(2, '0');
    final mi = u.minute.toString().padLeft(2, '0');
    final s  = u.second.toString().padLeft(2, '0');
    final ms = u.millisecond.toString().padLeft(3, '0');
    return '$y-$mo-${d}T$h:$mi:$s.${ms}Z';
  }

  static String nowUtcIso() => toIso8601Utc(DateTime.now());

  static String relativeTime(String? isoString) {
    if (isoString == null) return 'never';
    final dt = DateTime.tryParse(isoString)?.toLocal();
    if (dt == null) return 'unknown';

    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'just now';
    if (diff.inMinutes < 60) {
      return '${diff.inMinutes} ${diff.inMinutes == 1 ? 'minute' : 'minutes'} ago';
    }
    if (diff.inHours < 24) {
      return '${diff.inHours} ${diff.inHours == 1 ? 'hour' : 'hours'} ago';
    }
    return '${diff.inDays} ${diff.inDays == 1 ? 'day' : 'days'} ago';
  }

  static String formatDate(String? isoString) {
    if (isoString == null) return '—';
    final dt = DateTime.tryParse(isoString)?.toLocal();
    if (dt == null) return '—';
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }
}
