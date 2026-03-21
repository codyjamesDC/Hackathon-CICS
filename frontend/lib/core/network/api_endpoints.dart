import 'package:hackathon_cics/core/utils/constants.dart';

abstract final class ApiEndpoints {
  static const String baseUrl = kBaseUrl;

  static const String medicines = '/api/medicines';

  static const String rhu = '/api/rhu';
  static String rhuById(String id) => '/api/rhu/$id';

  static const String stockEntries = '/api/stock-entries';
  static const String stockEntriesBatch = '/api/stock-entries/batch';
  static String stockEntriesByRhu(String rhuId) =>
      '/api/stock-entries?rhuId=$rhuId';
  static String stockEntriesByRhuAndMedicine(
          String rhuId, String medicineId) =>
      '/api/stock-entries?rhuId=$rhuId&medicineId=$medicineId';

  static String dashboardRhu(String rhuId) => '/api/dashboard/rhu/$rhuId';

  static const String alerts = '/api/alerts';
}
