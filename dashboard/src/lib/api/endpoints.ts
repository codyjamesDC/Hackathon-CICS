export const ENDPOINTS = {
  DASHBOARD_HEATMAP: '/api/dashboard/heatmap',
  DASHBOARD_RHU: (id: string) => `/api/dashboard/rhu/${id}`,
  
  REQUISITIONS: '/api/requisitions',
  REQUISITION_DETAIL: (id: string) => `/api/requisitions/${id}`,
  REQUISITION_APPROVE: (id: string) => `/api/requisitions/${id}/approve`,
  
  ALERTS: '/api/alerts',
  ANOMALY_ACKNOWLEDGE: (id: string) => `/api/alerts/anomalies/${id}/acknowledge`,
  RHU_LIST: '/api/rhu',
  STOCK_ENTRIES: '/api/stock-entries',
} as const;

// --------------- Dashboard Interfaces ---------------

export interface DashboardHeatmapRow {
  rhuId: string;
  rhuName: string;
  barangay: string;
  lat: number;
  lng: number;
  worstDaysRemaining: number | null;
  totalMedicines: number;
  breachCount: number;
  lastReportedAt: string;
  status: 'critical' | 'warning' | 'ok' | 'silent';
}

export interface StockEntry {
  id: string;
  quantityOnHand: number;
  submittedAt: string;
}

export interface DashboardMedicineStatus {
  medicineId: string;
  genericName: string;
  unit: string;
  category: string;
  currentStock: number;
  velocityPerDay: number;
  daysRemaining: number;
  criticalThresholdDays: number;
  status: 'critical' | 'warning' | 'ok' | 'silent';
  lastEntryAt: string;
}

export interface DashboardRhuDetail {
  rhu: {
    id: string;
    name: string;
    barangay: string;
  };
  medicines: DashboardMedicineStatus[];
}

// --------------- Requisition Interfaces ---------------

export interface RequisitionItem {
  medicineId: string;
  genericName: string;
  unit: string;
  quantityRequested: number;
  currentStock: number;
}

export interface RequisitionAudit {
  eventType: string;
  actorType: 'system' | 'mho';
  createdAt: string;
  metadata: Record<string, any>;
}

export interface Requisition {
  id: string;
  rhuId: string;
  rhuName: string;
  breachId: string | null;
  status: 'drafted' | 'approved' | 'sent' | 'acknowledged';
  draftedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  sentAt: string | null;
  acknowledgedAt: string | null;
  items: RequisitionItem[];
  audit?: RequisitionAudit[];
}

// --------------- Alert Interfaces ---------------

export interface Alert {
  id: string;
  rhuId: string;
  rhuName: string;
  type: 'threshold_breach' | 'anomaly_spike' | 'participation_alert';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  medicineName: string | null;
  relatedRequisitionId: string | null;
  createdAt: string;
}
