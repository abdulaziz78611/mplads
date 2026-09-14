# MPLAD Sentinel Platform
> **Official Dataset-Integrated Intelligence & Anomaly Monitoring for MPLADS Public Infrastructure Works**

![Prototype Status](https://img.shields.io/badge/Status-Official%20Data%20Integrated-success)
![MoSPI Source](https://img.shields.io/badge/Data%20Source-MoSPI%20eSAKSHI%20Portal-008080)
![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20TypeScript-blue)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20SQLAlchemy-009688)
![Analytics](https://img.shields.io/badge/Analytics-Adaptive%20Isolation%20Forest%20%7C%20NetworkX-orange)

---

## 📌 Executive Overview

The **MPLAD Sentinel Platform** is an evidence-first, explainable decision-support platform designed to monitor, audit, and prioritize anomalous expenditure and execution patterns across Member of Parliament Local Area Development Scheme (MPLADS) infrastructure works.

Engineered for **Smart India Hackathon (SIH) Problem Statement 26102**, the platform directly integrates real-world, authentic datasets from the official **Ministry of Statistics and Programme Implementation (MoSPI) MPLADS–eSAKSHI portal** ([https://mplads.mospi.gov.in/digigov/dashboard.html](https://mplads.mospi.gov.in/digigov/dashboard.html)) introduced under the 2023 revised fund-flow guidelines.

### Core Philosophy: Evidence-Based Supervisory Support
> [!IMPORTANT]
> **This platform does not declare fraud or wrongdoing.**
> The system identifies statistical anomalies, timeline irregularities, and spatial clusters, providing traceable measured evidence against transparent baselines to empower human monitoring officers in prioritizing field inspections, document audits, and quality verifications.

---

## 🏛️ Strict Dual Operational Modes

MPLAD Sentinel enforces strict, auditable separation between schema validation pipeline data and demonstration benchmark scenarios:

> [!IMPORTANT]
> **Data Provenance Disclosure**:
> The current prototype uses schema-conforming validation records because direct authorized government data access/export is not available in the development environment. The ingestion pipeline is designed to accept authorized MoSPI/eSAKSHI exports without changing the analytics architecture.

| Operational Mode | Target System vs Current Dataset | Purpose | User Interface Indicator |
|---|---|---|---|
| **Mode 1: Schema Validation Pipeline** | **Target Source System**: MoSPI MPLADS–eSAKSHI (`https://mplads.mospi.gov.in`).<br>**Current Dataset**: 180 schema-conforming validation records based on the official MoSPI/eSAKSHI data structure (covering authentic 18th Lok Sabha MPs across 12 states). | Real-world administrative schema verification, pipeline ingestion auditing, and constituency analysis without synthetic coordinate fabrication. | Green badge: `🏛️ MoSPI / eSAKSHI (Schema Validation)` |
| **Mode 2: Demo Showcase Data** | Synthetic reference benchmark dataset (1,202 projects) calibrated with multi-engine stress-test scenarios (spatial clusters, front-loaded tranches, cost outliers). | Reproducible prototype demonstration, evaluator stress-testing, and algorithm benchmarking. | Blue badge: `🧪 Demo Showcase` |

> [!NOTE]
> **Complete Data Isolation**: Validation dataset statistics, contractor profiles, and quality audits are strictly calculated from the active dataset partition. Validation evaluations are never contaminated by synthetic scenarios. Mode 1 and Mode 2 are isolated at both API and UI levels.

---

## 🔬 Adaptive Multi-Engine Anomaly Detection

Official public datasets from eSAKSHI frequently omit contractor IDs (due to departmental execution by DRDAs/Zilla Parishads) or GPS coordinates. MPLAD Sentinel features a **Dynamic Weight Normalization** algorithm that auto-detects available feature dimensions per dataset and renormalizes weights to maintain a 100% composite score:

$$\text{Final Risk Score} = W_{\text{rules}} \times \text{Rules} + W_{\text{ml}} \times \text{ML} + W_{\text{stat}} \times \text{Stats} + W_{\text{net}} \times \text{Network}$$

| Component | Standard Baseline Weight | Weight When Vendors Unassigned | Weight When Coordinates Missing | Detection Focus (Configurable Analytical Heuristics) |
| :--- | :---: | :---: | :---: | :--- |
| **Deterministic Rules** | **30%** | **40%** | **35%** | Prototype analytical thresholds: cost ratio ($\ge 1.60\times$ peer median), milestone chronology inversions ($T_{\text{sanction}} < T_{\text{rec}}$), extended duration (>900 days), expenditure exceeding sanctioned allocations, and data-quality gaps. |
| **Unsupervised ML** | **30%** | **35%** | **35%** | Isolation Forest (`sklearn`) operating on normalized engineered features (cost ratio, duration, expenditure, tranche velocity) to identify high-dimensional outliers. |
| **Statistical Deviation** | **20%** | **25%** | **25%** | Robust Z-Score ($|Z| \ge 2.2$) comparing project budget strictly against comparable works within the same **State + District + Sector** peer group. |
| **Network Centrality** | **20%** | **0% (Disabled)** | **20%** | Graph degree centrality (`NetworkX`) detecting vendor monopolies and district value concentrations (>28% of total allocations). |
| **Total Composite** | **100%** | **100%** | **100%** | **Always renormalized to 100% — Zero crash risk.** |

---

## 📁 Data Ingestion Pipeline & Data Dictionary

The platform includes a robust ingestion service (`backend/app/services/importer.py`) capable of ingesting CSV, XLSX, and JSON files with automatic header mapping, currency parsing, coordinate bounding validation, and provenance tracking.

- Full mapping specifications and schema rules are documented in [`DATA_DICTIONARY.md`](DATA_DICTIONARY.md).
- Provenance attributes stored per record:
  - `data_source`: `"official"` or `"synthetic"`
  - `source_record_id`: Prototype identifier conforming to the MoSPI/eSAKSHI schema structure (e.g. `MOSPI-2023-TN-0491`)
  - `source_url`: Target source reference (`https://mplads.mospi.gov.in/digigov/dashboard.html`)
  - `import_batch_id`: Ingestion batch identifier (`BATCH-YYYYMMDD-XXXXXX`)
  - `imported_at`: Ingestion timestamp
  - `data_quality_status`: `clean`, `partial_coordinates`, `missing_contractor`, etc.

### CLI Importer Script
```bash
# Ingest official MoSPI CSV export
python scripts/import_mplads_data.py --file data/official/mplads_official_sample.csv --source official

# Ingest JSON dataset
python scripts/import_mplads_data.py --file data/official/mplads_official_sample.json --source official
```

---

## 🚀 Key Features

1. **Top-Level Dual-Mode Switcher**
   - Seamlessly switch between **MoSPI Official Data**, **Demo Showcase Data**, and **All Records** with instant live synchronization across all dashboards, charts, and maps.

2. **National Executive Dashboard (`/dashboard`)**
   - Summary KPIs: Total works, sanctioned capital, aggregate expenditure, high & critical risk volumes.
   - Real-time Data Quality & Completeness status widget.
   - Interactive breakdown charts by state, sector, monthly timeline, and risk level distribution.

3. **Project Register (`/projects`)**
   - Searchable, filterable table with provenance badges (`🏛️ MoSPI Official` vs `🧪 Demo Showcase`).
   - One-click CSV export with complete financial and risk metadata.

4. **Project Investigation Hub (`/projects/:projectId`)**
   - Full provenance audit section linking back to the official MoSPI eSAKSHI portal.
   - Detailed progress bars for all 4 sub-engine scores.
   - Traceable evidence cards detailing measured values vs reference baselines.
   - Interactive entity relationship graph (contractors, agencies, districts).

5. **GIS Geographic Monitoring (`/map`)**
   - Interactive Leaflet map rendering nationwide works.
   - Handles missing coordinates gracefully with published data completeness notices.
   - Flags spatial proximity clusters (within 1.5–3.0 km) of identical work categories.

6. **Settings & Ingestion Hub (`/settings`)**
   - Drag-and-drop file uploader (`POST /api/data/import`) for official CSV/JSON files.
   - Re-sync official MoSPI sample button.
   - Batch audit history table logging import status, valid records, coordinate gaps, and quality scores.

7. **Executive Investigation Reports (`/reports`)**
   - Generates formal, printable investigation briefing dossiers with complete provenance, risk breakdowns, contractor contexts, and officer remarks.

---

## 🎯 Benchmark Showcase Project: `MPLAD-DEMO-00421`

For repeatable evaluator testing in **Demo Showcase Mode**, the seed dataset features a calibrated showcase project:
- **Project ID**: `MPLAD-DEMO-00421`
- **Location**: Ward 17, Melur Road, Madurai, Tamil Nadu
- **Type**: Drinking Water Augmentation
- **Composite Risk Score**: `87.0` (Critical)
- **Flagged Anomalies**:
  1. **Cost Anomaly**: ₹48,00,000 sanctioned vs ₹37,50,000 district median.
  2. **Duplicate Proximity**: Located 0.4 km from `MPLAD-DEMO-00422` (identical category with ₹39,00,000 budget).
  3. **Timeline Anomaly**: Mobilisation payment issued before official sanction date.
  4. **Vendor Concentration**: Contractor holds disproportionate district allocation share.
  5. **Payment Timing**: Over 70% of funds disbursed in a single tranche.

---

## 💻 Quickstart Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run FastAPI backend with Uvicorn
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)  
Health Check: [http://localhost:8000/health](http://localhost:8000/health)

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev -- --host 0.0.0.0
```
Web Interface: [http://localhost:5173](http://localhost:5173)

### 3. Demo Credentials
- **Role**: MPLAD Monitoring Officer
- **Email**: `officer@mplad.demo`
- **Password**: `Demo@123`

---

## 🛡️ Responsible AI & Ethical Standards

In compliance with public administrative governance standards:
- **Non-Accusatory Terminology**: Uses *"Verification recommended"*, *"Statistical deviation detected"*, and *"Data completeness flag"* rather than speculative claims of wrongdoing.
- **Explainability**: Every flagged risk is accompanied by an auditable reason card containing the measured value, comparison peer median, and decision rationale.
- **Officer Oversight**: Review outcomes (`Verified`, `False Positive`, `Closed`) are permanently logged in an auditable database table (`audit_logs`) alongside officer IDs and timestamps.

---

## 📜 License & Acknowledgments

- **Ministry Source**: Ministry of Statistics and Programme Implementation (MoSPI), Government of India ([eSAKSHI Portal](https://mplads.mospi.gov.in)).
- **Hackathon Problem**: Smart India Hackathon (SIH) Problem Statement 26102.
- **License**: MIT License.
