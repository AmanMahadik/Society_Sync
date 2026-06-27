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
<meta charset="UTF-8" />
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

  body {
    font-family: 'Inter', sans-serif;
    color: var(--ink);
    background: #e0e0e0;
  }

  /* A4 page: 210mm × 297mm */
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto 12mm auto;
    position: relative;
    background: var(--paper);
    overflow: hidden;
    page-break-after: always;
    box-shadow: 0 4px 24px rgba(0,0,0,0.18);
  }
  .page:last-child { page-break-after: auto; }

  @media print {
    body { background: none; }
    .page { margin: 0; box-shadow: none; }
  }

  /* ---- Spine ---- */
  .spine {
    position: absolute;
    top: 0; left: 0; bottom: 0;
    width: 16mm;
    background: linear-gradient(180deg, var(--ink) 0%, var(--ink-soft) 100%);
    z-index: 2;
  }
  .spine-label {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
    white-space: nowrap;
    color: var(--gold);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .content {
    margin-left: 16mm;
    padding: 14mm 14mm 22mm 13mm;
  }

  /* ---- Running header / footer ---- */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1.8px solid var(--ink);
    padding-bottom: 6px;
    margin-bottom: 9mm;
  }
  .doc-header .h-left {
    font-family: 'Source Serif 4', serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: .3px;
  }
  .doc-header .h-right {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: var(--slate);
    letter-spacing: .5px;
  }
  .doc-footer {
    position: absolute;
    bottom: 9mm; left: 13mm; right: 14mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 8px;
    color: var(--slate-light);
    border-top: .75px solid var(--line);
    padding-top: 5px;
    letter-spacing: .4px;
    margin-left: 16mm;
  }

  /* ===================== COVER PAGE ===================== */
  .cover { background: var(--ink); color: #fff; }
  .cover::before {
    content: "";
    position: absolute; inset: 0;
    background:
      radial-gradient(circle at 85% 8%, rgba(201,162,39,0.18), transparent 44%),
      radial-gradient(circle at 6% 92%, rgba(201,162,39,0.12), transparent 40%);
  }
  .cover-frame {
    position: absolute;
    top: 12mm; left: 12mm; right: 12mm; bottom: 12mm;
    border: 1.2px solid rgba(201,162,39,0.5);
    z-index: 1;
  }
  .cover-frame::before {
    content: "";
    position: absolute; inset: 7px;
    border: 1px solid rgba(201,162,39,0.25);
  }
  .cover-inner {
    position: relative;
    z-index: 2;
    height: 297mm;
    display: flex;
    flex-direction: column;
    padding: 28mm 22mm 22mm 22mm;
  }
  .cover-eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 3.5px;
    color: var(--gold);
    text-transform: uppercase;
    margin-bottom: 10mm;
  }
  .cover-seal {
    width: 82px; height: 82px;
    border-radius: 50%;
    border: 2px solid var(--gold);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 8mm;
    position: relative;
  }
  .cover-seal::before {
    content: "";
    position: absolute; inset: 8px;
    border: 1px solid rgba(201,162,39,0.5);
    border-radius: 50%;
  }
  .cover-seal-mark {
    font-family: 'Source Serif 4', serif;
    font-weight: 700;
    font-size: 26px;
    color: var(--gold);
    letter-spacing: 1px;
  }
  .cover-title {
    font-family: 'Source Serif 4', serif;
    font-weight: 700;
    font-size: 52px;
    line-height: 1.08;
    max-width: 140mm;
    margin-bottom: 8mm;
    color: #fff;
  }
  .cover-title em {
    font-style: normal;
    color: var(--gold);
    font-weight: 600;
  }
  .cover-sub {
    font-size: 14px;
    color: #C9D2DE;
    max-width: 125mm;
    line-height: 1.7;
    font-weight: 400;
    margin-bottom: 0;
  }
  .cover-meta {
    margin-top: auto;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    border-top: 1px solid rgba(255,255,255,0.2);
    padding-top: 8mm;
    gap: 0;
  }
  .cover-meta div { padding-right: 8mm; }
  .cover-meta .m-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 4px;
  }
  .cover-meta .m-value {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  .cover-stamp {
    position: absolute;
    bottom: 32mm; right: 24mm;
    text-align: right;
    z-index: 3;
  }
  .cover-stamp .s-amount {
    font-family: 'Source Serif 4', serif;
    font-weight: 700;
    font-size: 36px;
    color: var(--gold);
  }
  .cover-stamp .s-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: #C9D2DE;
    margin-top: 3px;
  }

  /* ===================== TYPOGRAPHY ===================== */
  h1.section-title {
    font-family: 'Source Serif 4', serif;
    font-weight: 700;
    font-size: 26px;
    color: var(--ink);
    margin-bottom: 3mm;
    line-height: 1.15;
  }
  .section-rule {
    width: 44px; height: 4px;
    background: var(--gold);
    margin-bottom: 6mm;
    border-radius: 2px;
  }
  .section-intro {
    font-size: 12px;
    color: var(--slate);
    line-height: 1.75;
    max-width: 155mm;
    margin-bottom: 8mm;
  }

  /* ===================== SUMMARY CARDS ===================== */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 5mm;
    margin-bottom: 8mm;
  }
  .stat-card {
    background: var(--paper-card);
    border: 1px solid var(--line);
    border-top: 4px solid var(--gold);
    padding: 6mm 5mm 5mm 5mm;
  }
  .stat-card .s-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 8px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--slate);
    margin-bottom: 4mm;
    line-height: 1.4;
  }
  .stat-card .s-value {
    font-family: 'Source Serif 4', serif;
    font-weight: 700;
    font-size: 26px;
    color: var(--ink);
    line-height: 1;
  }
  .stat-card .s-foot {
    font-size: 9px;
    color: var(--slate-light);
    margin-top: 3mm;
    padding-top: 3mm;
    border-top: .75px dashed var(--line);
    line-height: 1.4;
  }
  .stat-card.income { border-top-color: var(--green); }
  .stat-card.income .s-value { color: var(--green); }
  .stat-card.expense { border-top-color: var(--red); }
  .stat-card.expense .s-value { color: var(--red); }

  /* ===================== BALANCE BAR ===================== */
  .balance-bar {
    background: var(--ink);
    color: #fff;
    padding: 7mm 8mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8mm;
    position: relative;
    overflow: hidden;
  }
  .balance-bar::after {
    content: "";
    position: absolute; right: 0; top: 0; bottom: 0; width: 4px;
    background: var(--gold);
  }
  .balance-bar .b-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 3px;
  }
  .balance-bar .b-desc {
    font-size: 11px;
    color: #C9D2DE;
    max-width: 110mm;
    line-height: 1.5;
  }
  .balance-bar .b-amount {
    font-family: 'Source Serif 4', serif;
    font-weight: 700;
    font-size: 32px;
    white-space: nowrap;
    padding-right: 6mm;
  }

  /* ===================== CHART ===================== */
  .chart-section-title {
    font-family: 'Source Serif 4', serif;
    font-weight: 700;
    font-size: 18px;
    color: var(--ink);
    margin-bottom: 2mm;
  }
  .chart-section-rule {
    width: 32px; height: 3px;
    background: var(--gold);
    margin-bottom: 6mm;
    border-radius: 2px;
  }
  .chart-outer {
    background: var(--paper-card);
    border: 1px solid var(--line);
    padding: 6mm 7mm 5mm 7mm;
    margin-bottom: 7mm;
  }
  .chart-wrap {
    display: flex;
    align-items: flex-end;
    gap: 5mm;
    height: 56mm;
    padding-bottom: 0;
    border-bottom: 2px solid var(--ink);
    margin-bottom: 3mm;
  }
  .chart-bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: flex-end;
  }
  .chart-amount {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    color: var(--ink);
    margin-bottom: 2.5mm;
    font-weight: 600;
    text-align: center;
    line-height: 1.3;
  }
  .chart-bar {
    width: 70%;
    border-radius: 3px 3px 0 0;
    min-height: 4mm;
  }
  .chart-bar.exp { background: linear-gradient(180deg, #C1572F 0%, var(--red) 100%); }
  .chart-bar.inc { background: linear-gradient(180deg, #2A7A4F 0%, var(--green) 100%); }
  .chart-bar.neutral { background: linear-gradient(180deg, #2A4D74 0%, var(--ink) 100%); }
  .chart-labels {
    display: flex;
    gap: 5mm;
  }
  .chart-label-col {
    flex: 1;
    text-align: center;
    font-size: 9px;
    color: var(--slate);
    letter-spacing: .3px;
    line-height: 1.3;
    font-family: 'IBM Plex Mono', monospace;
  }
  .chart-legend {
    display: flex;
    gap: 8mm;
    margin-top: 4mm;
    justify-content: flex-end;
  }
  .chart-legend-item {
    display: flex;
    align-items: center;
    gap: 3px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    color: var(--slate);
  }
  .legend-dot {
    width: 10px; height: 10px;
    border-radius: 2px;
    display: inline-block;
  }

  /* ===================== TABLES ===================== */
  table.ledger {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8mm;
    font-size: 11px;
  }
  table.ledger thead th {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #fff;
    background: var(--ink);
    text-align: left;
    padding: 4mm 4mm;
    font-weight: 500;
  }
  table.ledger thead th.num { text-align: right; }
  table.ledger tbody td {
    font-size: 11px;
    padding: 3.8mm 4mm;
    border-bottom: .75px solid var(--line);
    vertical-align: top;
    line-height: 1.45;
  }
  table.ledger tbody tr:nth-child(even) { background: #F6F2E8; }
  table.ledger tbody tr:hover { background: #F0EBD8; }
  table.ledger tbody td.num {
    text-align: right;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    white-space: nowrap;
    font-weight: 600;
  }
  table.ledger tbody td .item-name {
    font-weight: 600;
    color: var(--ink);
    font-size: 11.5px;
  }
  table.ledger tbody td .item-sub {
    font-size: 9.5px;
    color: var(--slate-light);
    margin-top: 2px;
  }
  .pill {
    display: inline-block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 8px;
    letter-spacing: .5px;
    padding: 2px 8px;
    border-radius: 10px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .pill.paid { background: var(--green-bg); color: var(--green); }
  .pill.income { background: var(--gold-bg); color: var(--gold-deep); }
  .pill.expense { background: var(--red-bg); color: var(--red); }

  table.ledger tfoot td {
    font-family: 'Source Serif 4', serif;
    font-weight: 700;
    font-size: 13px;
    padding: 4.5mm 4mm;
    border-top: 2px solid var(--ink);
    background: var(--paper);
  }
  table.ledger tfoot td.num {
    text-align: right;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    color: var(--ink);
  }

  /* ===================== NOTE BOX ===================== */
  .note-box {
    background: var(--gold-bg);
    border-left: 4px solid var(--gold);
    padding: 5mm 6mm;
    font-size: 11px;
    color: #5C4A12;
    line-height: 1.65;
    margin-bottom: 7mm;
  }
  .note-box b { color: var(--gold-deep); }

  /* ===================== RECONCILIATION TABLE ===================== */
  table.recon {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 7mm;
    font-size: 12px;
  }
  table.recon thead th {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    background: var(--ink);
    color: #fff;
    padding: 4mm;
    text-align: left;
  }
  table.recon thead th.num { text-align: right; }
  table.recon tbody td {
    padding: 4mm;
    border-bottom: .75px solid var(--line);
    font-size: 12px;
  }
  table.recon tbody tr:nth-child(even) { background: #F6F2E8; }
  table.recon tbody td.num {
    text-align: right;
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 600;
    font-size: 12px;
  }
  table.recon tfoot td {
    font-family: 'Source Serif 4', serif;
    font-weight: 700;
    font-size: 14px;
    padding: 4.5mm 4mm;
    border-top: 2px solid var(--ink);
    background: var(--paper);
  }
  table.recon tfoot td.num {
    text-align: right;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 15px;
  }

  /* ===================== CERTIFICATION ===================== */
  .cert-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14mm;
    margin-top: 12mm;
  }
  .cert-block .c-line {
    border-bottom: 1.2px solid var(--ink);
    height: 16mm;
  }
  .cert-block .c-role {
    font-family: 'Source Serif 4', serif;
    font-weight: 600;
    font-size: 13px;
    margin-top: 3mm;
    color: var(--ink);
  }
  .cert-block .c-meta {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    color: var(--slate);
    margin-top: 2mm;
    line-height: 1.6;
  }
  .disclaimer {
    margin-top: 12mm;
    padding-top: 5mm;
    border-top: .75px solid var(--line);
    font-size: 9px;
    color: var(--slate-light);
    line-height: 1.7;
  }
</style>
</head>
<body>

<!-- ============================================================ -->
<!-- PAGE 1 — COVER                                                -->
<!-- ============================================================ -->
<div class="page cover">
  <div class="cover-frame"></div>
  <div class="cover-inner">
    <div class="cover-eyebrow">${profile?.society_name || 'SocietySync'} Residents' Welfare Association</div>

    <div class="cover-seal">
      <div class="cover-seal-mark">${initials}</div>
    </div>

    <div class="cover-title">Event Bills &amp;<br/>Transactions <em>Report</em></div>
    <div class="cover-sub">
      An itemized statement of contributions received and expenses incurred for the
      ${selectedEvent.name} celebration, prepared for review by the
      Society Management Committee and General Body.
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

    <div class="cover-stamp">
      <div class="s-amount">&#8377;${balance.toLocaleString('en-IN')}</div>
      <div class="s-label">CLOSING FUND BALANCE</div>
    </div>
  </div>
</div>

<!-- ============================================================ -->
<!-- PAGE 2 — FINANCIAL SUMMARY                                    -->
<!-- ============================================================ -->
<div class="page">
  <div class="spine">
    <div class="spine-label">Section 01 — Financial Summary</div>
  </div>
  <div class="content">

    <div class="doc-header">
      <div class="h-left">Event Bills &amp; Transactions Report</div>
      <div class="h-right">${selectedEvent.name.toUpperCase()} &nbsp;|&nbsp; PAGE 02</div>
    </div>

    <h1 class="section-title">Financial Summary</h1>
    <div class="section-rule"></div>
    <p class="section-intro">
      This statement consolidates all Chandaa (contributions) received from residents and sponsors,
      against verified expense bills recorded by the Festival Committee. All figures are in Indian
      Rupees (₹) and are reconciled against bank deposit slips and physical receipt bills on file.
    </p>

    <div class="summary-grid">
      <div class="stat-card income">
        <div class="s-label">Total Contributions Received</div>
        <div class="s-value">&#8377;${totalIncome.toLocaleString('en-IN')}</div>
        <div class="s-foot">${incomeCount} contributions · Reconciled</div>
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

    <div class="balance-bar">
      <div>
        <div class="b-label">Net Position</div>
        <div class="b-desc">${balance >= 0 ? 'Contributions exceeded expenses for this event.' : 'Expenses exceeded contributions for this event.'}</div>
      </div>
      <div class="b-amount">${balance >= 0 ? '+' : '-'} &#8377;${Math.abs(balance).toLocaleString('en-IN')}</div>
    </div>

    <!-- Chart Section -->
    <div class="chart-section-title">Expense Distribution by Category</div>
    <div class="chart-section-rule"></div>

    <div class="chart-outer">
      <div class="chart-wrap">
        ${chartColumns}
      </div>
      <div class="chart-labels">
        ${chartLabels}
      </div>
      <div class="chart-legend">
        <div class="chart-legend-item"><span class="legend-dot" style="background:var(--red);"></span> Expense Spend</div>
        <div class="chart-legend-item"><span class="legend-dot" style="background:var(--ink);"></span> No Spend</div>
      </div>
    </div>

    <div class="note-box">
      <b>Note:</b> This is an official system-generated financial ledger report compiled directly
      from the verified database of ${profile?.society_name || 'SocietySync'} Co-Op Housing. All figures are subject to audit.
    </div>

  </div>
  <div class="doc-footer">
    <span>${profile?.society_name || 'SocietySync'} Residents' Welfare Association · Prepared via SocietySync Festival Ledger</span>
    <span>CONFIDENTIAL — FOR COMMITTEE &amp; RESIDENT CIRCULATION</span>
  </div>
</div>

<!-- ============================================================ -->
<!-- PAGE 3 — INCOME LEDGER                                        -->
<!-- ============================================================ -->
<div class="page">
  <div class="spine">
    <div class="spine-label">Section 02 — Contributions Ledger</div>
  </div>
  <div class="content">

    <div class="doc-header">
      <div class="h-left">Event Bills &amp; Transactions Report</div>
      <div class="h-right">${selectedEvent.name.toUpperCase()} &nbsp;|&nbsp; PAGE 03</div>
    </div>

    <h1 class="section-title">Contributions Received (Chandaa)</h1>
    <div class="section-rule"></div>
    <p class="section-intro">
      Itemized record of all contributions collected from residents and external sponsors,
      in order of receipt. Each entry is cross-referenced against the official receipt book number.
    </p>

    <table class="ledger">
      <thead>
        <tr>
          <th style="width:13%;">Date</th>
          <th style="width:14%;">Receipt No.</th>
          <th>Contributor</th>
          <th style="width:14%;">Mode</th>
          <th style="width:11%;">Status</th>
          <th class="num" style="width:16%;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${incomeRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5">Total Contributions Received</td>
          <td class="num">&#8377;${totalIncome.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    <div class="note-box">
      <b>Verification:</b> All collections are recorded and validated by the Treasurer. Bank transfer
      and UPI entries are reconciled against the society bank statement. Original receipts are on file.
    </div>

  </div>
  <div class="doc-footer">
    <span>${profile?.society_name || 'SocietySync'} Residents' Welfare Association · Prepared via SocietySync Festival Ledger</span>
    <span>CONFIDENTIAL — FOR COMMITTEE &amp; RESIDENT CIRCULATION</span>
  </div>
</div>

<!-- ============================================================ -->
<!-- PAGE 4 — EXPENSE LEDGER                                       -->
<!-- ============================================================ -->
<div class="page">
  <div class="spine">
    <div class="spine-label">Section 03 — Expense Bills Ledger</div>
  </div>
  <div class="content">

    <div class="doc-header">
      <div class="h-left">Event Bills &amp; Transactions Report</div>
      <div class="h-right">${selectedEvent.name.toUpperCase()} &nbsp;|&nbsp; PAGE 04</div>
    </div>

    <h1 class="section-title">Expense Bills &amp; Vendor Payments</h1>
    <div class="section-rule"></div>
    <p class="section-intro">
      Every expense below is supported by a physical or digital receipt bill, uploaded against the
      corresponding transaction in the Festival Ledger module and available for committee audit on request.
    </p>

    <table class="ledger">
      <thead>
        <tr>
          <th style="width:13%;">Date</th>
          <th style="width:13%;">Bill No.</th>
          <th>Vendor / Description</th>
          <th style="width:18%;">Category</th>
          <th style="width:11%;">Receipt</th>
          <th class="num" style="width:15%;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${expenseRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5">Total Expenses Incurred</td>
          <td class="num">&#8377;${totalExpense.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    <div class="note-box">
      <b>Full bill register:</b> Scanned receipts and supporting documents for all expense bills
      are stored securely in Supabase Storage and can be audited via the SocietySync app at any time.
    </div>

    <!-- Mini comparison chart -->
    <div class="chart-section-title" style="font-size:16px; margin-top:4mm;">Income vs Expense Comparison</div>
    <div class="chart-section-rule"></div>

    <div class="chart-outer">
      <div class="chart-wrap" style="height: 48mm;">
        <div class="chart-bar-col">
          <div class="chart-amount">&#8377;${totalIncome.toLocaleString('en-IN')}<br/><span style="color:var(--green); font-size:8px;">INCOME</span></div>
          <div class="chart-bar inc" style="height: ${incPercent}%;"></div>
        </div>
        <div class="chart-bar-col">
          <div class="chart-amount">&#8377;${totalExpense.toLocaleString('en-IN')}<br/><span style="color:var(--red); font-size:8px;">EXPENSE</span></div>
          <div class="chart-bar exp" style="height: ${expPercent}%;"></div>
        </div>
        <div class="chart-bar-col">
          <div class="chart-amount">&#8377;${balance.toLocaleString('en-IN')}<br/><span style="color:var(--ink); font-size:8px;">BALANCE</span></div>
          <div class="chart-bar neutral" style="height: ${balPercent}%;"></div>
        </div>
      </div>
      <div class="chart-labels">
        <div class="chart-label-col">Total Income</div>
        <div class="chart-label-col">Total Expense</div>
        <div class="chart-label-col">Closing Balance</div>
      </div>
      <div class="chart-legend">
        <div class="chart-legend-item"><span class="legend-dot" style="background:var(--green);"></span> Income</div>
        <div class="chart-legend-item"><span class="legend-dot" style="background:var(--red);"></span> Expense</div>
        <div class="chart-legend-item"><span class="legend-dot" style="background:var(--ink);"></span> Balance</div>
      </div>
    </div>

  </div>
  <div class="doc-footer">
    <span>${profile?.society_name || 'SocietySync'} Residents' Welfare Association · Prepared via SocietySync Festival Ledger</span>
    <span>CONFIDENTIAL — FOR COMMITTEE &amp; RESIDENT CIRCULATION</span>
  </div>
</div>

<!-- ============================================================ -->
<!-- PAGE 5 — CERTIFICATION                                        -->
<!-- ============================================================ -->
<div class="page">
  <div class="spine">
    <div class="spine-label">Section 04 — Certification</div>
  </div>
  <div class="content">

    <div class="doc-header">
      <div class="h-left">Event Bills &amp; Transactions Report</div>
      <div class="h-right">${selectedEvent.name.toUpperCase()} &nbsp;|&nbsp; PAGE 05</div>
    </div>

    <h1 class="section-title">Reconciliation &amp; Certification</h1>
    <div class="section-rule"></div>
    <p class="section-intro">
      The figures presented in this report have been reviewed against bank statements, cash registers,
      and physical bills on file. The undersigned certify that this statement presents a true and fair
      summary of all funds received and expended for this event.
    </p>

    <table class="recon">
      <thead>
        <tr>
          <th>Particulars</th>
          <th class="num">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Opening Balance (carried from previous event)</td>
          <td class="num">&#8377;0.00</td>
        </tr>
        <tr>
          <td>Add: Total Contributions Received (${incomeCount} entries)</td>
          <td class="num" style="color:var(--green);">+ &#8377;${totalIncome.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>Less: Total Expenses Incurred (${expenseCount} entries)</td>
          <td class="num" style="color:var(--red);">&#8377;(${totalExpense.toLocaleString('en-IN')})</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td>Closing Balance — Transferred to Society General Fund</td>
          <td class="num">&#8377;${balance.toLocaleString('en-IN')}</td>
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
    <span>${profile?.society_name || 'SocietySync'} Residents' Welfare Association · Prepared via SocietySync Festival Ledger</span>
    <span>CONFIDENTIAL — FOR COMMITTEE &amp; RESIDENT CIRCULATION</span>
  </div>
</div>

</body>
</html>
  `;
}
