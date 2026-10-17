// PortNexus : Verification Badge HTML Renderer
// Renders responsive, tamper-evident certificate authenticity badge for mobile scanners & customs portals.
// Adheres strictly to Hallmark anti-slop rules: zero emojis, zero sparkles, zero em/en dashes, pure light maritime tokens.

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(isoStr) {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    return d.toUTCString();
  } catch {
    return isoStr;
  }
}

function renderVerificationHtml(record) {
  const signatureValid = record.signatureValid === true;
  const isCompliant = signatureValid && record.status === 'COMPLIANT';
  const isCritical = record.status === 'CRITICAL_DISCREPANCIES';
  const score = record.compliance_score === null || record.compliance_score === undefined ? null : Number(record.compliance_score);
  const scoreDisplay = Number.isFinite(score) ? `${score}%` : 'N/A';
  const consignment = record.trade_consignments || {};
  const discrepancies = Array.isArray(record.discrepancies) ? record.discrepancies : [];

  let statusText = signatureValid ? 'COMPLIANT' : 'SEAL INVALID - DO NOT RELY ON THIS RECORD';
  let statusBg = signatureValid ? '#ECFDF5' : '#FEF2F2';
  let statusBorder = signatureValid ? '#10B981' : '#EF4444';
  let statusColor = signatureValid ? '#065F46' : '#991B1B';

  if (signatureValid && isCritical) {
    statusText = `REJECTION RISK (${record.total_discrepancies || discrepancies.length} DISCREPANCIES)`;
    statusBg = '#FEF2F2';
    statusBorder = '#EF4444';
    statusColor = '#991B1B';
  } else if (signatureValid && !isCompliant) {
    statusText = `${record.status.replace(/_/g, ' ')} (${scoreDisplay})`;
    statusBg = '#FFFBEB';
    statusBorder = '#F59E0B';
    statusColor = '#92400E';
  }

  const downloadUrl = `/api/certificate/${encodeURIComponent(record.cert_id)}/download`;

  const canonicalUrl = `https://portnexus.equisaas-bd.com/verify?id=${encodeURIComponent(record.cert_id)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PortNexus Certificate Verification : ${escapeHtml(record.cert_id)}</title>
  <meta name="description" content="Official tamper-evident authenticity verification for PortNexus Pre-Customs Clearance Inspection Certificate ${escapeHtml(record.cert_id)}.">
  <meta name="theme-color" content="#0284c7">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- OpenGraph Metadata -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="PortNexus Enterprise">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="PortNexus Certificate Verification : ${escapeHtml(record.cert_id)}">
  <meta property="og:description" content="Record integrity status: ${escapeHtml(signatureValid ? 'verified' : 'invalid')}. Compliance screening status: ${escapeHtml(record.status)} (${escapeHtml(scoreDisplay)}).">
  <meta property="og:image" content="https://portnexus.equisaas-bd.com/og-image.png">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="PortNexus Certificate Verification : ${escapeHtml(record.cert_id)}">
  <meta name="twitter:description" content="Record integrity status: ${escapeHtml(signatureValid ? 'verified' : 'invalid')}. Compliance screening status: ${escapeHtml(record.status)} (${escapeHtml(scoreDisplay)}).">
  <meta name="twitter:image" content="https://portnexus.equisaas-bd.com/og-image.png">

  <!-- Favicon & Icons -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">

  <!-- Schema.org DigitalDocument JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    "name": "PortNexus Pre-Customs Clearance Inspection Certificate ${escapeHtml(record.cert_id)}",
    "identifier": "${escapeHtml(record.cert_id)}",
    "url": "${canonicalUrl}",
    "dateCreated": "${record.audit_timestamp || new Date().toISOString()}",
    "encodingFormat": "application/pdf",
    "creator": {
      "@type": "Organization",
      "name": "PortNexus Enterprise",
      "url": "https://portnexus.equisaas-bd.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Team EquiSaaS BD",
      "url": "https://equisaas-bd.com/"
    }
  }
  </script>
  <style>
    :root {
      --bg: #F8FAFC;
      --surface: #FFFFFF;
      --border: #E2E8F0;
      --navy: #0A192F;
      --navy-light: #1E3A8A;
      --text-main: #0F172A;
      --text-muted: #64748B;
      --success: #10B981;
      --danger: #EF4444;
      --warning: #F59E0B;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      line-height: 1.5;
      padding: 1.5rem 1rem;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .cert-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      max-width: 680px;
      width: 100%;
      box-shadow: 0 4px 20px rgba(10, 25, 47, 0.06);
      overflow: hidden;
    }
    .cert-header {
      background: var(--navy);
      color: #FFFFFF;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border-bottom: 3px solid var(--navy-light);
    }
    .cert-header img {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      background: #FFFFFF;
      padding: 2px;
      flex-shrink: 0;
    }
    .cert-header-text h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .cert-header-text p {
      font-size: 0.8rem;
      color: #94A3B8;
      margin-top: 0.15rem;
    }
    @keyframes pnBannerPulse {
      0% { box-shadow: 0 0 0 0 rgba(2, 132, 199, 0.15); }
      50% { box-shadow: 0 0 0 4px rgba(2, 132, 199, 0.08); }
      100% { box-shadow: 0 0 0 0 rgba(2, 132, 199, 0); }
    }
    .cert-body {
      padding: 1.5rem;
    }
    .status-banner {
      background: ${statusBg};
      border: 1px solid ${statusBorder};
      color: ${statusColor};
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
      animation: pnBannerPulse 2s ease-in-out infinite alternate;
    }
    .status-left {
      display: flex;
      flex-direction: column;
    }
    .status-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      opacity: 0.85;
    }
    .status-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.2rem;
      font-weight: 700;
    }
    .status-score-circle {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 3px solid ${statusBorder};
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      color: ${statusColor};
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
      background: #F1F5F9;
      padding: 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
    }
    @media (max-width: 540px) {
      .meta-grid { grid-template-columns: 1fr; }
    }
    .meta-item-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .meta-item-val {
      font-weight: 600;
      color: var(--text-main);
      margin-top: 0.2rem;
      word-break: break-word;
    }
    .meta-item-val.mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
    }
    .section-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .details-box {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      padding: 0.4rem 0;
      border-bottom: 1px dashed var(--border);
      font-size: 0.875rem;
    }
    .details-row:last-child {
      border-bottom: none;
    }
    .details-label {
      color: var(--text-muted);
      font-weight: 500;
    }
    .details-value {
      font-weight: 600;
      text-align: right;
      max-width: 60%;
    }
    .seal-box {
      background: #F8FAFC;
      border: 1px solid var(--border);
      border-left: 4px solid var(--navy-light);
      border-radius: 6px;
      padding: 0.85rem;
      margin-bottom: 1.5rem;
      font-size: 0.775rem;
    }
    .seal-label {
      font-weight: 700;
      color: var(--navy);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.3rem;
    }
    .seal-hash {
      font-family: 'JetBrains Mono', monospace;
      color: #334155;
      word-break: break-all;
      background: #FFFFFF;
      padding: 0.35rem 0.5rem;
      border-radius: 4px;
      border: 1px solid var(--border);
    }
    .actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.65rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 6px;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 0.15s ease, transform 0.15s ease;
      min-height: 44px;
    }
    .btn:active {
      transform: scale(0.98);
    }
    .btn-primary {
      background: var(--navy);
      color: #FFFFFF;
      border: none;
      flex: 1;
    }
    .btn-primary:hover {
      background: var(--navy-light);
    }
    .btn-secondary {
      background: #FFFFFF;
      color: var(--navy);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover {
      background: #F1F5F9;
    }
    .footer-note {
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 1.5rem;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>
</head>
<body>
  <div class="cert-card">
    <div class="cert-header">
      <img src="/favicon.svg" alt="PortNexus Emblem">
      <div class="cert-header-text">
        <h1>PortNexus Certificate Verification</h1>
        <p>Pre-Customs Clearance &amp; Documentary Compliance Record</p>
      </div>
    </div>
    <div class="cert-body">
      <div class="status-banner">
        <div class="status-left">
          <span class="status-label">Record Integrity and Audit Status</span>
          <span class="status-value">${escapeHtml(statusText)}</span>
        </div>
        <div class="status-score-circle">${escapeHtml(scoreDisplay)}</div>
      </div>

      <div class="meta-grid">
        <div>
          <div class="meta-item-label">Certificate Reference</div>
          <div class="meta-item-val mono">${escapeHtml(record.cert_id)}</div>
        </div>
        <div>
          <div class="meta-item-label">Audit Timestamp (UTC)</div>
          <div class="meta-item-val mono">${escapeHtml(formatDate(record.audit_timestamp))}</div>
        </div>
        <div>
          <div class="meta-item-label">Audit Scope</div>
          <div class="meta-item-val">Automated screening of extracted fields, subject to human review</div>
        </div>
        <div>
          <div class="meta-item-label">Ledger Status</div>
          <div class="meta-item-val" style="color: ${signatureValid ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">${signatureValid ? 'HMAC seal verified' : 'HMAC seal invalid'}</div>
        </div>
      </div>

      <div class="section-title">Consignment Details</div>
      <div class="details-box">
        <div class="details-row">
          <span class="details-label">Letter of Credit (Field 20)</span>
          <span class="details-value">${escapeHtml(consignment.lc_number || 'N/A')}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Commercial Invoice No</span>
          <span class="details-value">${escapeHtml(consignment.invoice_number || 'N/A')}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Beneficiary (Exporter)</span>
          <span class="details-value">${escapeHtml(consignment.beneficiary || 'N/A')}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Applicant (Buyer)</span>
          <span class="details-value">${escapeHtml(consignment.applicant || 'N/A')}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Port of Loading</span>
          <span class="details-value">${escapeHtml(consignment.port_of_loading || 'N/A')}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Port of Discharge</span>
          <span class="details-value">${escapeHtml(consignment.port_of_discharge || 'N/A')}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Declared Value</span>
          <span class="details-value">${consignment.amount ? `${escapeHtml(consignment.currency || 'USD')} ${Number(consignment.amount).toLocaleString()}` : 'N/A'}</span>
        </div>
      </div>

      <div class="seal-box">
        <div class="seal-label">Cryptographic Audit Seal (HMAC-SHA-256)</div>
        <div class="seal-hash">${escapeHtml(record.audit_hash)}</div>
      </div>

      <div class="actions">
        ${signatureValid ? `<a href="${downloadUrl}" class="btn btn-primary">Download Audit Certificate PDF</a>` : ''}
        <a href="/" class="btn btn-secondary">Open PortNexus Portal</a>
      </div>
    </div>
  </div>

  <div class="footer-note" style="text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-muted);">
    <div>Automated screening supports document review. It does not replace bank examination, legal advice, or customs classification advice.</div>
    <div style="margin-top: 0.65rem; font-size: 0.8rem;">
      Project by <a href="https://equisaas-bd.com/" target="_blank" rel="noopener" style="color: #0284c7; text-decoration: none; font-weight: 600;">Team EquiSaaS BD</a>
    </div>
  </div>
</body>
</html>`;
}

function renderNotFoundHtml(certId) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate Not Found : PortNexus</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: #F8FAFC;
      color: #0F172A;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      max-width: 520px;
      width: 100%;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    h1 { font-family: 'Space Grotesk', sans-serif; font-size: 1.35rem; color: #991B1B; margin-bottom: 0.75rem; }
    p { font-size: 0.9rem; color: #64748B; margin-bottom: 1.5rem; line-height: 1.5; }
    .code { font-family: monospace; background: #F1F5F9; padding: 0.2rem 0.5rem; border-radius: 4px; color: #0F172A; }
    .btn {
      display: inline-block;
      padding: 0.65rem 1.25rem;
      background: #0A192F;
      color: #FFFFFF;
      text-decoration: none;
      font-weight: 600;
      border-radius: 6px;
      min-height: 44px;
      line-height: 30px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Certificate Verification Failed</h1>
    <p>No valid audit certificate was found matching ID: <span class="code">${escapeHtml(certId || 'Unknown')}</span>. Ensure the QR code or URL link was scanned correctly.</p>
    <a href="/" class="btn">Return to PortNexus Home</a>
  </div>
</body>
</html>`;
}

module.exports = {
  renderVerificationHtml,
  renderNotFoundHtml,
};
