// PortNexus : World Customs Organization (WCO) HS Code & Tariff Engine
// Demonstration candidates only. This bundled dataset is not an authoritative
// customs tariff schedule and must not be used for a customs declaration.

const HS_DATABASE = [
  {
    code: '6109.10.00',
    description: 'T-shirts, singlets and other vests, knitted or crocheted, of cotton',
    chapter: '61',
    heading: '6109',
    subheading: '10',
    category: 'Textiles & Apparel (RMG)',
    customsDuty: 25.0,
    regulatoryDuty: 3.0,
    vat: 15.0,
    advanceTax: 5.0,
    advanceIncomeTax: 5.0,
    rulesOfOrigin: 'Double transformation required for EU EBA preferential tariff (yarn forward rule).',
    requiredDocs: ['Certificate of Origin', 'Inspection Certificate', 'GSP Form A / REX Statement']
  },
  {
    code: '6203.42.00',
    description: "Men's or boys' trousers, bib and brace overalls, breeches and shorts, of cotton",
    chapter: '62',
    heading: '6203',
    subheading: '42',
    category: 'Textiles & Apparel (RMG)',
    customsDuty: 25.0,
    regulatoryDuty: 3.0,
    vat: 15.0,
    advanceTax: 5.0,
    advanceIncomeTax: 5.0,
    rulesOfOrigin: 'Fabric manufacturing and assembly within eligible beneficiary country.',
    requiredDocs: ['Certificate of Origin', 'Commercial Invoice with weight specification', 'Packing List']
  },
  {
    code: '6403.91.00',
    description: 'Footwear with outer soles of rubber, plastics, leather or composition leather and uppers of leather (covering the ankle)',
    chapter: '64',
    heading: '6403',
    subheading: '91',
    category: 'Footwear & Leather Goods',
    customsDuty: 25.0,
    regulatoryDuty: 20.0,
    vat: 15.0,
    advanceTax: 5.0,
    advanceIncomeTax: 5.0,
    rulesOfOrigin: 'Upper cutting and lasting must take place in originating country.',
    requiredDocs: ['Certificate of Origin', 'Tannery Environmental Compliance Certificate']
  },
  {
    code: '8504.40.90',
    description: 'Static converters (including inverters, power supply units for automatic data processing machines)',
    chapter: '85',
    heading: '8504',
    subheading: '40',
    category: 'Electrical Machinery & Electronics',
    customsDuty: 10.0,
    regulatoryDuty: 0.0,
    vat: 15.0,
    advanceTax: 5.0,
    advanceIncomeTax: 5.0,
    rulesOfOrigin: 'Change in tariff subheading (CTSH) or value-added threshold of 40 percent.',
    requiredDocs: ['Type Approval Certificate', 'CE / FCC Compliance Test Report']
  },
  {
    code: '3004.90.99',
    description: 'Medicaments consisting of mixed or unmixed products for therapeutic or prophylactic uses, in measured doses (other finished pharmaceuticals)',
    chapter: '30',
    heading: '3004',
    subheading: '90',
    category: 'Pharmaceutical Products',
    customsDuty: 10.0,
    regulatoryDuty: 0.0,
    vat: 2.4,
    advanceTax: 5.0,
    advanceIncomeTax: 5.0,
    rulesOfOrigin: 'Chemical synthesis or formulation in certified GMP facility.',
    requiredDocs: ['Drug Administration No Objection Certificate (NOC)', 'Batch Release Certificate', 'Cold Chain Log']
  },
  {
    code: '0901.21.00',
    description: 'Coffee, roasted, not decaffeinated',
    chapter: '09',
    heading: '0901',
    subheading: '21',
    category: 'Agricultural Products',
    customsDuty: 25.0,
    regulatoryDuty: 20.0,
    vat: 15.0,
    advanceTax: 5.0,
    advanceIncomeTax: 5.0,
    rulesOfOrigin: 'Wholly obtained in exporting country.',
    requiredDocs: ['Phytosanitary Certificate', 'Fumigation Certificate', 'Food Safety Authority Clearance']
  },
  {
    code: '8471.30.00',
    description: 'Portable automatic data processing machines, weighing not more than 10 kg, consisting of at least a central processing unit, a keyboard and a display (Laptops)',
    chapter: '84',
    heading: '8471',
    subheading: '30',
    category: 'IT & Computing Hardware',
    customsDuty: 0.0,
    regulatoryDuty: 0.0,
    vat: 15.0,
    advanceTax: 5.0,
    advanceIncomeTax: 5.0,
    rulesOfOrigin: 'Information Technology Agreement (ITA) zero-duty treatment.',
    requiredDocs: ['Manufacturer Authorization Letter', 'Warranty Declaration']
  }
];

function searchHSCode(query) {
  if (!query) return HS_DATABASE;
  const q = query.toLowerCase().trim();
  return HS_DATABASE.filter(item => 
    item.code.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q)
  );
}

function classifyCommodity(text) {
  const lower = typeof text === 'string' ? text.trim().toLowerCase() : '';
  if (!lower) {
    return { match: null, confidence: null, requiresHumanReview: true, rationale: 'Enter a commodity description before requesting a candidate.' };
  }
  
  if (lower.includes('t-shirt') || lower.includes('tshirt') || lower.includes('jersey') || lower.includes('vest')) {
    return { match: HS_DATABASE[0], confidence: null, requiresHumanReview: true, rationale: 'Keyword candidate only. Fiber content, garment construction, wearer, and tariff jurisdiction require review.' };
  }
  if (lower.includes('trouser') || lower.includes('pant') || lower.includes('denim') || lower.includes('shorts')) {
    return { match: HS_DATABASE[1], confidence: null, requiresHumanReview: true, rationale: 'Keyword candidate only. Material, construction, wearer, and tariff jurisdiction require review.' };
  }
  if (lower.includes('shoe') || lower.includes('boot') || lower.includes('footwear') || lower.includes('leather')) {
    return { match: HS_DATABASE[2], confidence: null, requiresHumanReview: true, rationale: 'Keyword candidate only. Product construction, upper and sole materials, and tariff jurisdiction require review.' };
  }
  if (lower.includes('inverter') || lower.includes('converter') || lower.includes('power supply')) {
    return { match: HS_DATABASE[3], confidence: null, requiresHumanReview: true, rationale: 'Keyword candidate only. Electrical specifications and tariff jurisdiction require review.' };
  }
  if (lower.includes('pharma') || lower.includes('medicine') || lower.includes('tablet') || lower.includes('syrup')) {
    return { match: HS_DATABASE[4], confidence: null, requiresHumanReview: true, rationale: 'Keyword candidate only. Ingredients, dosage, packaging, and tariff jurisdiction require review.' };
  }
  if (lower.includes('coffee') || lower.includes('bean') || lower.includes('roast')) {
    return { match: HS_DATABASE[5], confidence: null, requiresHumanReview: true, rationale: 'Keyword candidate only. Product state, composition, and tariff jurisdiction require review.' };
  }
  if (lower.includes('laptop') || lower.includes('notebook') || lower.includes('computer')) {
    return { match: HS_DATABASE[6], confidence: null, requiresHumanReview: true, rationale: 'Keyword candidate only. Product specifications and tariff jurisdiction require review.' };
  }

  return {
    match: null,
    confidence: null,
    requiresHumanReview: true,
    rationale: 'No candidate found in the limited demonstration dataset. No HS code or tariff is inferred.',
  };
}

function calculateTotalDuties(hsItem, invoiceValueUsd, exchangeRateBdt) {
  const value = Number(invoiceValueUsd);
  const exchangeRate = Number(exchangeRateBdt);
  if (!hsItem) throw new TypeError('A candidate HS item is required.');
  if (!Number.isFinite(value) || value <= 0) throw new TypeError('Invoice value must be a positive number.');
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) throw new TypeError('A current, user-supplied BDT exchange rate is required.');

  const assessableValueBdt = value * exchangeRate;
  const cd = (assessableValueBdt * hsItem.customsDuty) / 100;
  const rd = (assessableValueBdt * hsItem.regulatoryDuty) / 100;
  const vatBase = assessableValueBdt + cd + rd;
  const vat = (vatBase * hsItem.vat) / 100;
  const at = (assessableValueBdt * hsItem.advanceTax) / 100;
  const ait = (assessableValueBdt * hsItem.advanceIncomeTax) / 100;
  const totalTaxBdt = cd + rd + vat + at + ait;

  return {
    estimateOnly: true,
    authoritative: false,
    rateSource: null,
    rateEffectiveDate: null,
    exchangeRateBdt: exchangeRate,
    assessableValueBdt: Math.round(assessableValueBdt),
    customsDutyBdt: Math.round(cd),
    regulatoryDutyBdt: Math.round(rd),
    vatBdt: Math.round(vat),
    advanceTaxBdt: Math.round(at),
    advanceIncomeTaxBdt: Math.round(ait),
    totalTaxBdt: Math.round(totalTaxBdt),
    effectiveDutyRatePercent: Number(((totalTaxBdt / assessableValueBdt) * 100).toFixed(2))
  };
}

module.exports = {
  HS_DATABASE,
  searchHSCode,
  classifyCommodity,
  calculateTotalDuties
};
