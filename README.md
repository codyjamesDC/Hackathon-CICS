# Agap — Predictive Medicine Stock Intelligence

> What currently takes 3 weeks now takes 3 hours.

Agap is a predictive medicine stock intelligence system for Rural Health Units (RHUs) in the Philippines. It gives Municipal Health Officers a 7–14 day warning window before any shelf hits zero.

## Quick Links

| Document | Description |
|---|---|
| [Architecture](./ARCHITECTURE.md) | Tech stack, installed packages, data flow |
| [Overview](./context/OVERVIEW.md) | Problem statement, solution, domain glossary |
| [Features](./context/FEATURES.md) | All features with inputs/outputs/dependencies |
| [Data Model](./context/DATA_MODEL.md) | Database schema, relationships, PostGIS queries |
| [Frontend](./context/FRONTEND.md) | Flutter architecture, folder structure, offline-first |
| [Backend](./context/BACKEND.md) | Hono API, endpoints, velocity engine, anomaly detection |

## Monorepo

```
Hackathon-CICS/
├── frontend/     # Flutter mobile app (Nurse offline client)
├── dashboard/    # SvelteKit web app (MHO heatmap and approval platform)
├── backend/      # Hono API server (TypeScript)
├── context/      # Project documentation
└── ARCHITECTURE.md
```

## Getting Started

### Frontend (Nurse)
```bash
cd frontend
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run
```

### Dashboard (MHO)
```bash
cd dashboard
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npx tsx src/index.ts
```

## Roles

| Role | Access |
|---|---|
| **Nurse** | Submit stock counts (90 sec), view days-remaining per medicine |
| **MHO** | Heatmap dashboard, one-tap requisition approval, breach/silence alerts |