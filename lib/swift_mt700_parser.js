// PortNexus :: SWIFT MT700 L/C Message Parser
// ISO 15022 FIN Message Standard - Trade Finance (Documentary Credits)
// Parses raw SWIFT messages into structured JSON for UCP 600 audit engine.

const SWIFT_FIELD_MAP = {
  '15A': 'sequence_a_general',
  '20':  'lc_reference_number',
  '23':  'reference_to_preannotation',
  '31C': 'issue_date',
  '31D': 'expiry_date_and_place',
  '40A': 'form_of_dc',
  '40E': 'applicable_rules',
  '41A': 'available_with_by_swift_bic',
  '41D': 'available_with_by_name',
  '42A': 'drawee_bank_swift_bic',
  '42C': 'drafts_at',
  '42D': 'drawee_bank_name',
  '43P': 'partial_shipments',
  '43T': 'transhipment',
  '44A': 'port_of_loading',
  '44B': 'port_of_discharge',
  '44C': 'latest_date_of_shipment',
  '44D': 'shipment_period',
  '44E': 'port_of_loading_airport',
  '44F': 'port_of_discharge_airport',
  '45A': 'goods_description',
  '46A': 'documents_required',
  '47A': 'additional_conditions',
  '48':  'presentation_period_days',
  '49':  'confirmation_instructions',
  '50':  'applicant',
  '51A': 'applicant_bank_swift',
  '52A': 'issuing_bank_swift',
  '52D': 'issuing_bank_name',
  '53A': 'reimbursing_bank_swift',
  '57A': 'advising_bank_swift',
  '57D': 'advising_bank_name',
  '59':  'beneficiary',
  '32B': 'currency_and_amount',
  '39A': 'percentage_credit_amount_tolerance',
  '39B': 'maximum_credit_amount',
  '71B': 'charges',
  '72':  'sender_to_receiver_information',
  '77C': 'details_of_charge',
  '78':  'instructions_to_paying_accepting_negotiating_bank',
  '79':  'narrative_description_of_goods',
};

function parseSWIFTMT700(rawMessage) {
  if (!rawMessage || typeof rawMessage !== 'string') {
    throw new Error('Raw SWIFT message text is required.');
  }

  const cleaned = rawMessage
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  const result = {
    _raw: rawMessage,
    _parsed_at: new Date().toISOString(),
    _message_type: 'MT700',
    _standard: 'ISO 15022',
    fields: {},
    errors: [],
    warnings: [],
  };

  // Split into field blocks using SWIFT tag format :NN[A-Z]?:
  const fieldPattern = /:([0-9]{2}[A-Z]?):([\s\S]*?)(?=:[0-9]{2}[A-Z]?:|$)/g;
  let match;
  let hasFields = false;

  while ((match = fieldPattern.exec(cleaned)) !== null) {
    const tag = match[1];
    const value = match[2].trim();
    const fieldName = SWIFT_FIELD_MAP[tag] || `field_${tag}`;
    hasFields = true;

    // Special parsers for compound fields
    if (tag === '32B') {
      const ccyMatch = value.match(/^([A-Z]{3})([\d,\.]+)$/);
      if (ccyMatch) {
        result.fields.currency = ccyMatch[1];
        result.fields.amount = parseFloat(ccyMatch[2].replace(/,/g, ''));
        result.fields[fieldName] = value;
      } else {
        result.fields[fieldName] = value;
        result.warnings.push(`Could not parse :32B: currency/amount from: "${value}"`);
      }
    } else if (tag === '31D') {
      // Format: YYMMDD + Place
      const dateMatch = value.match(/^(\d{6})\s*(.+)?$/s);
      if (dateMatch) {
        const rawDate = dateMatch[1];
        result.fields.expiry_date = `20${rawDate.slice(0,2)}-${rawDate.slice(2,4)}-${rawDate.slice(4,6)}`;
        result.fields.expiry_place = (dateMatch[2] || '').trim();
        result.fields[fieldName] = value;
      } else {
        result.fields[fieldName] = value;
      }
    } else if (tag === '31C') {
      const rawDate = value.trim();
      if (/^\d{6}$/.test(rawDate)) {
        result.fields.issue_date = `20${rawDate.slice(0,2)}-${rawDate.slice(2,4)}-${rawDate.slice(4,6)}`;
      }
      result.fields[fieldName] = value;
    } else if (tag === '44C') {
      const rawDate = value.trim();
      if (/^\d{6}$/.test(rawDate)) {
        result.fields.latest_shipment_date = `20${rawDate.slice(0,2)}-${rawDate.slice(2,4)}-${rawDate.slice(4,6)}`;
      }
      result.fields[fieldName] = value;
    } else if (tag === '48') {
      const days = parseInt(value.trim());
      if (!isNaN(days)) {
        result.fields.presentation_period_days = days;
      }
      result.fields[fieldName] = value;
    } else {
      result.fields[fieldName] = value;
    }
  }

  if (!hasFields) {
    // Try alternative format without standard SWIFT wrapping
    result.errors.push(
      'No standard SWIFT field tags (:NNA:) detected. ' +
      'Ensure the message starts with tags like :20: :31D: :32B: etc.'
    );
  }

  // Build a structured lc object compatible with ucp600_rules.js
  result.lc = {
    lcNumber:              result.fields.lc_reference_number || null,
    issueDate:             result.fields.issue_date || null,
    expiryDate:            result.fields.expiry_date || null,
    expiryPlace:           result.fields.expiry_place || null,
    formOfDC:              result.fields.form_of_dc || 'IRREVOCABLE',
    applicant:             result.fields.applicant || null,
    beneficiary:           result.fields.beneficiary || null,
    issuingBank:           result.fields.issuing_bank_name || result.fields.issuing_bank_swift || null,
    advisingBank:          result.fields.advising_bank_name || result.fields.advising_bank_swift || null,
    currency:              result.fields.currency || null,
    amount:                result.fields.amount || null,
    portOfLoading:         result.fields.port_of_loading || null,
    portOfDischarge:       result.fields.port_of_discharge || null,
    latestShipmentDate:    result.fields.latest_shipment_date || null,
    presentationPeriodDays: result.fields.presentation_period_days || 21,
    goodsDescription:      result.fields.goods_description || null,
    documentsRequired:     result.fields.documents_required || null,
    additionalConditions:  result.fields.additional_conditions || null,
    partialShipments:      result.fields.partial_shipments || null,
    transhipment:          result.fields.transhipment || null,
    charges:               result.fields.charges || null,
  };

  return result;
}

// Validates that a parsed MT700 has minimum required fields
function validateParsedMT700(parsed) {
  const required = ['lcNumber', 'applicant', 'beneficiary', 'currency', 'amount', 'goodsDescription'];
  const missing = required.filter(f => !parsed.lc[f]);
  return {
    isValid: missing.length === 0,
    missingFields: missing,
  };
}

// Generate a sample MT700 for testing
function getSampleMT700() {
  return `{1:F01JANBBDDHDXXXX0000000000}{2:O7000000261014JANBBDDHDXXXX00000000002610140000N}{4:
:20:LC-2026-DHAKA-9081
:31C:261014
:40A:IRREVOCABLE
:40E:UCP LATEST VERSION
:31D:261130ROTTERDAM
:50:ZARA RETAIL DISTRIBUTION S.A.
CALLE INDUSTRIA 1, ARTEIXO
15142 A CORUNA, SPAIN
:59:APEX APPAREL AND KNITTING MILLS LTD
PLOT 15, SECTION 7, MIRPUR
DHAKA 1216, BANGLADESH
:32B:USD185000,
:41D:ANY BANK BY NEGOTIATION
:44A:CHITTAGONG (CHATTOGRAM), BANGLADESH
:44B:ROTTERDAM, NETHERLANDS
:44C:261115
:45A:100% COTTON KNITTED T-SHIRTS
AS PER PROFORMA INVOICE NO. PI-2026-0441 DATED 10 OCTOBER 2026
:46A:FULL SET OF CLEAN ON-BOARD BILLS OF LADING MADE OUT TO ORDER
COMMERCIAL INVOICE IN TRIPLICATE
PACKING LIST IN TRIPLICATE
CERTIFICATE OF ORIGIN (GSP FORM A/REX)
INSPECTION CERTIFICATE
:47A:ALL DOCUMENTS TO BE PRESENTED IN ENGLISH
THIRD PARTY DOCUMENTS ACCEPTABLE
:48:21
:49:WITHOUT
-}`;
}

module.exports = { parseSWIFTMT700, validateParsedMT700, getSampleMT700, SWIFT_FIELD_MAP };
