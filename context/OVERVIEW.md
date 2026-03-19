# Agap — Project Overview

## What is Agap?

Agap is a predictive medicine stock intelligence system for Rural Health Units (RHUs) in the Philippines. It replaces a 3-week manual requisition cycle with a 3-hour automated workflow.

## The Problem

Rural Health Units run out of essential medicines not because of budget failures, but because there is no real-time visibility into stock levels. The current process:

1. Nurse notices a medicine is running low
2. Nurse writes a requisition by hand
3. Requisition is passed through 3 desks over ~3 weeks
4. Provincial pharmacy eventually processes the request
5. The child who needed amoxicillin last week already went without

The DOH's existing MIS is a desktop compliance tool that nurses fill out monthly. It is not a real-time signal. The supply chain is not broken — the visibility into it is.

## The Solution

Two interfaces, one system:

### Nurse App (Flutter, offline-first)
- Submit a stock count in 90 seconds
- See **days remaining** per medicine (not just quantity)
- Works fully offline — submissions queue locally and sync when signal returns
- Optimized for low-end Android devices with intermittent connectivity

### MHO Dashboard (SvelteKit, Web)
- Spatial heatmap of all RHUs in the municipality (MapLibre GL / PostGIS-powered)
- See which barangays are burning through which medicines fastest
- One-tap requisition approval
- Breach alerts (stockout projections) and silence alerts (RHUs that stopped reporting)
- Visualized drill-down with ECharts consumption trend projections

## Core Engines

### Consumption Velocity Engine
Tracks how fast each medicine is being consumed across all RHUs. Projects exactly when each shelf will hit zero at the current rate. Without this, the app is a stock counter with no predictive value.

### Anomaly Detection Layer
When a medicine is consumed significantly faster than its 30-day baseline, flag it as an unusual demand event. A paracetamol spike surfaces before anyone files an official outbreak report. Without this, a dengue surge looks identical to a normal week until it is too late. The system does not diagnose — it flags for human follow-up.

## Domain Terms

| Term | Meaning |
|---|---|
| **RHU** | Rural Health Unit — a barangay-level clinic staffed by a nurse |
| **MHO** | Municipal Health Officer — oversees all RHUs in a municipality |
| **Barangay** | Smallest administrative division in the Philippines |
| **Stockout** | When a medicine hits zero on the shelf |
| **Consumption velocity** | Rate of medicine usage (units/day), used to project days remaining |
| **Threshold breach** | When projected days remaining drops below a critical level (e.g. 7-14 days) |
| **Requisition** | A formal request for medicine resupply from the provincial pharmacy |
| **Participation alert** | Triggered when an RHU goes silent (no stock entries for X days) |
| **Audit trail** | Immutable log: stock_entry → threshold_breach → requisition_drafted → MHO_approved → email_sent → pharmacy_acknowledged |

## Value Proposition

> "Requisition filed: 8:47am. Previous average: 3 weeks."

Agap does not optimize the existing process. It bypasses it.
