// PortNexus :: Compliance Certificate Generator
// Pillar 3: Audit certificate with an HMAC-SHA-256 seal + QR verification
// Uses: pdfkit + qrcode + Node.js crypto (all free, no cloud required)

const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────
//  Canonical, keyed audit seal
// ─────────────────────────────────────────────────────────────
const SIGNED_REPORT_FIELDS = [
  'rulesetVersion', 'reviewRequired', 'complianceScore', 'status', 'totalChecks',
  'evaluatedChecks', 'totalDiscrepancies', 'discrepancies', 'reviewItems',
  'passedChecks', 'checkResults', 'auditTimestamp',
];

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  return value;
}

function buildCertificatePayload(auditReport, consignmentData, certId) {
  const report = Object.fromEntries(SIGNED_REPORT_FIELDS
    .filter(key => Object.prototype.hasOwnProperty.call(auditReport || {}, key))
    .map(key => [key, auditReport[key]]));
  return canonicalize({ schemaVersion: 1, certId, auditReport: report, documents: consignmentData || {} });
}

function getSigningSecret(secret) {
  const value = secret || process.env.CERTIFICATE_SIGNING_SECRET;
  if (!value || Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error('CERTIFICATE_SIGNING_SECRET must contain at least 32 bytes.');
  }
  return value;
}

function generateAuditHash(auditReport, consignmentData, options = {}) {
  const certId = options.certId || 'UNASSIGNED';
  const payload = JSON.stringify(buildCertificatePayload(auditReport, consignmentData, certId));
  return crypto.createHmac('sha256', getSigningSecret(options.secret)).update(payload).digest('hex');
}

function verifyAuditHash(storedHash, auditReport, consignmentData, options = {}) {
  if (typeof storedHash !== 'string' || !/^[a-f0-9]{64}$/i.test(storedHash)) return false;
  try {
    const expected = Buffer.from(generateAuditHash(auditReport, consignmentData, options), 'hex');
    const actual = Buffer.from(storedHash, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
//  QR Code: returns PNG buffer
// ─────────────────────────────────────────────────────────────
async function generateQRCode(verificationUrl) {
  const QRCode = require('qrcode');
  return await QRCode.toBuffer(verificationUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 120,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

// ─────────────────────────────────────────────────────────────
//  MAIN: Generate PDF Certificate
// ─────────────────────────────────────────────────────────────
async function generateComplianceCertificate(auditReport, consignmentData, options = {}) {
  const PDFDocument = require('pdfkit');

  const certId = options.certId || `PN-CERT-${new Date().getFullYear()}-${crypto.randomBytes(16).toString('hex')}`;
  const auditHash = generateAuditHash(auditReport, consignmentData, { certId, secret: options.secret });
  if (options.auditHash && !verifyAuditHash(options.auditHash, auditReport, consignmentData, { certId, secret: options.secret })) {
    throw new Error('Stored certificate seal does not match the audit snapshot.');
  }
  const publicBaseUrl = (process.env.PUBLIC_BASE_URL || 'https://portnexus.equisaas-bd.com').replace(/\/$/, '');
  const verifyUrl = options.verifyUrl || `${publicBaseUrl}/verify?id=${encodeURIComponent(certId)}&hash=${auditHash}`;
  const isCompliant = auditReport.status === 'COMPLIANT';
  const scoreColor = isCompliant ? '#059669' : (auditReport.complianceScore >= 70 ? '#b45309' : '#dc2626');

  // Navy, sky, white palette (Light Maritime)
  const NAVY    = '#0f172a';
  const SKY     = '#0284c7';
  const SLATE   = '#334155';
  const LIGHT   = '#f8fafc';
  const SUCCESS = '#059669';
  const DANGER  = '#dc2626';
  const WARNING = '#b45309';
  const BORDER  = '#e2e8f0';

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 55, right: 55 },
    info: {
      Title: `PortNexus Pre-Customs Compliance Certificate - ${certId}`,
      Author: 'PortNexus Trade Compliance Engine',
      Subject: 'ICC UCP 600 Trade Document Compliance Audit',
      Keywords: 'UCP600, trade compliance, letter of credit, customs, export',
      Creator: 'PortNexus v1.0',
    },
  });

  const buffers = [];
  doc.on('data', chunk => buffers.push(chunk));

  const qrBuffer = await generateQRCode(verifyUrl);

  // ─── HEADER BAND ───
  doc.rect(0, 0, doc.page.width, 110).fill(NAVY);

  // Wordmark
  doc.fillColor('#ffffff')
     .font('Helvetica-Bold')
     .fontSize(22)
     .text('PortNexus', 55, 28, { continued: true })
     .font('Helvetica')
     .fillColor(SKY)
     .fontSize(22)
     .text(' Enterprise', { continued: false });

  doc.fillColor('#94a3b8')
     .font('Helvetica')
     .fontSize(9)
     .text('Autonomous Cross-Border Trade Compliance Engine', 55, 54);

  // Certificate label box
  doc.roundedRect(doc.page.width - 200, 22, 148, 34, 4)
     .strokeColor(SKY)
     .lineWidth(1)
     .stroke();

  doc.fillColor('#ffffff')
     .font('Helvetica-Bold')
     .fontSize(7)
     .text('PRE-CUSTOMS COMPLIANCE CERTIFICATE', doc.page.width - 197, 28, { width: 142, align: 'center' });

  doc.fillColor(SKY)
     .fontSize(9)
     .text(certId, doc.page.width - 197, 40, { width: 142, align: 'center' });

  // ─── COMPLIANCE SCORE BANNER ───
  const bannerY = 120;
  doc.rect(55, bannerY, doc.page.width - 110, 54).fill(isCompliant ? '#ecfdf5' : '#fff7ed').stroke();
  doc.rect(55, bannerY, 8, 54).fill(scoreColor);

  doc.fillColor(scoreColor)
     .font('Helvetica-Bold')
     .fontSize(32)
     .text(`${auditReport.complianceScore ?? 'N/A'}${auditReport.complianceScore === null || auditReport.complianceScore === undefined ? '' : '%'}`, 75, bannerY + 10, { continued: true });

  doc.fillColor(NAVY)
     .font('Helvetica-Bold')
     .fontSize(11)
     .text(`  ${isCompliant ? 'FULLY COMPLIANT' : auditReport.status.replace(/_/g, ' ')}`, { continued: false, baseline: 'middle' });

  doc.fillColor(SLATE)
     .font('Helvetica')
     .fontSize(8.5)
     .text(
       `ICC UCP 600 Audit Completed: ${new Date(auditReport.auditTimestamp).toUTCString()}  |  ` +
       `Discrepancies Found: ${auditReport.totalDiscrepancies}  |  ` +
       `Checks Passed: ${auditReport.passedChecks?.length || 0}`,
       75, bannerY + 36, { width: doc.page.width - 170 }
     );

  // ─── QR CODE ───
  doc.image(qrBuffer, doc.page.width - 145, bannerY + 2, { width: 72, height: 72 });

  // ─── CONSIGNMENT DETAILS TABLE ───
  let y = 192;
  doc.fillColor(NAVY)
     .font('Helvetica-Bold')
     .fontSize(10)
     .text('Consignment Details', 55, y);
  y += 16;

  const lc = consignmentData.lc || {};
  const inv = consignmentData.invoice || {};
  const details = [
    ['L/C Reference Number', lc.lcNumber || '--'],
    ['Invoice Number', inv.invoiceNumber || '--'],
    ['Applicant (Buyer)', lc.applicant || inv.buyer || '--'],
    ['Beneficiary (Exporter)', lc.beneficiary || inv.seller || '--'],
    ['Goods Description', lc.goodsDescription || inv.goodsDescription || '--'],
    ['Credit Amount', lc.amount ? `${lc.currency || ''} ${Number(lc.amount).toLocaleString()}` : '--'],
    ['Port of Loading', lc.portOfLoading || '--'],
    ['Port of Discharge', lc.portOfDischarge || '--'],
    ['L/C Expiry Date', lc.expiryDate || '--'],
    ['Latest Shipment Date', lc.latestShipmentDate || '--'],
  ];

  details.forEach(([label, value], i) => {
    const rowBg = i % 2 === 0 ? LIGHT : '#ffffff';
    doc.rect(55, y, doc.page.width - 110, 18).fill(rowBg);
    doc.fillColor(SLATE).font('Helvetica-Bold').fontSize(8).text(label, 62, y + 5, { width: 160 });
    doc.fillColor(NAVY).font('Helvetica').fontSize(8).text(String(value), 225, y + 5, { width: doc.page.width - 290 });
    y += 18;
  });
  y += 10;

  // ─── AUDIT CHECKLIST ───
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text('ICC UCP 600 Audit Results', 55, y);
  y += 16;

  // Passed checks
  if (auditReport.passedChecks?.length > 0) {
    auditReport.passedChecks.forEach(check => {
      if (y > 700) { doc.addPage(); y = 55; }
      doc.circle(64, y + 5, 4).fill(SUCCESS);
      doc.fillColor(SLATE).font('Helvetica').fontSize(8)
         .text(check.rule, 75, y + 1, { continued: true })
         .fillColor('#6b7280')
         .text(`  ${check.detail || ''}`, { continued: false });
      y += 16;
    });
  }

  // Discrepancies
  if (auditReport.discrepancies?.length > 0) {
    y += 6;
    doc.fillColor(DANGER).font('Helvetica-Bold').fontSize(9)
       .text('Critical Discrepancies Detected', 55, y);
    y += 14;

    auditReport.discrepancies.forEach(d => {
      if (y > 680) { doc.addPage(); y = 55; }
      const boxColor = d.severity === 'CRITICAL' ? '#fef2f2' : '#fffbeb';
      const borderCol = d.severity === 'CRITICAL' ? DANGER : WARNING;
      const boxHeight = 44;
      doc.rect(55, y, doc.page.width - 110, boxHeight).fill(boxColor);
      doc.rect(55, y, 4, boxHeight).fill(borderCol);

      doc.fillColor(borderCol).font('Helvetica-Bold').fontSize(8)
         .text(`[${d.severity}] ${d.title}`, 66, y + 5);
      doc.fillColor(NAVY).font('Helvetica').fontSize(7.5)
         .text(d.message, 66, y + 17, { width: doc.page.width - 135 });
      doc.fillColor(SLATE).font('Helvetica-Oblique').fontSize(7)
         .text(`Remediation: ${d.remediation}`, 66, y + 30, { width: doc.page.width - 135 });
      y += boxHeight + 6;
    });
  }

  // ─── DIGITAL SIGNATURE BLOCK ───
  if (y > 670) { doc.addPage(); y = 55; }
  y += 12;
  doc.moveTo(55, y).lineTo(doc.page.width - 55, y).strokeColor(BORDER).lineWidth(1).stroke();
  y += 12;

  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(8.5).text('Digital Audit Seal', 55, y);
  y += 14;
  doc.rect(55, y, doc.page.width - 110, 50).fill('#f1f5f9');
  doc.fillColor('#64748b').font('Courier').fontSize(7)
     .text(`HMAC-SHA-256: ${auditHash}`, 62, y + 8, { width: doc.page.width - 130 });
  doc.fillColor(SLATE).font('Helvetica').fontSize(7.5)
     .text(`This certificate is cryptographically sealed and verifiable at:`, 62, y + 22);
  doc.fillColor(SKY).font('Helvetica').fontSize(7.5)
     .text(verifyUrl, 62, y + 32);
  y += 58;

  doc.fillColor('#94a3b8').font('Helvetica').fontSize(7)
     .text(
       'This document is generated by the PortNexus autonomous trade compliance engine. It is not a legal guarantee of customs clearance. ' +
       'All audits are based on ICC UCP 600 international banking standards. Issuers bear sole responsibility for document accuracy.',
       55, y, { width: doc.page.width - 110, align: 'center' }
     );

  return new Promise((resolve, reject) => {
    doc.on('error', reject);
    doc.on('end', () => {
      resolve({
        buffer: Buffer.concat(buffers),
        certId,
        auditHash,
        verifyUrl,
      });
    });
    doc.end();
  });
}

module.exports = { generateComplianceCertificate, generateAuditHash, verifyAuditHash, buildCertificatePayload };
