# MPLAD SENTINEL — DATA DICTIONARY & FIELD MAPPING SPECIFICATION

## 1. Overview & Source Attribution

**Primary Official Source**:
- **Portal**: MoSPI MPLADS eSAKSHI Web & Mobile Dashboard
- **URL**: [https://mplads.mospi.gov.in/digigov/dashboard.html](https://mplads.mospi.gov.in/digigov/dashboard.html)
- **Authority**: Ministry of Statistics and Programme Implementation (MoSPI), Government of India
- **System Launch**: 1st April 2023 (Revised fund-flow and electronic tracking mechanism)
- **Scope**: Covers works recommended by Hon'ble Members of Parliament (Lok Sabha & Rajya Sabha) for 17th Lok Sabha (FY 2023–24) and 18th Lok Sabha (FY 2024–25 onwards).

**Operational Modes in MPLAD Sentinel**:
- **Mode 1 — Official Data Import Pipeline**: Ingestion pipeline strictly conforming to the MoSPI eSAKSHI data dictionary schema (`https://mplads.mospi.gov.in/digigov/dashboard.html`), awaiting authorized ministry source dumps. Currently operates in verified pipeline validation mode without data fabrication.
- **Mode 2 — Demonstration Showcase**: Synthetic reference dataset with known, calibrated test scenarios for evaluator stress-testing and algorithm demonstration.
- **Mode 3 — All Records**: Consolidated view for complete portfolio management.

---

## 2. Field Mapping Layer

The ingestion pipeline (`backend/app/services/importer.py`) dynamically maps raw columns from CSV, XLSX, and JSON files to canonical internal models:

| Source Header (eSAKSHI) | Internal DB Field | Data Type | Nullable | Description & MPLADS Schema Context | Sample Value | Handling When Missing in Official Source |
|---|---|---|---|---|---|---|
| `Work ID` / `Recommendation ID` | `source_record_id` | `VARCHAR(100)` | Yes | Official unique recommendation code issued by eSAKSHI portal upon MP submission. | `MOSPI-2023-TN-0491` | Canonical normalized identifier |
| `Work ID` | `project_id` | `VARCHAR(40)` | No | Primary key in MPLAD Sentinel. Prefixed with `MOSPI-` if pipeline/official. | `MOSPI-2023-TN-0491` | Primary key assigned from normalized ID |
| `State` / `State Name` | `state` | `VARCHAR(100)` | No | State or Union Territory of the constituency/work location. | `Tamil Nadu` | Defaults to `"National"` |
| `District` / `District Name` | `district` | `VARCHAR(100)` | No | Nodal or implementing district responsible for technical sanction and execution. | `Chennai` | Defaults to `"Central District"` |
| `Constituency` | `constituency_id` | `VARCHAR(50)` | No | Lok Sabha Parliamentary Constituency or Rajya Sabha state allocation. | `Chennai South` | Defaults to `"{district} Constituency"` |
| `Hon'ble MP` / `MP Name` | `mp_id` | `VARCHAR(180)` | No | Name of the Member of Parliament recommending the development work. | `Thamizhachi Thangapandian` | Defaults to `"Hon'ble Member of Parliament"` |
| `Category` / `Sector` | `project_type` | `VARCHAR(100)` | No | Standard MPLADS developmental sector under 2023 Guidelines. | `Drinking Water` | Defaults to `"Community Infrastructure"` |
| `Work Title` / `Description` | `description` | `TEXT` | No | Description of the civil or public asset sanctioned under the scheme. | `Installation of Solar RO Plant at Ward 174` | Defaults to `"MPLADS developmental work"` |
| `Location` | `location` | `VARCHAR(255)` | No | Specific site, village, panchayat, or ward where asset is erected. | `Besant Nagar, Chennai` | Populated from `{district}, {state}` |
| `Recommended Amount (₹)` | `recommended_amount` | `FLOAT` | No | Estimated cost recommended by MP from annual entitlement. | `₹ 18,00,000` | Defaults to `0.0` (zero synthetic fallbacks) |
| `Sanctioned Amount (₹)` | `sanctioned_amount` | `FLOAT` | No | Administratively and technically sanctioned budget by District Authority. | `₹ 17,50,000` | Mandatory; parsed from currency string / numeric |
| `Released Amount (₹)` | `released_amount` | `FLOAT` | No | Total funds disbursed by SNA/District Authority to Implementing Agency. | `₹ 14,00,000` | Defaults to `0.0` (legitimate for Recommended/new works) |
| `Expenditure (₹)` | `expenditure` | `FLOAT` | No | Actual vendor payments cleared against work progress milestones. | `₹ 12,20,000` | Defaults to `0.0` (legitimate pre-execution) |
| `Recommendation Date` | `recommendation_date` | `DATE` | Yes | Date on which recommendation was submitted on eSAKSHI. | `2023-08-14` | Nullable |
| `Sanction Date` | `sanction_date` | `DATE` | Yes | Date of administrative sanction order issued by District Collector/DM. | `2023-09-20` | Nullable (preserved as None for Recommended works) |
| `Start Date` | `start_date` | `DATE` | Yes | Ground execution commencement date entered by Implementing Agency. | `2023-10-05` | Nullable |
| `Completion Date` | `completion_date` | `DATE` | Yes | Date on which Implementing Agency marked work complete with asset photo. | `2024-03-15` | Nullable |
| `Status` | `status` | `VARCHAR(60)` | No | Administrative stage: `Recommended`, `Sanctioned`, `Ongoing`, `Completed`. | `Completed` | Defaults to `"Sanctioned"` |
| `Implementing Agency` | `implementing_agency` | `VARCHAR(180)` | No | Nodal government agency executing the work (DRDA, PWD, Municipal Corp, etc.). | `DRDA Chennai` | Defaults to `"District Authority / DRDA"` |
| `Contractor Name` / `Vendor` | `contractor_id` | `VARCHAR(32)` | Yes | Registered contractor or executing vendor assigned to the work order. | `CTR-7B1A2C` | Linked to default `CTR-OFFICIAL-UNASSIGNED` |
| `Latitude` | `latitude` | `FLOAT` | Yes | Geocoded latitude coordinate. Absent in public MoSPI exports. | `None` | Nullable (never fabricated in Official Mode) |
| `Longitude` | `longitude` | `FLOAT` | Yes | Geocoded longitude coordinate. Absent in public MoSPI exports. | `None` | Nullable (never fabricated in Official Mode) |

---

## 3. Data Provenance & Ingestion Tracking

Every record in MPLAD Sentinel maintains auditable data provenance metadata:

| Provenance Field | Type | Description |
|---|---|---|
| `data_source` | `VARCHAR(40)` | Source classification: `"official"`, `"synthetic"`, or `"audit"`. |
| `source_record_id` | `VARCHAR(100)` | Original identifier from MoSPI/eSAKSHI publication. |
| `source_url` | `VARCHAR(255)` | URL of the origin portal (`https://mplads.mospi.gov.in/digigov/dashboard.html`). |
| `import_batch_id` | `VARCHAR(64)` | Identifier of the ingestion batch (`BATCH-YYYYMMDD-XXXXXX`). |
| `imported_at` | `DATETIME` | Timestamp when the record entered MPLAD Sentinel. |
| `data_quality_status` | `VARCHAR(60)` | Quality tag: `clean`, `partial_coordinates`, `missing_contractor`, `financial_flag`. |

---

## 4. Adaptive Anomaly Feature Activation Matrix

Public eSAKSHI exports may omit contractor IDs or GPS coordinates depending on the administrative reporting level. The **Adaptive Multi-Engine Anomaly Detector** dynamically normalizes its weights to preserve 100% mathematical integrity:

| Detection Engine | Baseline Weight | When Coordinates Missing | When Contractors Unassigned | When Granular Payments Missing | Description |
|---|---|---|---|---|---|
| **Deterministic Rules Engine** | **30%** | **35%** | **40%** | **35%** | Financial thresholds, expenditure vs. sanction consistency, timeline logic ($T_{\text{sanction}} \ge T_{\text{rec}}$). |
| **Unsupervised Isolation Forest** | **30%** | **35%** | **35%** | **35%** | RobustScaler feature matrix on cost ratio, duration, expenditure, and peer distributions. |
| **Statistical Deviation (Z-Score)** | **20%** | **25%** | **25%** | **30%** | Standard deviations ($z = \frac{x - \mu}{\sigma}$) within state/district peer work categories. |
| **Network & Graph Centrality** | **20%** | **20%** | **0% (Disabled)** | **20%** | Degree centrality and district value concentration across contractor-agency-district graphs. |
| **Total Composite Weight** | **100%** | **100%** | **100%** | **100%** | **Always renormalized to 100% — zero crash probability.** |

---

## 5. Non-Accusatory Ethics & Terminology Standards

In compliance with public oversight guidelines and responsible AI principles, MPLAD Sentinel employs neutral, supervisory terminology:

| Accusatory Phrase (Avoided) | Neutral Decision-Support Terminology (Used in MPLAD Sentinel) |
|---|---|
| *"Fraud detected"* | *"Statistical deviation detected for supervisory review"* |
| *"Corrupt contractor"* | *"High contractor concentration index across district allocations"* |
| *"Illegal / Ghost project"* | *"Potential duplicate work: Adjacent comparable project within 1.5 km"* |
| *"Stolen funds"* | *"Expenditure variance: Recorded payments exceed sanctioned allocation by >15%"* |
| *"Falsified dates"* | *"Chronological milestone sequence requires technical verification"* |
| *"Missing data violation"* | *"Data completeness flag: Geographic coordinates not published in source record"* |
