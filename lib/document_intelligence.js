// PortNexus :: Document Intelligence Engine
// Pillar 1: Hybrid OCR + Gemini Multimodal Document Parser
// Supports: Digital PDF (text layer), Scanned Images, SWIFT MT700 raw text

const fs = require('fs');
const path = require('path');

// Dynamic imports for optional heavy deps
async function getPdfParse() {
  try { return require('pdf-parse'); } catch { return null; }
}
async function getTesseract() {
  try { return require('tesseract.js'); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────
//  LAYER 1: Digital PDF parser (fastest, zero AI cost)
// ─────────────────────────────────────────────────────────────
async function extractFromDigitalPDF(buffer) {
  const pdfParse = await getPdfParse();
  if (!pdfParse) throw new Error('pdf-parse not available');
  const data = await pdfParse(buffer);
  return {
    method: 'digital_pdf',
    text: data.text,
    pageCount: data.numpages,
    confidence: null,
  };
}

// ─────────────────────────────────────────────────────────────
//  LAYER 2: Tesseract OCR (open-source, runs locally, free)
// ─────────────────────────────────────────────────────────────
async function extractWithTesseract(buffer, mimeType) {
  const { createWorker } = await getTesseract();
  const worker = await createWorker('eng');
  try {
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const { data } = await worker.recognize(dataUrl);
    return {
      method: 'tesseract_ocr',
      text: data.text,
      confidence: data.confidence / 100,
      words: data.words?.length || 0,
    };
  } finally {
    await worker.terminate();
  }
}

// ─────────────────────────────────────────────────────────────
//  LAYER 3: Gemini Flash Multimodal (smart structured extraction)
//  Uses Google AI Studio free tier: 15 RPM, 1500/day
// ─────────────────────────────────────────────────────────────
async function extractWithGemini(buffer, mimeType, apiKey) {
  if (!apiKey) {
    return { method: 'gemini_skipped', text: null, reason: 'GEMINI_API_KEY not configured' };
  }

  const { GoogleGenAI } = require('@google/genai');
  const client = new GoogleGenAI({ apiKey });

  const base64Data = buffer.toString('base64');

  const prompt = `You are a trade finance document extraction engine. 
Extract all structured data from this trade document (L/C, Invoice, Bill of Lading, Packing List, or Certificate of Origin).

Return a JSON object with these fields (leave null if not found):
{
  "document_type": "LC | INVOICE | BILL_OF_LADING | PACKING_LIST | CERTIFICATE_OF_ORIGIN | UNKNOWN",
  "lc_number": null,
  "invoice_number": null,
  "bl_number": null,
  "issue_date": null,
  "on_board_date": null,
  "expiry_date": null,
  "applicant": null,
  "beneficiary": null,
  "buyer": null,
  "seller": null,
  "issuing_bank": null,
  "currency": null,
  "amount": null,
  "goods_description": null,
  "port_of_loading": null,
  "port_of_discharge": null,
  "latest_shipment_date": null,
  "presentation_period_days": null,
  "total_quantity": null,
  "total_weight_kg": null,
  "total_cartons": null,
  "hs_code": null,
  "incoterms": null,
  "documents_required": null,
  "raw_text_summary": "brief summary of the document"
}

Return ONLY the JSON. No markdown fences. No explanation.`;

  try {
    const response = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt },
          ],
        },
      ],
    });

    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return {
        method: 'gemini_parse_error',
        structured: null,
        confidence: null,
        error: 'The model response was not valid JSON. No structured fields were accepted.',
      };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        method: 'gemini_parse_error',
        structured: null,
        confidence: null,
        error: 'The model response did not contain a JSON object.',
      };
    }

    return {
      method: 'gemini_flash_multimodal',
      structured: parsed,
      confidence: null,
      confidenceNote: 'Field-level extraction confidence is not calibrated.',
    };
  } catch (err) {
    return {
      method: 'gemini_error',
      error: err.message,
      confidence: null,
    };
  }
}

// ─────────────────────────────────────────────────────────────
//  MAIN ORCHESTRATOR: Try layers in order, merge results
// ─────────────────────────────────────────────────────────────
async function processDocument(buffer, originalName, mimeType, geminiApiKey) {
  const result = {
    filename: originalName,
    mimeType,
    fileSize: buffer.length,
    layers: [],
    extracted: {},
    documentType: 'UNKNOWN',
    confidence: 0,
    processedAt: new Date().toISOString(),
  };

  const ext = path.extname(originalName).toLowerCase();
  const isPDF = mimeType === 'application/pdf' || ext === '.pdf';
  const isImage = mimeType.startsWith('image/') || ['.jpg','.jpeg','.png','.tiff','.tif','.webp'].includes(ext);

  // Layer 1: Digital PDF
  if (isPDF) {
    try {
      const layer1 = await extractFromDigitalPDF(buffer);
      result.layers.push(layer1);

      if (layer1.text && layer1.text.trim().length > 100) {
        // Good digital PDF, we have the text
        result.extracted.rawText = layer1.text;
        result.confidence = null;

        // Now use Gemini to structure it if key available
        if (geminiApiKey) {
          const geminiResult = await extractWithGemini(buffer, mimeType, geminiApiKey);
          result.layers.push(geminiResult);
          if (geminiResult.structured) {
            result.extracted.structured = geminiResult.structured;
            result.documentType = geminiResult.structured.document_type || 'UNKNOWN';
          }
        }
      } else {
        // Tesseract.js accepts image inputs, not this raw PDF buffer. Do not report
        // a failed PDF-to-image conversion as if local OCR had succeeded.
        if (geminiApiKey) {
          const geminiResult = await extractWithGemini(buffer, 'application/pdf', geminiApiKey);
          result.layers.push(geminiResult);
          if (geminiResult.structured) {
            result.extracted.structured = geminiResult.structured;
            result.documentType = geminiResult.structured.document_type || 'UNKNOWN';
          }
        } else {
          result.layers.push({
            method: 'scanned_pdf_ocr_unavailable',
            error: 'Local OCR requires rendering each PDF page to an image. No PDF renderer is configured.',
          });
        }
      }
    } catch (err) {
      result.layers.push({ method: 'pdf_error', error: err.message });
    }
  }

  // Layer 2: Image OCR path
  if (isImage) {
    try {
      const ocrResult = await extractWithTesseract(buffer, mimeType);
      result.layers.push(ocrResult);
      result.extracted.rawText = ocrResult.text;
      result.confidence = ocrResult.confidence;

      // Layer 3: Gemini multimodal for images
      if (geminiApiKey) {
        const geminiResult = await extractWithGemini(buffer, mimeType, geminiApiKey);
        result.layers.push(geminiResult);
        if (geminiResult.structured) {
          result.extracted.structured = geminiResult.structured;
          result.documentType = geminiResult.structured.document_type || 'UNKNOWN';
        }
      }
    } catch (err) {
      result.layers.push({ method: 'ocr_error', error: err.message });
    }
  }

  // Plain text (SWIFT MT700, copy-paste)
  if (!isPDF && !isImage) {
    const text = buffer.toString('utf8');
    result.extracted.rawText = text;
    result.confidence = null;
    result.layers.push({ method: 'raw_text', length: text.length });
  }

  return result;
}

// Map structured Gemini output -> ucp600 compatible lc/invoice/bl objects
function mapToAuditDocuments(extracted) {
  const s = extracted.structured || {};
  const docs = {};

  if (s.document_type === 'LC' || s.lc_number) {
    docs.lc = {
      lcNumber: s.lc_number,
      issueDate: s.issue_date,
      expiryDate: s.expiry_date,
      applicant: s.applicant || s.buyer,
      beneficiary: s.beneficiary || s.seller,
      currency: s.currency,
      amount: typeof s.amount === 'string' ? parseFloat(s.amount.replace(/[^0-9.]/g,'')) : s.amount,
      portOfLoading: s.port_of_loading,
      portOfDischarge: s.port_of_discharge,
      latestShipmentDate: s.latest_shipment_date,
      presentationPeriodDays: s.presentation_period_days || 21,
      goodsDescription: s.goods_description,
      documentsRequired: s.documents_required,
    };
  }

  if (s.document_type === 'INVOICE' || s.invoice_number) {
    docs.invoice = {
      invoiceNumber: s.invoice_number,
      invoiceDate: s.issue_date,
      buyer: s.buyer || s.applicant,
      seller: s.seller || s.beneficiary,
      currency: s.currency,
      amount: typeof s.amount === 'string' ? parseFloat(s.amount.replace(/[^0-9.]/g,'')) : s.amount,
      goodsDescription: s.goods_description,
      totalCartons: s.total_cartons,
      totalWeightKg: s.total_weight_kg,
    };
  }

  if (s.document_type === 'BILL_OF_LADING' || s.bl_number) {
    docs.bl = {
      blNumber: s.bl_number,
      portOfLoading: s.port_of_loading,
      portOfDischarge: s.port_of_discharge,
      onBoardDate: s.on_board_date,
      totalCartons: s.total_cartons,
    };
  }

  if (s.document_type === 'PACKING_LIST') {
    docs.packingList = {
      totalCartons: s.total_cartons,
      totalWeightKg: s.total_weight_kg,
    };
  }

  return docs;
}

module.exports = { processDocument, mapToAuditDocuments };
