import { BrainCircuit, CheckCircle2, Database, GitBranch, Network, ShieldCheck, Sigma, UserRoundSearch } from 'lucide-react'
import { Notice, PageHeading } from '../components/UI'

const steps = [
  [
    'Schema-Conforming Ingestion Pipeline',
    'MoSPI/eSAKSHI schema-conforming validation records and synthetic benchmark scenarios enter isolated partitions with complete batch provenance.',
    Database,
  ],
  [
    'Cleaning & Quality Auditing',
    'Validates administrative date sequences, financial allocations (expenditure <= sanction), Indian geographical bounding boxes, and records data quality scores.',
    ShieldCheck,
  ],
  [
    'Feature Auto-Detection',
    'Dynamically inspects available fields per dataset. Detects whether GPS coordinates, vendor assignments, or payment milestones are present.',
    Sigma,
  ],
  [
    'Deterministic Rules Engine',
    'Interpretable rules flag cost inflation, milestone timeline inversions, localized spatial duplicates, vendor monopolies, and data quality gaps.',
    CheckCircle2,
  ],
  [
    'Unsupervised Isolation Forest',
    'High-dimensional tree ensemble ranks unusual multidimensional feature combinations. Unsupervised by design — identifies statistical anomalies without bias.',
    BrainCircuit,
  ],
  [
    'Network Centrality Graph',
    'NetworkX constructs entity interaction graphs across contractors, executing agencies, and districts to surface excessive centralization.',
    Network,
  ],
  [
    'Dynamic Weight Normalization',
    'Calculates composite risk (0–100) dynamically re-weighted across active feature engines. Each signal includes measured values and baseline expectations.',
    GitBranch,
  ],
  [
    'Supervisory Action & Audit Trail',
    'Empowers monitoring officers to verify field drawings, schedule physical site inspections, and log legally auditable review remarks.',
    UserRoundSearch,
  ],
]

export default function Methodology() {
  return (
    <>
      <PageHeading
        eyebrow="METHOD & SAFEGUARDS"
        title="Official Data Architecture & Anomaly Detection"
        description="Transparent multi-engine decision support engineered for SIH Problem Statement 26102."
      />

      <Notice>
        This platform identifies statistical anomalies and prioritises works for human supervisory verification. An anomaly score reflects pattern divergence and does not establish fraud or wrongdoing.
      </Notice>

      {/* Decision-support Pipeline Flow */}
      <section className="pipeline panel">
        <div className="pipeline-title">
          <h2>Continuous Decision-Support Pipeline</h2>
          <p>End-to-end processing pipeline from MoSPI eSAKSHI data extraction to officer field review.</p>
        </div>
        <div className="pipeline-flow">
          {[
            'MOSPI eSAKSHI INGESTION',
            'CLEANING & VALIDATION',
            'FEATURE AUTO-DETECTION',
            'RULES + ML + STATS + NETWORK',
            'DYNAMIC WEIGHTING',
            'EXPLAINABILITY DOSSIER',
            'OFFICER VERIFICATION',
          ].map((x, i) => (
            <div key={x} className="pipeline-step">
              <span>{x}</span>
              {i < 6 && <i>↓</i>}
            </div>
          ))}
        </div>
      </section>

      {/* 8-Step Methodology Grid */}
      <section className="method-grid">
        {steps.map(([title, text, Icon]: any, index) => (
          <article className="method-card" key={title}>
            <div className="method-icon">
              <Icon size={20} />
            </div>
            <div>
              <span>STEP {String(index + 1).padStart(2, '0')}</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </section>

      {/* Dynamic Weight Normalization Details */}
      <section className="panel methodology-detail">
        <h2>Adaptive Multi-Engine Weight Matrix</h2>
        <p>
          Official public datasets frequently omit contractor names (due to departmental execution) or GPS coordinates. MPLAD Sentinel dynamically renormalizes weights to maintain a 100% composite score:
        </p>

        <div className="weight-grid" style={{ marginBottom: '20px' }}>
          <div>
            <b>30% → 40%</b>
            <span>Deterministic Rules Engine</span>
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
              Increases to 40% if vendor network is unassigned
            </small>
          </div>
          <div>
            <b>30% → 35%</b>
            <span>Unsupervised Isolation Forest</span>
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
              Scales to 35% on cost ratio, duration & peer features
            </small>
          </div>
          <div>
            <b>20% → 25%</b>
            <span>Statistical Deviation (Z-Score)</span>
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
              Scales to 25% based on category/district medians
            </small>
          </div>
          <div>
            <b>20% → 0%</b>
            <span>Network Concentration Index</span>
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
              Active only when commercial vendors are assigned
            </small>
          </div>
        </div>

        <p>
          Risk classifications: <b>Low (0–30)</b>, <b>Medium (31–60)</b>, <b>High (61–80)</b>, and <b>Critical (81–100)</b>.
        </p>

        <h3>Responsible AI & Ethical Safeguards</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.6 }}>
          <em>The current prototype uses schema-conforming validation records because direct authorized government data access/export is not available in the development environment. The ingestion pipeline is designed to accept authorized MoSPI/eSAKSHI exports without changing the analytics architecture.</em>
        </p>
        <ul>
          <li>
            <b>Complete Data Isolation:</b> Schema-conforming validation records and synthetic benchmark scenarios are partitioned in separate operational modes so validation statistical evaluations are never contaminated by synthetic data.
          </li>
          <li>
            <b>Configurable Anomaly Heuristics:</b> Detection thresholds (e.g. 1.60× peer median, 900 days duration, 28% contractor share) represent prototype analytical heuristics and configurable decision-support benchmarks rather than statutory legal clauses.
          </li>
          <li>
            <b>Peer Group Normalization:</b> Work comparisons evaluate works against peers of the exact same developmental category (e.g. Drinking Water vs Drinking Water) within the same state/district.
          </li>
          <li>
            <b>Explainable Evidence:</b> Every alert surfaces measured figures alongside district peer medians and milestone dates.
          </li>
          <li>
            <b>Non-Accusatory Terminology:</b> Terminology strictly adheres to supervisory audit standards ("Verification recommended", "Statistical deviation detected", "Data completeness flag").
          </li>
        </ul>
      </section>
    </>
  )
}
