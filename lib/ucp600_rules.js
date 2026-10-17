// Deterministic document comparisons for a limited, explicitly declared audit scope.
// These checks are screening aids and do not replace a banker's examination.

const UCP_RULES = [
  { ruleId: 'PN-BENEFICIARY', article: 'UCP 600 Article 18(a)(i)', name: 'Invoice Issuer Identity', severity: 'HIGH' },
  { ruleId: 'PN-APPLICANT', article: 'UCP 600 Article 18(a)(ii)', name: 'Invoice Recipient Identity', severity: 'HIGH' },
  { ruleId: 'UCP-ART-18C', article: 'UCP 600 Article 18(c)', name: 'Goods Description Correspondence', severity: 'HIGH' },
  { ruleId: 'UCP-ART-18A-III', article: 'UCP 600 Article 18(a)(iii)', name: 'Invoice Currency and Amount', severity: 'CRITICAL' },
  { ruleId: 'PN-PORT-LOADING', article: 'UCP 600 Article 20', name: 'Port of Loading', severity: 'CRITICAL' },
  { ruleId: 'PN-PORT-DISCHARGE', article: 'UCP 600 Article 20', name: 'Port of Discharge', severity: 'CRITICAL' },
  { ruleId: 'PN-SHIPMENT-DATE', article: 'UCP 600 Article 20(a)(ii)', name: 'Shipment Deadline', severity: 'CRITICAL' },
  { ruleId: 'UCP-ART-14D', article: 'UCP 600 Article 14(d)', name: 'Package Count Consistency', severity: 'MEDIUM' },
];

const cleanText = value => typeof value === 'string' ? value.trim() : '';
const foldedText = value => cleanText(value).replace(/\s+/g, ' ').toLocaleLowerCase('en');

function parseIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

function auditTradePackage(documents) {
  const docs = documents && typeof documents === 'object' ? documents : {};
  const lc = docs.lc || {};
  const invoice = docs.invoice || {};
  const bl = docs.bl || {};
  const packingList = docs.packingList || {};
  const discrepancies = [];
  const passedChecks = [];
  const reviewItems = [];
  const checkResults = [];

  function review(ruleId, title, missing) {
    const item = { ruleId, title, status: 'REVIEW_REQUIRED', missing };
    reviewItems.push(item);
    checkResults.push(item);
  }

  function pass(ruleId, title, detail) {
    const item = { ruleId, rule: title, title, detail, status: 'PASS' };
    passedChecks.push(item);
    checkResults.push(item);
  }

  function fail(ruleId, title, message, remediation, severity = 'CRITICAL') {
    const item = { ruleId, title, message, remediation, severity, status: 'FAIL' };
    discrepancies.push(item);
    checkResults.push(item);
  }

  const missingDocuments = [];
  if (!docs.lc) missingDocuments.push('Letter of Credit or parsed MT700');
  if (!docs.invoice) missingDocuments.push('Commercial Invoice');
  if (!docs.bl) missingDocuments.push('Bill of Lading');
  if (missingDocuments.length) review('PN-SCOPE', 'Required document set', missingDocuments);

  const beneficiary = cleanText(invoice.beneficiary || invoice.seller);
  const lcBeneficiary = cleanText(lc.beneficiary);
  if (!lcBeneficiary || !beneficiary) {
    review('PN-BENEFICIARY', 'Invoice issuer identity', [
      ...(!lcBeneficiary ? ['L/C beneficiary'] : []),
      ...(!beneficiary ? ['Invoice issuer or seller'] : []),
    ]);
  } else if (foldedText(lcBeneficiary) === foldedText(beneficiary)) {
    pass('PN-BENEFICIARY', 'Invoice issuer identity', 'The displayed beneficiary and invoice issuer names match after whitespace and case normalization.');
  } else {
    review('PN-BENEFICIARY', 'Invoice issuer identity', ['Names differ and need human review for identity and permitted presentation context.']);
  }

  const applicant = cleanText(invoice.applicant || invoice.buyer);
  const lcApplicant = cleanText(lc.applicant);
  if (!lcApplicant || !applicant) {
    review('PN-APPLICANT', 'Invoice recipient identity', [
      ...(!lcApplicant ? ['L/C applicant'] : []),
      ...(!applicant ? ['Invoice recipient or buyer'] : []),
    ]);
  } else if (foldedText(lcApplicant) === foldedText(applicant)) {
    pass('PN-APPLICANT', 'Invoice recipient identity', 'The displayed applicant and invoice recipient names match after whitespace and case normalization.');
  } else {
    review('PN-APPLICANT', 'Invoice recipient identity', ['Names differ and need human review for identity and permitted presentation context.']);
  }

  const lcGoods = cleanText(lc.goodsDescription);
  const invoiceGoods = cleanText(invoice.goodsDescription);
  if (!lcGoods || !invoiceGoods) {
    review('UCP-ART-18C', 'Goods description', [
      ...(!lcGoods ? ['L/C goods description'] : []),
      ...(!invoiceGoods ? ['Invoice goods description'] : []),
    ]);
  } else if (lcGoods === invoiceGoods) {
    pass('UCP-ART-18C', 'Goods description', 'The extracted descriptions are text-identical. This does not determine legal correspondence.');
  } else {
    review('UCP-ART-18C', 'Goods description', ['Descriptions differ. A qualified reviewer must decide whether the difference is acceptable under the credit and applicable rules.']);
  }

  const lcCurrency = cleanText(lc.currency).toUpperCase();
  const invoiceCurrency = cleanText(invoice.currency).toUpperCase();
  const lcAmount = Number(lc.amount);
  const invoiceAmount = Number(invoice.amount);
  const amountMissing = [];
  if (!/^[A-Z]{3}$/.test(lcCurrency)) amountMissing.push('Valid L/C currency');
  if (!/^[A-Z]{3}$/.test(invoiceCurrency)) amountMissing.push('Valid invoice currency');
  if (!Number.isFinite(lcAmount) || lcAmount <= 0) amountMissing.push('Positive L/C amount');
  if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) amountMissing.push('Positive invoice amount');
  if (amountMissing.length) {
    review('UCP-ART-18A-III', 'Invoice currency and amount', amountMissing);
  } else if (lcCurrency !== invoiceCurrency) {
    fail('UCP-ART-18A-III', 'Invoice currency mismatch', `Invoice currency ${invoiceCurrency} differs from L/C currency ${lcCurrency}.`, 'Confirm the credit terms and obtain an amendment or corrected invoice where required.');
  } else if (invoiceAmount > lcAmount) {
    review('UCP-ART-18A-III', 'Invoice exceeds stated L/C amount', [`Invoice amount ${invoiceAmount} ${invoiceCurrency} exceeds the stated amount ${lcAmount} ${lcCurrency}. Review credit tolerance, amount wording, and amendments.`]);
  } else {
    pass('UCP-ART-18A-III', 'Invoice currency and amount', `Invoice is in ${invoiceCurrency} and does not exceed the stated L/C amount.`);
  }

  for (const [field, ruleId, title] of [
    ['portOfLoading', 'PN-PORT-LOADING', 'Port of loading'],
    ['portOfDischarge', 'PN-PORT-DISCHARGE', 'Port of discharge'],
  ]) {
    const expected = cleanText(lc[field]);
    const observed = cleanText(bl[field]);
    if (!expected || !observed) {
      review(ruleId, title, [
        ...(!expected ? [`L/C ${title}`] : []),
        ...(!observed ? [`Bill of Lading ${title}`] : []),
      ]);
    } else if (foldedText(expected) === foldedText(observed)) {
      pass(ruleId, title, 'The extracted port names match after whitespace and case normalization.');
    } else {
      review(ruleId, title, [`The L/C and Bill of Lading values differ. Port aliases and routing terms need human review.`]);
    }
  }

  const latestShipmentDate = parseIsoDate(lc.latestShipmentDate);
  const onBoardDate = parseIsoDate(bl.onBoardDate);
  if (!latestShipmentDate || !onBoardDate) {
    review('PN-SHIPMENT-DATE', 'Shipment deadline', [
      ...(!latestShipmentDate ? ['Valid L/C latest shipment date'] : []),
      ...(!onBoardDate ? ['Valid Bill of Lading on-board date'] : []),
    ]);
  } else if (onBoardDate > latestShipmentDate) {
    fail('PN-SHIPMENT-DATE', 'Shipment after latest shipment date', `Bill of Lading on-board date ${onBoardDate} is later than L/C latest shipment date ${latestShipmentDate}.`, 'Verify the carrier record and credit terms, then request an amendment if needed.');
  } else {
    pass('PN-SHIPMENT-DATE', 'Shipment deadline', `Bill of Lading on-board date ${onBoardDate} is on or before ${latestShipmentDate}.`);
  }

  const cartonValues = [
    ['Invoice', invoice.totalCartons],
    ['Packing List', packingList.totalCartons],
    ['Bill of Lading', bl.totalCartons],
  ];
  const presentCartons = cartonValues.filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (presentCartons.length < 2) {
    review('UCP-ART-14D', 'Package count consistency', ['Carton counts from at least two stipulated documents are needed for comparison.']);
  } else {
    const normalized = presentCartons.map(([, value]) => Number(value));
    if (normalized.some(value => !Number.isFinite(value) || value < 0)) {
      review('UCP-ART-14D', 'Package count consistency', ['One or more carton counts are invalid.']);
    } else if (normalized.every(value => value === normalized[0])) {
      pass('UCP-ART-14D', 'Package count consistency', `${presentCartons.map(([name, value]) => `${name}: ${value}`).join(', ')}.`);
    } else {
      review('UCP-ART-14D', 'Package count difference', [`${presentCartons.map(([name, value]) => `${name}: ${value}`).join(', ')}. Confirm units, partial packages, and the credit terms before deciding whether this is a discrepancy.`]);
    }
  }

  const evaluated = passedChecks.length + discrepancies.length;
  const complianceScore = reviewItems.length || evaluated === 0
    ? null
    : Math.round((passedChecks.length / evaluated) * 100);
  const status = reviewItems.length
    ? 'REVIEW_REQUIRED'
    : discrepancies.some(item => item.severity === 'CRITICAL')
      ? 'CRITICAL_DISCREPANCIES'
      : discrepancies.length
        ? 'WARNINGS_DETECTED'
        : 'COMPLIANT';

  return {
    rulesetVersion: 'portnexus-screening-1.0',
    reviewRequired: reviewItems.length > 0,
    complianceScore,
    status,
    totalChecks: checkResults.length,
    evaluatedChecks: evaluated,
    totalDiscrepancies: discrepancies.length,
    discrepancies,
    reviewItems,
    passedChecks,
    checkResults,
    auditTimestamp: new Date().toISOString(),
  };
}

module.exports = { UCP_RULES, auditTradePackage, parseIsoDate };
