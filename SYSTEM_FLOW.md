# Agap System Workflow

This document explains the high-level workflow of the Agap Medicine Stock Intelligence System, following the complete lifecycle from the initial stock submission to the final requisition email dispatch.

### 1. Submission of Entries (e.g., from Nagcarlan)
Nurses from Rural Health Units (RHUs, like Nagcarlan) submit the current quantities of medicine stock they have on hand through the system. The platform instantly saves this record, calculates the exact timestamps, and logs an audit trail for accountability. 

### 2. Velocity Engine
Immediately after a stock entry is submitted, the system's **Velocity Engine** springs into action. It compares the current stock count and submission date against the previous entry to calculate the *consumption rate* (velocity). This tells the system exactly how many units of a medicine are being consumed per day. If the engine determines the stock is projected to run out soon (e.g., within 7 days), it triggers a "Threshold Breach" alert.

### 3. Smoothing Algorithm
Raw consumption data is naturally volatile; one unusually busy day shouldn't drastically alter long-term projections. To tackle this, the Velocity Engine applies an **Exponential Weighted Moving Average (EWMA)** smoothing mechanism. It conservatively blends a small percentage of the current velocity drop (the spike) with the historical established baseline average. This "smoothes" out day-to-day fluctuations, ensuring that stock-out projections are highly reliable and not constantly swinging.

### 4. Anomaly Detection
While the smoothing engine helps prevent false stock-out alarms, the system still watches for severe deviations. The **Anomaly Detection** service compares the raw, short-term velocity against the smoothed, long-term historical baseline. If an RHU suddenly consumes a medicine significantly faster than normal (e.g., a 2.0x multiplier jump), the system immediately flags this as an "Anomaly Spike". This alerts the Municipal Health Office (MHO) in real-time, allowing them to quickly investigate potential disease outbreaks or stock abuse.

### 5. Email Detection & Requisition Automation
When medicines hit critical levels and trigger a "Threshold Breach", the system intelligently batches them and auto-drafts a **Requisition** form detailing exactly what needs restocked to hit a 30-day baseline. Once the MHO reviews and approves this request with a single tap, the **Email Notification** service automatically kicks in. It dynamically generates a formalized rich PDF of the requisition form, attaching and dispatching it directly via email to the appropriate stakeholders to execute the rollout.
