// Small local keyword-search corpus. It is not a maintained legal database or semantic RAG system.

const TRADE_KNOWLEDGE_CORPUS = [
  {
    document: 'ICC Uniform Customs and Practice for Documentary Credits (UCP 600)',
    section: 'Article 18: Commercial Invoice Standards',
    globalContext: 'ICC UCP 600 rules governing commercial invoices presented under documentary letters of credit worldwide.',
    chunks: [
      {
        chunkId: 'UCP-18-1',
        semanticBoundary: 'Beneficiary and Applicant Identifiers',
        text: 'A commercial invoice must appear on its face to have been issued by the beneficiary (except as provided in article 38 regarding transferable credits), must be made out in the name of the applicant, and must be made out in the same currency as the credit.'
      },
      {
        chunkId: 'UCP-18-2',
        semanticBoundary: 'Goods Description Review Note',
        text: 'Article 18(c) addresses correspondence between the goods description in a commercial invoice and the credit. This local note does not establish that the wording must be character-identical. Check the current credit, applicable ICC materials, and the examining bank practice.'
      }
    ]
  },
  {
    document: 'ICC Uniform Customs and Practice for Documentary Credits (UCP 600)',
    section: 'Article 20: Bill of Lading Requirements',
    globalContext: 'ICC UCP 600 marine transport document examination standards for international ocean freight.',
    chunks: [
      {
        chunkId: 'UCP-20-1',
        semanticBoundary: 'Clean On-Board Notation',
        text: 'A bill of lading, however named, must appear to indicate that the goods have been loaded on board or shipped on a named vessel at the port of loading stated in the credit. The date of issuance of the bill of lading will be deemed to be the date of shipment unless it contains a separate dated on-board notation.'
      },
      {
        chunkId: 'UCP-20-2',
        semanticBoundary: 'Designated Ports and Transshipment Clauses',
        text: 'The bill of lading must indicate shipment from the port of loading to the port of discharge stated in the credit. Even if transshipment will or may take place, a through bill of lading is acceptable provided the entire carriage is covered by one and the same bill of lading.'
      }
    ]
  },
  {
    document: 'National Board of Revenue (NBR) Customs Act & Tariff Schedule',
    section: 'First Schedule: General Rules for the Interpretation (GRI) of the Harmonized System',
    globalContext: 'Bangladesh National Board of Revenue legal rules for classifying imported and exported goods.',
    chunks: [
      {
        chunkId: 'NBR-GRI-1',
        semanticBoundary: 'Rule 1: Terms of Headings Primacy',
        text: 'The titles of Sections, Chapters and sub-Chapters are provided for ease of reference only; for legal purposes, classification shall be determined according to the terms of the headings and any relative Section or Chapter Notes and, provided such headings or Notes do not otherwise require, according to the provisions of the subsequent Rules.'
      },
      {
        chunkId: 'NBR-GRI-3',
        semanticBoundary: 'Rule 3: Composite Goods & Essential Character',
        text: 'When by application of Rule 2(b) or for any other reason, goods are, prima facie, classifiable under two or more headings, classification shall be effected as follows: mixtures, composite goods consisting of different materials or made up of different components shall be classified as if they consisted of the material or component which gives them their essential character.'
      }
    ]
  },
  {
    document: 'European Union Carbon Border Adjustment Mechanism (EU CBAM)',
    section: 'Regulation (EU) 2023/956 on Embedded Emissions',
    globalContext: 'EU trade regulation requiring embedded carbon declarations on imported goods entering the single market.',
    chunks: [
      {
        chunkId: 'EU-CBAM-1',
        semanticBoundary: 'Reporting Obligations for Energy-Intensive Imports',
        text: 'Importers into the European Union of covered goods (cement, iron and steel, aluminium, fertilizers, electricity and hydrogen) must report the direct and indirect greenhouse gas emissions embedded in their imported goods during the transitional phase without financial liability, transitioning to mandatory CBAM certificate surrender in the definitive period.'
      }
    ]
  }
];

// Prepend global context to each chunk (Anthropic-style Contextual Retrieval)
const CONTEXTUALIZED_CHUNKS = [];
TRADE_KNOWLEDGE_CORPUS.forEach(doc => {
  doc.chunks.forEach(c => {
    CONTEXTUALIZED_CHUNKS.push({
      id: c.chunkId,
      document: doc.document,
      section: doc.section,
      semanticBoundary: c.semanticBoundary,
      rawText: c.text,
      // Contextual RAG: Context summary prepended before chunk content
      contextualizedContent: `[LOCAL REFERENCE - VERIFY AGAINST A CURRENT PRIMARY SOURCE: ${doc.document} | ${doc.section} | Summary: ${doc.globalContext}] Content: ${c.text}`
    });
  });
});

function searchContextualRAG(query) {
  if (typeof query !== 'string' || !query.trim() || query.length > 500) return [];
  const q = query.toLowerCase().trim();
  const words = q.split(/[^a-z0-9]+/).filter(w => w.length > 2);

  // Score chunks by keyword relevance and semantic boundary match
  const scored = CONTEXTUALIZED_CHUNKS.map(chunk => {
    let score = 0;
    const content = (chunk.contextualizedContent + ' ' + chunk.semanticBoundary).toLowerCase();
    const tokens = new Set(content.split(/[^a-z0-9]+/).filter(Boolean));
    
    words.forEach(word => {
      if (tokens.has(word)) {
        score += 10;
      }
    });

    if (content.includes(q)) {
      score += 30;
    }

    return { ...chunk, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => ({ ...item, retrievalMethod: 'keyword', sourceUrl: null, requiresSourceVerification: true }));
}

module.exports = {
  TRADE_KNOWLEDGE_CORPUS,
  CONTEXTUALIZED_CHUNKS,
  searchContextualRAG
};
