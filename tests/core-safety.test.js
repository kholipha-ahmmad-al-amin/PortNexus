const test = require('node:test');
const assert = require('node:assert/strict');

const { auditTradePackage, parseIsoDate } = require('../lib/ucp600_rules');
const { classifyCommodity, calculateTotalDuties } = require('../lib/hscode_database');
const { generateAuditHash, verifyAuditHash } = require('../lib/certificate_generator');
const { handleMcpToolCall, MCP_TOOLS } = require('../lib/mcp_server');
const { getSampleMT700 } = require('../lib/swift_mt700_parser');
const { queryGraph } = require('../lib/graph_rag');

const completeDocuments = () => ({
  lc: {
    beneficiary: 'Apex Textile Mills Ltd',
    applicant: 'Example Buyer Ltd',
    goodsDescription: 'Cotton knitted shirts',
    amount: 125000,
    currency: 'USD',
    portOfLoading: 'Chattogram Port, Bangladesh',
    portOfDischarge: 'Port of Rotterdam, Netherlands',
    latestShipmentDate: '2026-11-15',
  },
  invoice: {
    beneficiary: 'Apex Textile Mills Ltd',
    applicant: 'Example Buyer Ltd',
    goodsDescription: 'Cotton knitted shirts',
    amount: 125000,
    currency: 'USD',
    totalCartons: 1250,
  },
  bl: {
    portOfLoading: 'Chattogram Port, Bangladesh',
    portOfDischarge: 'Port of Rotterdam, Netherlands',
    onBoardDate: '2026-11-10',
    totalCartons: 1250,
  },
  packingList: { totalCartons: 1250 },
});

test('complete selected-field package can pass only the declared screening checks', () => {
  const report = auditTradePackage(completeDocuments());
  assert.equal(report.status, 'COMPLIANT');
  assert.equal(report.complianceScore, 100);
  assert.equal(report.reviewRequired, false);
  assert.equal(report.passedChecks.length, 8);
});

test('missing fields produce review required and no compliance score', () => {
  const report = auditTradePackage({ lc: {}, invoice: {} });
  assert.equal(report.status, 'REVIEW_REQUIRED');
  assert.equal(report.complianceScore, null);
  assert.ok(report.reviewItems.length > 0);
});

test('text differences and amounts above the stated amount require review', () => {
  const documents = completeDocuments();
  documents.invoice.goodsDescription = 'Cotton shirts';
  documents.invoice.amount = 130000;
  const report = auditTradePackage(documents);
  assert.equal(report.status, 'REVIEW_REQUIRED');
  assert.equal(report.complianceScore, null);
  assert.equal(report.discrepancies.length, 0);
});

test('currency mismatch and late shipment remain explicit critical findings', () => {
  const documents = completeDocuments();
  documents.invoice.currency = 'EUR';
  documents.bl.onBoardDate = '2026-11-16';
  const report = auditTradePackage(documents);
  assert.equal(report.status, 'CRITICAL_DISCREPANCIES');
  assert.equal(report.discrepancies.length, 2);
});

test('dates accept only real calendar dates in ISO format', () => {
  assert.equal(parseIsoDate('2026-11-15'), '2026-11-15');
  assert.equal(parseIsoDate('2026-02-30'), null);
  assert.equal(parseIsoDate('15/11/2026'), null);
});

test('unknown HS items abstain and indicative duty math requires a supplied rate', () => {
  assert.equal(classifyCommodity('unlisted industrial widget').match, null);
  const candidate = classifyCommodity('cotton knitted t-shirts');
  assert.ok(candidate.match);
  assert.throws(() => calculateTotalDuties(candidate.match, 1000), /exchange rate/i);
  const estimate = calculateTotalDuties(candidate.match, 1000, 120);
  assert.equal(estimate.authoritative, false);
  assert.equal(estimate.exchangeRateBdt, 120);
});

test('certificate seal authenticates the full snapshot and detects changes', () => {
  const secret = 'f'.repeat(64);
  const docs = completeDocuments();
  const report = auditTradePackage(docs);
  const options = { certId: 'PN-CERT-TEST-00000001', secret };
  const hash = generateAuditHash(report, docs, options);
  assert.equal(verifyAuditHash(hash, report, docs, options), true);
  docs.invoice.amount += 1;
  assert.equal(verifyAuditHash(hash, report, docs, options), false);
});

test('MCP advertises and parses the SWIFT tool, and unknown graph inputs do not invent a route', () => {
  assert.ok(MCP_TOOLS.some(tool => tool.name === 'parse_swift_mt700'));
  const result = handleMcpToolCall('parse_swift_mt700', { rawMessage: getSampleMT700() });
  assert.equal(result.tool, 'parse_swift_mt700');
  assert.ok(result.parsed);
  assert.equal(queryGraph('UNKNOWN', 'PORT_ROTTERDAM').error !== undefined, true);
});
