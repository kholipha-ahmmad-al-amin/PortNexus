// PortNexus :: Supabase Database Layer
// Pillar 4: Multi-tenant Persistent Trade Audit Trail
// Connects to PostgreSQL via Supabase JavaScript Client using environment variables.

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || null;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || (process.env.NODE_ENV === 'production' ? null : process.env.SUPABASE_ANON_KEY)
  || null;

let _client = null;

function getDB() {
  if (!_client) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return null;
    }
    _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

// ─── CONSIGNMENTS ────────────────────────────────────────────

async function saveConsignment(lcData, invoiceData, blData, orgId = null) {
  const db = getDB();
  if (!db) return { id: null };
  const lc = lcData || {};
  const inv = invoiceData || {};

  const record = {
    org_id: orgId,
    lc_number: lc.lcNumber || null,
    invoice_number: inv.invoiceNumber || null,
    bl_number: blData?.blNumber || null,
    applicant: lc.applicant || inv.buyer || null,
    beneficiary: lc.beneficiary || inv.seller || null,
    goods_description: lc.goodsDescription || inv.goodsDescription || null,
    currency: lc.currency || inv.currency || 'USD',
    amount: lc.amount || inv.amount || null,
    port_of_loading: lc.portOfLoading || null,
    port_of_discharge: lc.portOfDischarge || null,
    latest_shipment_date: lc.latestShipmentDate || null,
    expiry_date: lc.expiryDate || null,
    status: 'PENDING',
  };

  const { data, error } = await db.from('trade_consignments').insert(record).select().single();
  if (error) throw new Error(`DB save consignment failed: ${error.message}`);
  return data;
}

async function getConsignmentsByOrg(orgId, limit = 50) {
  const db = getDB();
  if (!db) return [];
  const { data, error } = await db
    .from('trade_consignments')
    .select('*, audit_reports(id, compliance_score, status, cert_id, audit_timestamp)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`DB fetch consignments failed: ${error.message}`);
  return data || [];
}

async function getConsignmentByLCNumber(lcNumber) {
  const db = getDB();
  if (!db) return null;
  const { data, error } = await db
    .from('trade_consignments')
    .select('*')
    .eq('lc_number', lcNumber)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`DB lookup failed: ${error.message}`);
  return data || null;
}

// ─── AUDIT REPORTS ───────────────────────────────────────────

async function saveAuditReport(consignmentId, auditResult, certData, orgId = null, certificatePayload = null) {
  const db = getDB();
  if (!db) return null;
  if (!certificatePayload) throw new Error('Certificate evidence snapshot is required for verifiable audit persistence.');

  const record = {
    consignment_id: consignmentId,
    org_id: orgId,
    cert_id: certData.certId,
    compliance_score: auditResult.complianceScore,
    status: auditResult.status,
    total_discrepancies: auditResult.totalDiscrepancies,
    passed_checks_count: auditResult.passedChecks?.length || 0,
    discrepancies: auditResult.discrepancies,
    passed_checks: auditResult.passedChecks,
    audit_hash: certData.auditHash,
    verify_url: certData.verifyUrl,
    audited_documents: certificatePayload.documents,
    certificate_payload: certificatePayload,
    review_items: auditResult.reviewItems || [],
    audit_timestamp: auditResult.auditTimestamp,
  };

  const { data, error } = await db.from('audit_reports').insert(record).select().single();
  if (error) throw new Error(`DB save audit failed: ${error.message}`);

  // Update consignment status if id present
  if (consignmentId) {
    await db
      .from('trade_consignments')
      .update({ status: auditResult.status, updated_at: new Date().toISOString() })
      .eq('id', consignmentId);
  }

  return data;
}

async function getAuditHistoryByOrg(orgId, limit = 100) {
  const db = getDB();
  if (!db) return [];
  const { data, error } = await db
    .from('audit_reports')
    .select('*, trade_consignments(lc_number, invoice_number, goods_description, beneficiary)')
    .eq('org_id', orgId)
    .order('audit_timestamp', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`DB fetch audit history failed: ${error.message}`);
  return data || [];
}

async function getAuditByCertId(certId) {
  const db = getDB();
  if (!db) return null;
  const { data, error } = await db
    .from('audit_reports')
    .select('*, trade_consignments(*)')
    .eq('cert_id', certId)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`DB cert lookup failed: ${error.message}`);
  return data || null;
}

// ─── DOCUMENT VAULT ──────────────────────────────────────────

async function saveDocumentRecord(consignmentId, orgId, fileInfo) {
  const db = getDB();
  if (!db) return null;
  const { data, error } = await db.from('document_vault').insert({
    consignment_id: consignmentId,
    org_id: orgId,
    original_filename: String(fileInfo.filename || '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255),
    document_type: fileInfo.documentType,
    mime_type: fileInfo.mimeType,
    file_size_bytes: fileInfo.fileSize,
    extraction_method: fileInfo.extractionMethod,
    extracted_text: fileInfo.extractedText?.slice(0, 50000),
    structured_data: fileInfo.structuredData || null,
    confidence: fileInfo.confidence,
  }).select().single();
  if (error) throw new Error(`DB save document failed: ${error.message}`);
  return data;
}

// ─── HS CODE LOG ─────────────────────────────────────────────

async function saveHSClassification(orgId, commodity, classification, duties) {
  const db = getDB();
  if (!db) return null;
  const match = classification?.match;
  const { data, error } = await db.from('hs_classifications').insert({
    org_id: orgId,
    commodity_description: commodity,
    hs_code: match?.code,
    confidence: classification?.confidence,
    customs_duty_pct: match?.customsDuty,
    total_duty_pct: duties ? ((match?.customsDuty || 0) + (match?.vat || 0) + (match?.regulatoryDuty || 0) + (match?.advanceTax || 0) + (match?.advanceIncomeTax || 0)) : null,
    cif_usd: duties?.cifUsd,
    total_duty_bdt: duties?.totalDutyBDT,
  }).select().single();
  if (error) throw new Error(`DB save HS classification failed: ${error.message}`);
  return data;
}

// ─── ORGANIZATION LOOKUP ──────────────────────────────────────

async function getOrgByApiKey(apiKey) {
  if (typeof apiKey !== 'string' || apiKey.length < 24 || apiKey.length > 512) return null;
  const db = getDB();
  if (!db) throw new Error('Database is not configured.');
  const apiKeyHash = crypto.createHash('sha256').update(apiKey, 'utf8').digest('hex');
  const { data, error } = await db
    .from('organizations')
    .select('id,name,is_active,plan_tier')
    .eq('api_key_hash', apiKeyHash)
    .eq('is_active', true)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw new Error(`Organization key lookup failed: ${error.message}`);
  return data || null;
}

// Health check
async function checkDBConnection() {
  try {
    const db = getDB();
    if (!db) return { connected: false, reason: 'Supabase server credentials are not configured.' };
    const { error } = await db.from('organizations').select('id').limit(1);
    return { connected: !error, ...(error ? { reason: error.message } : {}) };
  } catch (err) {
    return { connected: false, reason: err.message };
  }
}

module.exports = {
  getDB,
  saveConsignment,
  getConsignmentsByOrg,
  getConsignmentByLCNumber,
  saveAuditReport,
  getAuditHistoryByOrg,
  getAuditByCertId,
  saveDocumentRecord,
  saveHSClassification,
  getOrgByApiKey,
  checkDBConnection,
};
