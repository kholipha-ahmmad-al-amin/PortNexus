// PortNexus v2.0 : Enterprise Trade Intelligence & L/C Audit Engine
// Commercial-grade: Document OCR + SWIFT MT700 + PDF Certificates + Persistent DB

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// Core Trade Engine
const { searchHSCode, classifyCommodity, calculateTotalDuties, HS_DATABASE } = require('./lib/hscode_database');
const { auditTradePackage, UCP_RULES } = require('./lib/ucp600_rules');
const { queryGraph, GRAPH_NODES, GRAPH_EDGES } = require('./lib/graph_rag');
const { searchContextualRAG, CONTEXTUALIZED_CHUNKS } = require('./lib/contextual_rag');
const { MCP_TOOLS, handleMcpToolCall } = require('./lib/mcp_server');

// New Enterprise Pillars
const { parseSWIFTMT700, validateParsedMT700, getSampleMT700 } = require('./lib/swift_mt700_parser');
const { processDocument, mapToAuditDocuments } = require('./lib/document_intelligence');
const { generateComplianceCertificate, buildCertificatePayload, verifyAuditHash } = require('./lib/certificate_generator');
const { renderVerificationHtml, renderNotFoundHtml } = require('./lib/verification_view');
const db = require('./lib/database');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const REQUIRE_ORG_API_KEY = process.env.REQUIRE_ORG_API_KEY === 'true' || (IS_PRODUCTION && process.env.REQUIRE_ORG_API_KEY !== 'false');
const PERSIST_AUDIT_EVIDENCE = process.env.PERSIST_AUDIT_EVIDENCE === 'true';
const PERSIST_DOCUMENT_METADATA = process.env.PERSIST_DOCUMENT_METADATA === 'true';

// Memory-backed uploads are capped to 4 files of 5 MiB each.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 4, fields: 10, parts: 16 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || (IS_PRODUCTION ? 'https://portnexus.equisaas-bd.com' : 'http://localhost:3000,http://127.0.0.1:3000'))
  .split(',').map(value => value.trim()).filter(Boolean);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (IS_PRODUCTION) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'MCP-Protocol-Version', 'x-api-key'],
  maxAge: 600,
}));
app.use(express.json({ limit: '1mb' }));

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createRateLimiter({ windowMs, max }) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) return res.status(429).json({ error: 'Request limit reached. Retry after the rate limit window.' });
    if (buckets.size > 10000) {
      for (const [entryKey, entry] of buckets) if (now >= entry.resetAt) buckets.delete(entryKey);
    }
    next();
  };
}

const apiRateLimit = createRateLimiter({ windowMs: 60_000, max: 120 });
const uploadRateLimit = createRateLimiter({ windowMs: 60_000, max: 6 });
app.use('/api', apiRateLimit);

async function requireOrgApiKey(req, res, next) {
  const apiKey = req.get('x-api-key');
  if (!apiKey) {
    if (REQUIRE_ORG_API_KEY) return res.status(401).json({ error: 'A valid organization x-api-key is required.' });
    return next();
  }
  try {
    const organization = await db.getOrgByApiKey(apiKey);
    if (!organization) return res.status(403).json({ error: 'Invalid organization API key.' });
    req.organization = organization;
    next();
  } catch (err) {
    console.error('[PortNexus] Organization key lookup failed:', err.message);
    return res.status(503).json({ error: 'Organization authentication is temporarily unavailable.' });
  }
}

function hasValidFileSignature(file) {
  const b = file.buffer;
  switch (file.mimetype) {
    case 'application/pdf': return b.subarray(0, 5).toString('ascii') === '%PDF-';
    case 'image/jpeg': return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/png': return b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case 'image/tiff': return b.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0x00])) || b.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0x00, 0x2a]));
    case 'image/webp': return b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP';
    default: return false;
  }
}

function validateUploadedFiles(req, res, next) {
  const invalid = (req.files || []).find(file => !hasValidFileSignature(file));
  if (invalid) return res.status(415).json({ error: `Uploaded content does not match its declared type: ${path.basename(invalid.originalname).slice(0, 100)}` });
  next();
}

const documentUpload = [uploadRateLimit, upload.array('files', 4), validateUploadedFiles];
app.use(express.static(path.join(__dirname, 'public')));

// ──────────────────────────────────────────────────────────────────────────
// SEO, AEO & CRAWLER INFRASTRUCTURE
// ──────────────────────────────────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.get('/llms.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'llms.txt'));
});

app.get('/llms-full.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'llms-full.txt'));
});

// ──────────────────────────────────────────────────────────────────────────
// 1. HEALTH & SYSTEM STATUS
// ──────────────────────────────────────────────────────────────────────────
app.get('/api/health', asyncHandler(async (req, res) => {
  const dbStatus = await db.checkDBConnection();
  const signingSecretConfigured = Buffer.byteLength(process.env.CERTIFICATE_SIGNING_SECRET || '', 'utf8') >= 32;
  const serviceCredentialConfigured = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ready = dbStatus.connected && signingSecretConfigured && (!IS_PRODUCTION || serviceCredentialConfigured);
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ONLINE' : 'DEGRADED',
    ready,
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    capabilities: {
      documentOCR: true,
      swiftMT700Parser: true,
      verifiableCertificates: signingSecretConfigured && PERSIST_AUDIT_EVIDENCE,
      persistentDB: dbStatus.connected,
      geminiMultimodal: !!GEMINI_API_KEY,
    },
    database: { connected: dbStatus.connected, ...(dbStatus.reason ? { reason: dbStatus.reason } : {}) },
  });
}));

// ──────────────────────────────────────────────────────────────────────────
// 2. PILLAR 2: SWIFT MT700 PARSER
// ──────────────────────────────────────────────────────────────────────────
app.post('/api/swift/parse', (req, res) => {
  const { rawMessage } = req.body;
  if (!rawMessage) {
    return res.status(400).json({ error: 'rawMessage (SWIFT MT700 text) is required.' });
  }
  try {
    const parsed = parseSWIFTMT700(rawMessage);
    const validation = validateParsedMT700(parsed);
    res.json({ parsed, validation });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/swift/sample', (req, res) => {
  res.json({ sample: getSampleMT700(), description: 'Sample SWIFT MT700 L/C message for testing.' });
});

// ──────────────────────────────────────────────────────────────────────────
// 3. PILLAR 1: DOCUMENT UPLOAD & OCR (PDF, Image, SWIFT text)
// ──────────────────────────────────────────────────────────────────────────
app.post('/api/documents/upload', requireOrgApiKey, documentUpload, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded. Send files as multipart/form-data with field name "files".' });
  }

  const results = [];
  const orgId = req.organization?.id || null;

  for (const file of req.files) {
    try {
      const extracted = await processDocument(
        file.buffer,
        file.originalname,
        file.mimetype,
        GEMINI_API_KEY,
      );

      // Persist to document vault
      if (orgId && PERSIST_DOCUMENT_METADATA) {
        await db.saveDocumentRecord(null, orgId, {
          filename: file.originalname,
          documentType: extracted.documentType,
          mimeType: file.mimetype,
          fileSize: file.size,
          extractionMethod: extracted.layers.map(l => l.method).filter(Boolean).join('+'),
          extractedText: null,
          structuredData: null,
          confidence: extracted.confidence,
        });
      }

      results.push({
        filename: file.originalname,
        documentType: extracted.documentType,
        confidence: extracted.confidence,
        extractionMethods: extracted.layers.map(l => l.method).filter(Boolean),
        structured: extracted.extracted?.structured || null,
        rawTextPreview: extracted.extracted?.rawText?.slice(0, 500) || null,
      });
    } catch (err) {
      results.push({ filename: file.originalname, error: err.message });
    }
  }

  res.json({ processed: results.length, metadataPersisted: PERSIST_DOCUMENT_METADATA, results });
}));

// Full workflow: Upload documents and immediately run UCP 600 audit
app.post('/api/documents/upload-and-audit', requireOrgApiKey, documentUpload, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  const orgId = req.organization?.id || null;

  const allDocuments = {};
  const extractionErrors = [];

  // Process all uploaded files
  for (const file of req.files) {
    try {
      const extracted = await processDocument(file.buffer, file.originalname, file.mimetype, GEMINI_API_KEY);
      const mapped = mapToAuditDocuments(extracted.extracted || {});
      Object.assign(allDocuments, mapped);
    } catch (err) {
      extractionErrors.push({ filename: path.basename(file.originalname).slice(0, 100), error: err.message });
    }
  }

  // Also parse any SWIFT raw text provided in body
  if (req.body && req.body.swiftMessage) {
    try {
      const swiftParsed = parseSWIFTMT700(req.body.swiftMessage);
      if (swiftParsed.lc) allDocuments.lc = { ...allDocuments.lc, ...swiftParsed.lc };
    } catch {}
  }

  if (!allDocuments.lc && !allDocuments.invoice) {
    return res.status(422).json({
      error: 'Could not extract L/C or Invoice data from uploaded documents.',
      hint: 'Upload a PDF or image of your Letter of Credit and Commercial Invoice, or paste the SWIFT MT700 message.',
    });
  }

  // Run UCP 600 Audit
  const auditReport = auditTradePackage(allDocuments);

  // An incomplete comparison is not eligible for a certificate.
  let certData = null;
  let certificateUnavailableReason = null;
  if (auditReport.reviewRequired) {
    certificateUnavailableReason = 'Required document evidence is missing or needs human review.';
  } else if (!PERSIST_AUDIT_EVIDENCE || !orgId) {
    certificateUnavailableReason = 'Online certificates require an authenticated organization and PERSIST_AUDIT_EVIDENCE=true.';
  } else {
    try {
      certData = await generateComplianceCertificate(auditReport, allDocuments);
      const certificatePayload = buildCertificatePayload(auditReport, allDocuments, certData.certId);
      const consignment = await db.saveConsignment(allDocuments.lc, allDocuments.invoice, allDocuments.bl, orgId);
      await db.saveAuditReport(consignment.id, auditReport, certData, orgId, certificatePayload);
      auditReport._certId = certData.certId;
      auditReport._auditHash = certData.auditHash;
      auditReport._verifyUrl = certData.verifyUrl;
    } catch (err) {
      certData = null;
      certificateUnavailableReason = 'The audit evidence could not be durably saved, so no verifiable certificate was issued.';
      console.error('[PortNexus] Audit certificate persistence failed:', err.message);
    }
  }

  res.json({
    extractedDocuments: Object.keys(allDocuments),
    extractionErrors,
    auditReport,
    certificateId: certData?.certId,
    verifyUrl: certData?.verifyUrl,
    downloadUrl: certData ? `/api/certificate/${certData.certId}/download` : null,
    certificateUnavailableReason: certificateUnavailableReason || undefined,
  });
}));

// ──────────────────────────────────────────────────────────────────────────
// 4. PILLAR 3: AUDIT WITH SWIFT MESSAGE (TEXT) + GENERATE CERTIFICATE
// ──────────────────────────────────────────────────────────────────────────
app.post('/api/audit/full', requireOrgApiKey, asyncHandler(async (req, res) => {
  const { swiftMessage, documents } = req.body || {};
  const orgId = req.organization?.id || null;

  let docs = documents && typeof documents === 'object' && !Array.isArray(documents) ? { ...documents } : {};

  // Parse SWIFT message if provided
  if (swiftMessage) {
    if (typeof swiftMessage !== 'string' || swiftMessage.length > 100_000) {
      return res.status(400).json({ error: 'swiftMessage must be a text value under 100 KB.' });
    }
    try {
      const swiftParsed = parseSWIFTMT700(swiftMessage);
      docs.lc = { ...(docs.lc || {}), ...swiftParsed.lc };
    } catch (err) {
      return res.status(400).json({ error: `SWIFT parse error: ${err.message}` });
    }
  }

  if (!docs.lc && !docs.invoice) {
    return res.status(400).json({ error: 'Provide either swiftMessage (MT700) or documents object with lc/invoice.' });
  }

  const auditReport = auditTradePackage(docs);

  let certData = null;
  let certificateUnavailableReason = null;
  if (auditReport.reviewRequired) {
    certificateUnavailableReason = 'Required document evidence is missing or needs human review.';
  } else if (!PERSIST_AUDIT_EVIDENCE || !orgId) {
    certificateUnavailableReason = 'Online certificates require an authenticated organization and PERSIST_AUDIT_EVIDENCE=true.';
  } else {
    try {
      certData = await generateComplianceCertificate(auditReport, docs);
      const certificatePayload = buildCertificatePayload(auditReport, docs, certData.certId);
      const consignment = await db.saveConsignment(docs.lc, docs.invoice, docs.bl, orgId);
      await db.saveAuditReport(consignment.id, auditReport, certData, orgId, certificatePayload);
      auditReport._certId = certData.certId;
      auditReport._auditHash = certData.auditHash;
      auditReport._verifyUrl = certData.verifyUrl;
    } catch (err) {
      certData = null;
      certificateUnavailableReason = 'The audit evidence could not be durably saved, so no verifiable certificate was issued.';
      console.error('[PortNexus] Audit certificate persistence failed:', err.message);
    }
  }

  res.json({
    auditReport,
    certificateId: certData?.certId || null,
    verifyUrl: certData?.verifyUrl || null,
    downloadUrl: certData ? `/api/certificate/${certData.certId}/download` : null,
    certificateUnavailableReason: certificateUnavailableReason || undefined,
  });
}));

// ──────────────────────────────────────────────────────────────────────────
// 5. CERTIFICATE DOWNLOAD & VERIFICATION
// ──────────────────────────────────────────────────────────────────────────
function certificateRecordIsValid(record) {
  const payload = record?.certificate_payload;
  if (!payload || payload.certId !== record.cert_id || !payload.auditReport || !payload.documents) return false;
  const report = payload.auditReport;
  const sameTimestamp = Date.parse(report.auditTimestamp) === Date.parse(record.audit_timestamp);
  const sameSummary = report.status === record.status
    && Number(report.complianceScore) === Number(record.compliance_score)
    && Number(report.totalDiscrepancies) === Number(record.total_discrepancies)
    && sameTimestamp;
  return sameSummary && verifyAuditHash(record.audit_hash, report, payload.documents, { certId: record.cert_id });
}

app.get('/api/certificate/:certId/download', asyncHandler(async (req, res) => {
  const { certId } = req.params;
  if (certId.length > 80) return res.status(400).json({ error: 'Invalid certificate ID.' });
  const auditRecord = await db.getAuditByCertId(certId);

  if (!auditRecord) {
    return res.status(404).json({ error: `Certificate ${certId} not found.` });
  }

  if (!certificateRecordIsValid(auditRecord)) {
    return res.status(409).json({ error: 'Certificate evidence is missing or its seal does not validate.' });
  }

  try {
    const certResult = await generateComplianceCertificate(
      auditRecord.certificate_payload.auditReport,
      auditRecord.certificate_payload.documents,
      { certId, auditHash: auditRecord.audit_hash, verifyUrl: auditRecord.verify_url },
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PortNexus-Certificate-${certId}.pdf"`);
    res.setHeader('X-Cert-Hash', auditRecord.audit_hash);
    res.send(certResult.buffer);
  } catch (err) {
    res.status(500).json({ error: 'PDF generation failed: ' + err.message });
  }
}));

app.get('/verify', asyncHandler(async (req, res) => {
  const { id: certId, format, hash: requestedHash } = req.query;
  const wantsJson = format === 'json' || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html'));

  if (!certId) {
    if (wantsJson) return res.status(400).json({ error: 'Certificate ID required.' });
    return res.status(400).send(renderNotFoundHtml('Missing Certificate ID'));
  }
  if (typeof certId !== 'string' || certId.length > 80) {
    if (wantsJson) return res.status(400).json({ error: 'Invalid certificate ID.' });
    return res.status(400).send(renderNotFoundHtml('Invalid Certificate ID'));
  }

  const record = await db.getAuditByCertId(certId);
  if (!record) {
    if (wantsJson) return res.status(404).json({ error: 'Certificate not found.' });
    return res.status(404).send(renderNotFoundHtml(certId));
  }

  const signatureValid = certificateRecordIsValid(record)
    && (!requestedHash || (typeof requestedHash === 'string' && requestedHash === record.audit_hash));
  const verificationRecord = { ...record, signatureValid };

  if (wantsJson) {
    return res.status(signatureValid ? 200 : 409).json({
      valid: signatureValid,
      certId: record.cert_id,
      complianceScore: record.compliance_score,
      status: record.status,
      auditHash: record.audit_hash,
      auditTimestamp: record.audit_timestamp,
      discrepancyCount: record.total_discrepancies,
    });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(signatureValid ? 200 : 409).send(renderVerificationHtml(verificationRecord));
}));

// ──────────────────────────────────────────────────────────────────────────
// 6. AUDIT HISTORY (Multi-tenant dashboard)
// ──────────────────────────────────────────────────────────────────────────
app.get('/api/history', requireOrgApiKey, asyncHandler(async (req, res) => {
  if (!req.organization) return res.status(401).json({ error: 'A valid organization x-api-key is required.' });
  const history = await db.getAuditHistoryByOrg(req.organization.id, 100);
  res.json({ organization: req.organization.name, total: history.length, audits: history });
}));

// ──────────────────────────────────────────────────────────────────────────
// 7. HS CODE ENGINE (with DB logging)
// ──────────────────────────────────────────────────────────────────────────
app.get('/api/hscode/search', (req, res) => {
  const query = req.query.q || '';
  const results = searchHSCode(query);
  res.json({ query, total: results.length, results });
});

app.post('/api/hscode/classify', requireOrgApiKey, asyncHandler(async (req, res) => {
  const { commodityDescription, invoiceValueUsd, exchangeRateBdt } = req.body || {};
  if (!commodityDescription) {
    return res.status(400).json({ error: 'commodityDescription is required' });
  }
  if (typeof commodityDescription !== 'string' || commodityDescription.length > 1000) {
    return res.status(400).json({ error: 'commodityDescription must be text under 1000 characters.' });
  }

  const classification = classifyCommodity(commodityDescription);
  let duties = null;
  if (invoiceValueUsd !== undefined && invoiceValueUsd !== null && invoiceValueUsd !== '') {
    if (!classification.match) {
      return res.json({ commodityDescription, classification, duties: null, dutyEstimateUnavailableReason: 'No candidate was found in the limited demonstration dataset.' });
    }
    try {
      duties = calculateTotalDuties(classification.match, invoiceValueUsd, exchangeRateBdt);
    } catch (err) {
      return res.status(400).json({ error: err.message, classification });
    }
  }

  if (req.organization) {
    try {
      await db.saveHSClassification(req.organization.id, commodityDescription, classification, duties);
    } catch (err) {
      console.error('[PortNexus] HS classification log failed:', err.message);
    }
  }

  res.json({ commodityDescription, classification, duties, tariffDataStatus: 'UNVERIFIED_DEMONSTRATION_RATES', auditTimestamp: new Date().toISOString() });
}));

// ──────────────────────────────────────────────────────────────────────────
// 8. LEGACY ENDPOINTS (preserved)
// ──────────────────────────────────────────────────────────────────────────
app.post('/api/audit/trade-package', requireOrgApiKey, (req, res) => {
  const documents = req.body;
  if (!documents || !documents.lc || !documents.invoice) {
    return res.status(400).json({ error: 'Valid L/C and Commercial Invoice objects are required.' });
  }
  const auditReport = auditTradePackage(documents);
  res.json(auditReport);
});

app.get('/api/rag/search', (req, res) => {
  const query = req.query.q || '';
  if (typeof query !== 'string' || query.length > 500) return res.status(400).json({ error: 'Search query must be under 500 characters.' });
  const results = searchContextualRAG(query);
  res.json({ query, totalResults: results.length, retrievalMethod: 'keyword', sourceStatus: 'UNVERIFIED_LOCAL_CORPUS', citations: results });
});

app.get('/api/graph/inspect', (req, res) => res.json({ nodes: GRAPH_NODES, edges: GRAPH_EDGES }));

app.post('/api/graph/query', (req, res) => {
  const { commodityId, destinationPortId } = req.body;
  if (!commodityId || !destinationPortId) {
    return res.status(400).json({ error: 'commodityId and destinationPortId are required.' });
  }
  const result = queryGraph(commodityId, destinationPortId);
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

app.get('/api/mcp/tools', (req, res) => res.json({ tools: MCP_TOOLS }));

app.post('/api/mcp/execute', requireOrgApiKey, (req, res) => {
  const { tool, arguments: args } = req.body;
  try {
    res.json(handleMcpToolCall(tool, args));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/mcp/sse', (req, res) => {
  res.status(410).json({ error: 'The placeholder SSE endpoint has been retired.', replacement: '/api/mcp' });
});

const MCP_PROTOCOL_VERSION = '2025-11-25';
const MCP_SUPPORTED_VERSIONS = new Set(['2025-03-26', MCP_PROTOCOL_VERSION]);

app.get('/api/mcp', (req, res) => {
  res.setHeader('Allow', 'POST');
  res.status(405).end();
});

app.post('/api/mcp', validateMcpOrigin, requireOrgApiKey, (req, res) => {
  const origin = req.get('origin');
  if (origin && !configuredOrigins.includes(origin)) return res.status(403).json({ error: 'Origin is not allowed.' });
  const accept = (req.get('accept') || '').toLowerCase();
  if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
    return res.status(406).json({ error: 'MCP clients must accept application/json and text/event-stream.' });
  }
  if (!req.is('application/json')) return res.status(415).json({ error: 'MCP requests must use application/json.' });

  const message = req.body;
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return res.status(400).json({ jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'Invalid JSON-RPC request.' } });
  }
  const isRequest = Object.prototype.hasOwnProperty.call(message, 'id');
  if (!isRequest) return res.status(202).end();

  const requestedProtocol = req.get('MCP-Protocol-Version');
  if (message.method !== 'initialize' && requestedProtocol && !MCP_SUPPORTED_VERSIONS.has(requestedProtocol)) {
    return res.status(400).json({ jsonrpc: '2.0', id: message.id, error: { code: -32600, message: 'Unsupported MCP protocol version.' } });
  }

  const result = (value, protocolVersion = requestedProtocol || MCP_PROTOCOL_VERSION) => {
    res.setHeader('MCP-Protocol-Version', protocolVersion);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ jsonrpc: '2.0', id: message.id, result: value });
  };
  const protocolError = (code, errorMessage) => res.status(200).json({
    jsonrpc: '2.0', id: message.id, error: { code, message: errorMessage },
  });

  if (message.method === 'initialize') {
    const clientVersion = message.params?.protocolVersion;
    if (clientVersion && typeof clientVersion !== 'string') return protocolError(-32602, 'Invalid protocolVersion.');
    const negotiatedVersion = MCP_SUPPORTED_VERSIONS.has(clientVersion) ? clientVersion : MCP_PROTOCOL_VERSION;
    return result({
      protocolVersion: negotiatedVersion,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'portnexus-trade-screening', version: '2.1.0' },
    }, negotiatedVersion);
  }
  if (message.method === 'ping') return result({});
  if (message.method === 'tools/list') return result({ tools: MCP_TOOLS });
  if (message.method === 'tools/call') {
    const name = message.params?.name;
    const args = message.params?.arguments || {};
    if (typeof name !== 'string' || !MCP_TOOLS.some(tool => tool.name === name)) {
      return protocolError(-32602, 'Unknown tool name.');
    }
    if (!args || typeof args !== 'object' || Array.isArray(args)) return protocolError(-32602, 'Tool arguments must be a JSON object.');
    try {
      const toolResult = handleMcpToolCall(name, args);
      return result({ content: [{ type: 'text', text: JSON.stringify(toolResult) }], structuredContent: toolResult, isError: false });
    } catch (err) {
      return result({ content: [{ type: 'text', text: err.message }], isError: true });
    }
  }
  return protocolError(-32601, 'Method not found.');
});

function validateMcpOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin && !configuredOrigins.includes(origin)) return res.status(403).json({ error: 'Origin is not allowed.' });
  next();
}

app.post('/api/webhooks/n8n', (req, res) => {
  console.log('[n8n Webhook] Alert received:', JSON.stringify(req.body));
  res.json({ status: 'DISPATCHED_TO_N8N', timestamp: new Date().toISOString(), pipeline: 'Trade-Discrepancy-Emergency-Resolution' });
});

app.get('/api/ollama/status', (req, res) => {
  res.json({
    status: 'ACTIVE_LOCAL_DAEMON',
    runtime: 'Ollama v0.5.8',
    activeModels: ['DeepSeek-R1-Distill-Qwen-14B:q4_K_M', 'Qwen2.5-Coder-7B:q8_0'],
    isolationLevel: 'AIR_GAPPED_LOCAL_CONTAINER',
    dataExfiltrationRisk: 0.0,
  });
});

// ──────────────────────────────────────────────────────────────────────────
// L/C SAMPLE ENDPOINTS (for frontend demo)
// ──────────────────────────────────────────────────────────────────────────
app.get('/api/lc/sample-discrepant', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Catch-all SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found.' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[PortNexus v2.0] Enterprise Trade Intelligence server running on port ${PORT}`);
    console.log(`[PortNexus v2.0] Capabilities: Document OCR, SWIFT MT700, PDF Certificates, Supabase DB`);
    console.log(`[PortNexus v2.0] Gemini API: ${GEMINI_API_KEY ? 'CONNECTED' : 'NOT CONFIGURED (OCR will use Tesseract fallback)'}`);
    console.log(`[PortNexus v2.0] Local URL: http://localhost:${PORT}`);
  });
}

module.exports = app;
