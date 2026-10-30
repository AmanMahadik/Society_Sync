import { Profile } from './data-manager';

export function getReportTemplate(
  profile: Profile | null,
  selectedEvent: any,
  initials: string,
  totalIncome: number,
  totalExpense: number,
  balance: number,
  incomeRows: string,
  expenseRows: string,
  incPercent: number,
  expPercent: number,
  balPercent: number,
  chartColumns: string,
  chartLabels: string,
  incomeCount: number,
  expenseCount: number
): string {
  const currentDate = new Date().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Event Bills & Transactions Report</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700;8..60,900&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

:root {
  --ink: #10243E;
  --ink-soft: #1B3A5C;
  --gold: #C9A227;
  --gold-deep: #9C7C1B;
  --paper: #FBF9F4;
  --paper-card: #FFFFFF;
  --slate: #5B6472;
  --slate-light: #8B93A1;
  --line: #E3DCC9;
  --green: #1E7245;
  --green-bg: #EAF4ED;
  --red: #A8401C;
  --red-bg: #FBEAE3;
  --gold-bg: #FBF3DC;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  font-family: 'Inter', sans-serif;
  color: var(--ink);
  background: #ccc;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── STRICT A4: each .page is exactly one printed sheet ── */
.page {
  width: 210mm;
  height: 297mm;
  overflow: hidden;           /* never spill onto next page */
  position: relative;
  background: var(--paper);
  margin: 0 auto 8mm auto;
  page-break-after: always;
  page-break-inside: avoid;
  box-shadow: 0 3px 18px rgba(0,0,0,.18);
}
.page:last-child { page-break-after: auto; }

@page {
  size: A4 portrait;
  margin: 0;
}
@media print {
  html, body { background: none; }
  .page { margin: 0; box-shadow: none; }
}

/* ── Spine ── */
.spine {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 14mm;
  background: linear-gradient(180deg, var(--ink) 0%, var(--ink-soft) 100%);
  z-index: 2;
}
.spine-label {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%,-50%) rotate(-90deg);
  white-space: nowrap;
  color: var(--gold);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8px;
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 600;
}

/* ── Content area (inside spine, inside footer) ── */
.content {
  position: absolute;
  top: 0; left: 14mm; right: 0;
  bottom: 12mm;                /* leave room for footer */
  padding: 11mm 13mm 4mm 12mm;
  overflow: hidden;
}

/* ── Running header ── */
.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1.6px solid var(--ink);
  padding-bottom: 5px;
  margin-bottom: 7mm;
}
.doc-header .h-left {
  font-family: 'Source Serif 4', serif;
  font-weight: 700;
  font-size: 11.5px;
}
.doc-header .h-right {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  color: var(--slate);
  letter-spacing: .5px;
}

/* ── Footer ── */
.doc-footer {
  position: absolute;
  bottom: 0; left: 14mm; right: 0;
  height: 12mm;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 13mm 0 12mm;
  border-top: .75px solid var(--line);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 7.5px;
  color: var(--slate-light);
  letter-spacing: .3px;
  background: var(--paper);
}

/* ═══════════════ COVER ═══════════════ */
.cover { background: var(--ink); }
.cover::before {
  content: "";
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 82% 6%,  rgba(201,162,39,.18), transparent 44%),
    radial-gradient(circle at 8%  93%, rgba(201,162,39,.12), transparent 40%);
}
.cover-frame {
  position: absolute;
  top: 11mm; left: 11mm; right: 11mm; bottom: 11mm;
  border: 1.2px solid rgba(201,162,39,.48);
  z-index: 1;
}
.cover-frame::before {
  content: "";
  position: absolute; inset: 6px;
  border: 1px solid rgba(201,162,39,.22);
}

/* all cover content in one flex column that fills 297mm */
.cover-body {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  padding: 22mm 20mm 20mm 22mm;
  color: #fff;
}
.cover-eyebrow {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8.5px;
  letter-spacing: 3px;
  color: var(--gold);
  text-transform: uppercase;
  margin-bottom: 8mm;
}
.cover-seal {
  width: 68px; height: 68px;
  border-radius: 50%;
  border: 2px solid var(--gold);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 7mm;
  position: relative;
  flex-shrink: 0;
}
.cover-seal::before {
  content: "";
  position: absolute; inset: 7px;
  border: 1px solid rgba(201,162,39,.5);
  border-radius: 50%;
}
.cover-seal-mark {
  font-family: 'Source Serif 4', serif;
  font-weight: 700;
  font-size: 22px;
  color: var(--gold);
}
.cover-title {
  font-family: 'Source Serif 4', serif;
  font-weight: 700;
  font-size: 44px;
  line-height: 1.08;
  margin-bottom: 7mm;
  flex-shrink: 0;
}
.cover-title em { font-style: normal; color: var(--gold); }
.cover-sub {
  font-size: 12px;
  color: #C9D2DE;
  line-height: 1.7;
  max-width: 120mm;
  flex-shrink: 0;
}

/* push stamp + meta to bottom */
.cover-spacer { flex: 1; }

.cover-stamp {
  margin-bottom: 7mm;
  text-align: right;
}
.cover-stamp .s-amount {
  font-family: 'Source Serif 4', serif;
  font-weight: 700;
  font-size: 32px;
  color: var(--gold);
}
.cover-stamp .s-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8.5px;
  letter-spacing: 2px;
  color: #C9D2DE;
  margin-top: 2px;
}
.cover-meta {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border-top: 1px solid rgba(255,255,255,.2);
  padding-top: 6mm;
  flex-shrink: 0;
}
.cover-meta .m-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 3px;
}
.cover-meta .m-value {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}

/* ═══════════════ TYPOGRAPHY ═══════════════ */
h1.sec { font-family: 'Source Serif 4', serif; font-weight: 700; font-size: 22px; color: var(--ink); margin-bottom: 2.5mm; line-height: 1.15; }
h2.sec { font-family: 'Source Serif 4', serif; font-weight: 700; font-size: 16px; color: var(--ink); margin-bottom: 2mm; }
.rule { width: 38px; height: 3.5px; background: var(--gold); margin-bottom: 5mm; border-radius: 2px; }
.intro { font-size: 10.5px; color: var(--slate); line-height: 1.7; max-width: 155mm; margin-bottom: 6mm; }

/* ═══════════════ SUMMARY CARDS ═══════════════ */
.summary-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 4mm; margin-bottom: 5mm; }
.stat-card { background: var(--paper-card); border: 1px solid var(--line); border-top: 3.5px solid var(--gold); padding: 5mm 4.5mm 4mm; }
.stat-card .s-label { font-family: 'IBM Plex Mono', monospace; font-size: 7.5px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--slate); margin-bottom: 3.5mm; line-height: 1.4; }
.stat-card .s-value { font-family: 'Source Serif 4', serif; font-weight: 700; font-size: 24px; color: var(--ink); line-height: 1; }
.stat-card .s-foot { font-size: 8.5px; color: var(--slate-light); margin-top: 2.5mm; padding-top: 2.5mm; border-top: .75px dashed var(--line); line-height: 1.4; }
.stat-card.income { border-top-color: var(--green); } .stat-card.income .s-value { color: var(--green); }
.stat-card.expense { border-top-color: var(--red);  } .stat-card.expense .s-value { color: var(--red);  }

/* ═══════════════ BALANCE BAR ═══════════════ */
.bal-bar { background: var(--ink); color: #fff; padding: 5.5mm 7mm; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6mm; position: relative; overflow: hidden; }
.bal-bar::after { content:""; position:absolute; right:0;top:0;bottom:0;width:4px; background:var(--gold); }
.bal-bar .b-lbl { font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:2px; text-transform:uppercase; color:var(--gold); margin-bottom:2px; }
.bal-bar .b-desc { font-size:10px; color:#C9D2DE; max-width:110mm; line-height:1.45; }
.bal-bar .b-amt { font-family:'Source Serif 4',serif; font-weight:700; font-size:28px; white-space:nowrap; padding-right:6mm; }

/* ═══════════════ CHART ═══════════════ */
.chart-outer { background: var(--paper-card); border: 1px solid var(--line); padding: 5mm 6mm 4mm; margin-bottom: 5mm; }
.chart-wrap { display: flex; align-items: flex-end; gap: 4.5mm; height: 46mm; border-bottom: 1.8px solid var(--ink); margin-bottom: 2.5mm; }
.chart-bar-col { flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end; }
.chart-amt { font-family:'IBM Plex Mono',monospace; font-size:8.5px; color:var(--ink); margin-bottom:2mm; font-weight:600; text-align:center; line-height:1.3; }
.chart-bar { width:68%; border-radius:3px 3px 0 0; min-height:3mm; }
.chart-bar.exp     { background: linear-gradient(180deg,#C1572F,var(--red));   }
.chart-bar.inc     { background: linear-gradient(180deg,#2A7A4F,var(--green)); }
.chart-bar.neutral { background: linear-gradient(180deg,#2A4D74,var(--ink));   }
.chart-labels { display:flex; gap:4.5mm; }
.chart-lbl { flex:1; text-align:center; font-family:'IBM Plex Mono',monospace; font-size:8px; color:var(--slate); line-height:1.3; }
.chart-legend { display:flex; gap:6mm; margin-top:3mm; justify-content:flex-end; }
.chart-legend-item { display:flex; align-items:center; gap:3px; font-family:'IBM Plex Mono',monospace; font-size:8px; color:var(--slate); }
.ldot { width:9px;height:9px;border-radius:2px;display:inline-block; }

/* ═══════════════ TABLES ═══════════════ */
table.ledger { width:100%; border-collapse:collapse; margin-bottom:5mm; }
table.ledger thead th { font-family:'IBM Plex Mono',monospace; font-size:8px; letter-spacing:1px; text-transform:uppercase; color:#fff; background:var(--ink); text-align:left; padding:3.2mm 3.5mm; font-weight:500; }
table.ledger thead th.r { text-align:right; }
table.ledger tbody td { font-size:10.5px; padding:3mm 3.5mm; border-bottom:.75px solid var(--line); vertical-align:top; line-height:1.4; }
table.ledger tbody tr:nth-child(even) { background:#F6F2E8; }
table.ledger tbody tr:hover { background:#F0EBD8; }
table.ledger tbody td.r { text-align:right; font-family:'IBM Plex Mono',monospace; font-size:10.5px; white-space:nowrap; font-weight:600; }
table.ledger tbody td .iname { font-weight:600; color:var(--ink); font-size:11px; }
table.ledger tbody td .isub  { font-size:9px; color:var(--slate-light); margin-top:1px; }
table.ledger tfoot td { font-family:'Source Serif 4',serif; font-weight:700; font-size:12px; padding:3.5mm 3.5mm; border-top:2px solid var(--ink); background:var(--paper); }
table.ledger tfoot td.r { text-align:right; font-family:'IBM Plex Mono',monospace; font-size:13px; }

.pill { display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:7.5px; letter-spacing:.5px; padding:2px 7px; border-radius:9px; text-transform:uppercase; font-weight:600; }
.pill.paid    { background:var(--green-bg); color:var(--green); }
.pill.income  { background:var(--gold-bg);  color:var(--gold-deep); }
.pill.expense { background:var(--red-bg);   color:var(--red); }

/* recon table */
table.recon { width:100%; border-collapse:collapse; margin-bottom:5mm; }
table.recon thead th { font-family:'IBM Plex Mono',monospace; font-size:8px; letter-spacing:1px; text-transform:uppercase; background:var(--ink); color:#fff; padding:3.5mm; text-align:left; }
table.recon thead th.r { text-align:right; }
table.recon tbody td { padding:3.5mm; border-bottom:.75px solid var(--line); font-size:11.5px; }
table.recon tbody tr:nth-child(even) { background:#F6F2E8; }
table.recon tbody td.r { text-align:right; font-family:'IBM Plex Mono',monospace; font-weight:600; font-size:11.5px; }
table.recon tfoot td { font-family:'Source Serif 4',serif; font-weight:700; font-size:13px; padding:4mm 3.5mm; border-top:2px solid var(--ink); background:var(--paper); }
table.recon tfoot td.r { text-align:right; font-family:'IBM Plex Mono',monospace; font-size:14px; }

/* note */
.note { background:var(--gold-bg); border-left:4px solid var(--gold); padding:4mm 5mm; font-size:10px; color:#5C4A12; line-height:1.65; margin-bottom:5mm; }
.note b { color:var(--gold-deep); }

/* cert */
.cert-grid { display:grid; grid-template-columns:1fr 1fr; gap:12mm; margin-top:10mm; }
.cert-block .c-line { border-bottom:1.2px solid var(--ink); height:14mm; }
.cert-block .c-role { font-family:'Source Serif 4',serif; font-weight:600; font-size:12px; margin-top:2.5mm; }
.cert-block .c-meta { font-family:'IBM Plex Mono',monospace; font-size:8.5px; color:var(--slate); margin-top:1.5mm; line-height:1.6; }
.disclaimer { margin-top:10mm; padding-top:4mm; border-top:.75px solid var(--line); font-size:8.5px; color:var(--slate-light); line-height:1.7; }
</style>
</head>
<body>

<!-- ════════════════════════════════════════
     PAGE 1 — COVER
════════════════════════════════════════ -->
<div class="page cover">
  <div class="cover-frame"></div>

  <div class="cover-body">
    <div class="cover-eyebrow">${profile?.society_name || 'SocietySync'} Residents&rsquo; Welfare Association</div>

    <div class="cover-seal">
      <div class="cover-seal-mark">${initials}</div>
    </div>

    <div class="cover-title">Event Bills &amp;<br/>Transactions <em>Report</em></div>

    <div class="cover-sub">
      An itemized statement of contributions received and expenses incurred for the
      ${selectedEvent.name} celebration, prepared for review by the Society Management
      Committee and General Body.
    </div>

    <div class="cover-spacer"></div>

    <div class="cover-stamp">
      <div class="s-amount">&#8377;${balance.toLocaleString('en-IN')}</div>
      <div class="s-label">CLOSING FUND BALANCE</div>
    </div>

    <div class="cover-meta">
      <div>
        <div class="m-label">Event</div>
        <div class="m-value">${selectedEvent.name}</div>
      </div>
      <div>
        <div class="m-label">Reporting Period</div>
        <div class="m-value">${currentDate}</div>
      </div>
      <div>
        <div class="m-label">Statement Date</div>
        <div class="m-value">${currentDate}</div>
      </div>
    </div>
  </div>
</div>

<!-- ════════════════════════════════════════
     PAGE 2 — FINANCIAL SUMMARY
════════════════════════════════════════ -->
<div class="page">
  <div class="spine"><div class="spine-label">Section 01 — Financial Summary</div></div>
  <div class="content">

    <div class="doc-header">
      <div class="h-left">Event Bills &amp; Transactions Report</div>
      <div class="h-right">${selectedEvent.name.toUpperCase()} &nbsp;|&nbsp; PAGE 02</div>
    </div>

    <h1 class="sec">Financial Summary</h1>
    <div class="rule"></div>
    <p class="intro">
      This statement consolidates all Chandaa (contributions) received from residents and sponsors against
      verified expense bills recorded by the Festival Committee. All figures are in Indian Rupees (&#8377;)
      and are reconciled against bank deposit slips and physical receipt bills on file.
    </p>

    <div class="summary-grid">
      <div class="stat-card income">
        <div class="s-label">Total Contributions Received</div>
        <div class="s-value">&#8377;${totalIncome.toLocaleString('en-IN')}</div>
        <div class="s-foot">${incomeCount} contributions &middot; Reconciled</div>
      </div>
      <div class="stat-card expense">
        <div class="s-label">Total Expenses Incurred</div>
        <div class="s-value">&#8377;${totalExpense.toLocaleString('en-IN')}</div>
        <div class="s-foot">${expenseCount} verified bills</div>
      </div>
      <div class="stat-card">
        <div class="s-label">Closing Fund Balance</div>
        <div class="s-value">&#8377;${balance.toLocaleString('en-IN')}</div>
        <div class="s-foot">Carried forward to Society General Fund</div>
      </div>
    </div>

    <div class="bal-bar">
      <div>
        <div class="b-lbl">Net Position</div>
        <div class="b-desc">${balance >= 0 ? 'Contributions exceeded expenses for this event.' : 'Expenses exceeded contributions for this event.'}</div>
      </div>
      <div class="b-amt">${balance >= 0 ? '+' : '-'} &#8377;${Math.abs(balance).toLocaleString('en-IN')}</div>
    </div>

    <h2 class="sec">Expense Distribution by Category</h2>
    <div class="rule" style="margin-bottom:4mm;"></div>

    <div class="chart-outer">
      <div class="chart-wrap">
        ${chartColumns}
      </div>
      <div class="chart-labels">
        ${chartLabels}
      </div>
      <div class="chart-legend">
        <div class="chart-legend-item"><span class="ldot" style="background:var(--red);"></span> Expense</div>
        <div class="chart-legend-item"><span class="ldot" style="background:var(--ink);"></span> No Spend</div>
      </div>
    </div>

    <div class="note">
      <b>Note:</b> This is an official system-generated financial ledger report compiled directly from
      the verified database of ${profile?.society_name || 'SocietySync'} Co-Op Housing. All figures are subject to committee audit.
    </div>

  </div>
  <div class="doc-footer">
    <span>${profile?.society_name || 'SocietySync'} Residents&rsquo; Welfare Association &middot; Prepared via SocietySync Festival Ledger</span>
    <span>CONFIDENTIAL &mdash; FOR COMMITTEE &amp; RESIDENT CIRCULATION</span>
  </div>
</div>

<!-- ════════════════════════════════════════
     PAGE 3 — INCOME LEDGER
════════════════════════════════════════ -->
<div class="page">
  <div class="spine"><div class="spine-label">Section 02 — Contributions Ledger</div></div>
  <div class="content">

    <div class="doc-header">
      <div class="h-left">Event Bills &amp; Transactions Report</div>
      <div class="h-right">${selectedEvent.name.toUpperCase()} &nbsp;|&nbsp; PAGE 03</div>
    </div>

    <h1 class="sec">Contributions Received (Chandaa)</h1>
    <div class="rule"></div>
    <p class="intro">
      Itemized record of all contributions collected from residents and external sponsors in order of receipt.
      Each entry is cross-referenced against the official receipt book number.
    </p>

    <table class="ledger">
      <thead>
        <tr>
          <th style="width:13%;">Date</th>
          <th style="width:13%;">Receipt No.</th>
          <th>Contributor</th>
          <th style="width:14%;">Mode</th>
          <th style="width:11%;">Status</th>
          <th class="r" style="width:15%;">Amount (&#8377;)</th>
        </tr>
      </thead>
      <tbody>
        ${incomeRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5">Total Contributions Received</td>
          <td class="r">&#8377;${totalIncome.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    <div class="note">
      <b>Verification:</b> All collections are recorded and validated by the Treasurer. Bank transfer
      and UPI entries are reconciled against the society bank statement. Original receipts are on file.
    </div>

  </div>
  <div class="doc-footer">
    <span>${profile?.society_name || 'SocietySync'} Residents&rsquo; Welfare Association &middot; Prepared via SocietySync Festival Ledger</span>
    <span>CONFIDENTIAL &mdash; FOR COMMITTEE &amp; RESIDENT CIRCULATION</span>
  </div>
</div>

<!-- ════════════════════════════════════════
     PAGE 4 — EXPENSE LEDGER
════════════════════════════════════════ -->
<div class="page">
  <div class="spine"><div class="spine-label">Section 03 — Expense Bills Ledger</div></div>
  <div class="content">

    <div class="doc-header">
      <div class="h-left">Event Bills &amp; Transactions Report</div>
      <div class="h-right">${selectedEvent.name.toUpperCase()} &nbsp;|&nbsp; PAGE 04</div>
    </div>

    <h1 class="sec">Expense Bills &amp; Vendor Payments</h1>
    <div class="rule"></div>
    <p class="intro">
      Every expense below is supported by a physical or digital receipt bill uploaded against the
      corresponding transaction in the Festival Ledger module, available for committee audit on request.
    </p>

    <table class="ledger">
      <thead>
        <tr>
          <th style="width:13%;">Date</th>
          <th style="width:13%;">Bill No.</th>
          <th>Vendor / Description</th>
          <th style="width:17%;">Category</th>
          <th style="width:10%;">Receipt</th>
          <th class="r" style="width:14%;">Amount (&#8377;)</th>
        </tr>
      </thead>
      <tbody>
        ${expenseRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5">Total Expenses Incurred</td>
          <td class="r">&#8377;${totalExpense.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    <div class="note">
      <b>Full bill register:</b> Scanned receipts and supporting documents for all expense bills
      are stored securely in Supabase Storage and can be audited via the SocietySync app at any time.
    </div>

    <!-- Income vs Expense vs Balance comparison chart -->
    <h2 class="sec" style="margin-top:4mm;">Income vs Expense vs Balance</h2>
    <div class="rule" style="margin-bottom:4mm;"></div>

    <div class="chart-outer">
      <div class="chart-wrap" style="height:44mm;">
        <div class="chart-bar-col">
          <div class="chart-amt">&#8377;${totalIncome.toLocaleString('en-IN')}<br/><span style="color:var(--green);font-size:7.5px;">INCOME</span></div>
          <div class="chart-bar inc" style="height:${incPercent}%;"></div>
        </div>
        <div class="chart-bar-col">
          <div class="chart-amt">&#8377;${totalExpense.toLocaleString('en-IN')}<br/><span style="color:var(--red);font-size:7.5px;">EXPENSE</span></div>
          <div class="chart-bar exp" style="height:${expPercent}%;"></div>
        </div>
        <div class="chart-bar-col">
          <div class="chart-amount">&#8377;${balance.toLocaleString('en-IN')}<br/><span style="color:var(--ink);font-size:7.5px;">BALANCE</span></div>
          <div class="chart-bar neutral" style="height:${balPercent}%;"></div>
        </div>
      </div>
      <div class="chart-labels">
        <div class="chart-lbl">Total Income</div>
        <div class="chart-lbl">Total Expense</div>
        <div class="chart-lbl">Closing Balance</div>
      </div>
      <div class="chart-legend">
        <div class="chart-legend-item"><span class="ldot" style="background:var(--green);"></span> Income</div>
        <div class="chart-legend-item"><span class="ldot" style="background:var(--red);"></span> Expense</div>
        <div class="chart-legend-item"><span class="ldot" style="background:var(--ink);"></span> Balance</div>
      </div>
    </div>

  </div>
  <div class="doc-footer">
    <span>${profile?.society_name || 'SocietySync'} Residents&rsquo; Welfare Association &middot; Prepared via SocietySync Festival Ledger</span>
    <span>CONFIDENTIAL &mdash; FOR COMMITTEE &amp; RESIDENT CIRCULATION</span>
  </div>
</div>

<!-- ════════════════════════════════════════
     PAGE 5 — CERTIFICATION
════════════════════════════════════════ -->
<div class="page">
  <div class="spine"><div class="spine-label">Section 04 — Certification</div></div>
  <div class="content">

    <div class="doc-header">
      <div class="h-left">Event Bills &amp; Transactions Report</div>
      <div class="h-right">${selectedEvent.name.toUpperCase()} &nbsp;|&nbsp; PAGE 05</div>
    </div>

    <h1 class="sec">Reconciliation &amp; Certification</h1>
    <div class="rule"></div>
    <p class="intro">
      The figures presented in this report have been reviewed against bank statements, cash registers,
      and physical bills on file. The undersigned certify that this statement presents a true and fair
      summary of all funds received and expended for this event.
    </p>

    <table class="recon">
      <thead>
        <tr>
          <th>Particulars</th>
          <th class="r">Amount (&#8377;)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Opening Balance (carried from previous event)</td>
          <td class="r">&#8377;0.00</td>
        </tr>
        <tr>
          <td>Add: Total Contributions Received &mdash; ${incomeCount} entries</td>
          <td class="r" style="color:var(--green);">+ &#8377;${totalIncome.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>Less: Total Expenses Incurred &mdash; ${expenseCount} entries</td>
          <td class="r" style="color:var(--red);">(&#8377;${totalExpense.toLocaleString('en-IN')})</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td>Closing Balance &mdash; Transferred to Society General Fund</td>
          <td class="r">&#8377;${balance.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    <div class="cert-grid">
      <div class="cert-block">
        <div class="c-line"></div>
        <div class="c-role">Festival Committee Treasurer</div>
        <div class="c-meta">Name: ______________________&nbsp;&nbsp;Date: __________</div>
      </div>
      <div class="cert-block">
        <div class="c-line"></div>
        <div class="c-role">Society Secretary / Administrator</div>
        <div class="c-meta">Name: ______________________&nbsp;&nbsp;Date: __________</div>
      </div>
    </div>

    <div class="disclaimer">
      This is an official system-generated report exported from the SocietySync Festival Ledger module.
      Statement generated on ${currentDate}. For supporting bills, transaction logs, and audit trails, refer
      to the live ledger within the SocietySync application. This document is confidential and intended
      for committee and resident circulation only.
    </div>

  </div>
  <div class="doc-footer">
    <span>${profile?.society_name || 'SocietySync'} Residents&rsquo; Welfare Association &middot; Prepared via SocietySync Festival Ledger</span>
    <span>CONFIDENTIAL &mdash; FOR COMMITTEE &amp; RESIDENT CIRCULATION</span>
  </div>
</div>

</body>
</html>
  `;
}
