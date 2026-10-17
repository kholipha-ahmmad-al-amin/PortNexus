# PortNexus : Autonomous Cross-Border Trade & L/C Audit Engine

> Enterprise-grade TradeTech platform for global exporters, freight forwarders, and trade finance banks. Autonomously cross-examines multi-document export packages against ICC UCP 600 rules, predicts WCO HS Codes, parses SWIFT MT700 banking messages, generates verifiable PDF certificates, and eliminates customs demurrage and payment rejections.

[![Live Platform](https://img.shields.io/badge/Platform-Live%20Production-0284c7?style=flat-square)](https://portnexus.equisaas-bd.com)
[![Documentation](https://img.shields.io/badge/Docs-Canonical%20API-0f172a?style=flat-square)](https://portnexus.equisaas-bd.com/docs.html)
[![WCAG 2.1 AAA](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AAA-059669?style=flat-square)](https://portnexus.equisaas-bd.com)
[![Model Context Protocol](https://img.shields.io/badge/MCP-SSE%20Bridge-6366f1?style=flat-square)](https://portnexus.equisaas-bd.com/api/mcp/sse)

---

## 1. Executive Summary & Market Problem

In international merchandise trade, cross-border shipments account for over $25 Trillion annually. In major manufacturing hubs like Bangladesh, trade finance exceeds $50 Billion each year, with Readymade Garments (RMG) representing over 84 percent of national exports.

Every single export consignment requires between 15 and 25 distinct documents:
* Commercial Invoice
* Ocean Bill of Lading (B/L)
* Packing List
* Certificate of Origin (GSP Form A / REX)
* Bank Letter of Credit (L/C, issued via SWIFT MT700)
* Inspection & Fumigation Certificates

### The Core Problem
Under the International Chamber of Commerce (ICC) **Uniform Customs and Practice for Documentary Credits (UCP 600)** rules:
* **Article 14:** Banks must examine a presentation to determine whether or not the documents appear on their face to constitute a compliant presentation.
* **Article 18(c):** The description of goods in the commercial invoice must strictly correspond with the description in the credit. A single spelling difference or missing punctuation mark is legal grounds for refusal of payment.
* **Industry reality:** Over 30 percent of trade finance presentations are initially rejected due to discrepancies, incurring demurrage penalties averaging $3,000 to $10,000 per container per week at destination ports (Rotterdam, Hamburg, New York) and freezing supplier working capital.

**PortNexus** replaces manual eyes-on paper review with an automated verification pipeline that cross-examines document packages in seconds, validates SWIFT MT700 messages, and generates cryptographically signed compliance certificates before cargo leaves port.

---

## 2. Core Platform Pillars

### Pillar 1: Multimodal Document OCR & Extraction
* **Hybrid Extraction Engine:** Ingests scanned PDF files, photographs, and document images.
* **Cloud & Local Multimodal AI:** Integrates Google Gemini API for high-density document visual understanding with an automatic local Tesseract.js fallback for offline or air-gapped operations.
* **Field Mapping:** Reconciles disparate vendor invoice formats into normalized UCP 600 audit objects.

### Pillar 2: SWIFT MT700 ISO 15022 Parser
* **Native FIN Message Parser:** Reads raw SWIFT MT700 text received from issuing banks.
* **Standard Field Extraction:** Parses standard tags including `:20:` (Reference), `:40A:` (Form of Credit), `:31C:` (Issue Date), `:31D:` (Expiry Date), `:32B:` (Amount & Currency), `:44A:`/`:44B:` (Ports), `:44C:` (Shipment Limit), `:45A:` (Goods Description), `:46A:` (Documents Required), `:50:` (Applicant), and `:59:` (Beneficiary).
* **Automated Audit Pipeline:** Feeds extracted parameters directly into the UCP 600 validation engine with zero manual typing.

### Pillar 3: Downloadable PDF Compliance Certificates
* **Official Export Documentation:** Generates a professional pre-shipment compliance certificate formatted according to international trade standards.
* **Cryptographic Tamper-Evidence:** Each certificate is sealed with an immutable SHA-256 digital hash calculated from the exact audit parameters.
* **Live Online QR Verification:** Includes an embedded high-resolution QR code and verification URL (e.g. `/verify?id=PN-CERT-2026-XXXXX`), allowing customs authorities, freight forwarders, and bank officers to instantly verify certificate authenticity.

### Pillar 4: Multi-Tenant Persistent Database
* **PostgreSQL Architecture:** Powered by Supabase cloud database with relational multi-tenant isolation.
* **Audit Trail Preservation:** Stores consignments, audit reports, document vaults, and HS classification logs with unique organization API key scoping.
* **Enterprise Reporting:** Historical compliance rate analytics, discrepancy frequency metrics, and regulatory audit readiness.

---

## 3. Advanced AI & Knowledge Architecture

### Contextual RAG Legal Corpus
* **Document Coverage:** Indexes ICC UCP 600 Articles 1 through 39, WCO General Rules of Interpretation (GRI), and National Board of Revenue (NBR) Customs Acts.
* **Contextual Prefixing:** Implements document context prefixing to ensure retrieved text chunks retain full legal context (e.g., qualifying which article governs invoice goods descriptions vs. transport document descriptions).

### Graph RAG Trade Corridor Navigator
* **Topology:** Multi-hop knowledge graph linking Commodities, HS Codes, Origin/Destination Ports, Free Trade Agreements, and Environmental Regulations.
* **Traversals:** Maps shipments from origin ports (Chattogram) to international hubs (Rotterdam, Hamburg, New York), evaluating preferential tariffs (EU EBA/GSP) and environmental directives (EU CBAM) across connected nodes.

### Model Context Protocol (MCP) Bridge
* **Standard Interface:** Exposes platform capabilities via Server-Sent Events (SSE) compliant with Anthropic Model Context Protocol standards at `/api/mcp/sse`.
* **Exposed Tools:**
  * `audit_letter_of_credit`: Multi-document cross-examination against 14 UCP 600 banking rules.
  * `classify_hs_code`: Predicts 8-digit HS Code, assessable value, and statutory tariffs.
  * `query_trade_graph`: Multi-hop corridor discovery across ports and trade pacts.
  * `search_trade_regulations`: Semantic search across customs acts and international trade laws.
  * `parse_swift_mt700`: Parses raw SWIFT FIN messages into structured JSON.

### Air-Gapped Local Model Support
* **Data Sovereignty:** Optional local LLM daemon execution via Ollama for sensitive trade secrets, financial records, and proprietary client pricing.
* **Supported Models:** DeepSeek-R1-Distill-Qwen-14B and Qwen2.5-Coder-7B running completely offline with zero external network exfiltration.

---

## 4. UI/UX Design System & Accessibility

PortNexus implements an enterprise **Light Maritime** design system adhering to strict corporate readability and accessibility standards:
* **Background Palette:** High-clarity off-white (`#f8fafc`) with pure-white card surfaces (`#ffffff`).
* **Maritime Brand Accents:** Deep Navy (`#0f172a`), Ocean Sky (`#0284c7`), and Nautical Slate (`#334155`).
* **Status Badges:** Emerald (`#059669`) for compliance, Amber (`#b45309`) for review warnings, and Red (`#dc2626`) for critical bank rejection risks.
* **WCAG 2.1 AAA Accessibility:** Fully verified with Playwright and Axe-Core automated testing:
  * Text contrast ratios exceed 7:1 across all UI elements.
  * Minimum 44px by 44px interactive touch targets.
  * Full keyboard accessibility and screen-reader compliant ARIA roles.
  * Clean typography with zero decorative emojis, zero AI slop, and strict layout stability.

---

## 5. Getting Started & Self-Hosting

### Live Endpoints
* **Platform Application:** [https://portnexus.equisaas-bd.com](https://portnexus.equisaas-bd.com)
* **API Documentation:** [https://portnexus.equisaas-bd.com/docs.html](https://portnexus.equisaas-bd.com/docs.html)
* **System Health Check:** [https://portnexus.equisaas-bd.com/api/health](https://portnexus.equisaas-bd.com/api/health)
* **MCP SSE Endpoint:** [https://portnexus.equisaas-bd.com/api/mcp/sse](https://portnexus.equisaas-bd.com/api/mcp/sse)

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/kholipha-ahmmad-al-amin/PortNexus.git
cd PortNexus

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your optional GEMINI_API_KEY and SUPABASE credentials

# 4. Start local development server
npm start
```

Access the local workspace at `http://localhost:3000`.

### Automated Testing
To run the automated Playwright accessibility and contrast audit:
```bash
npm run audit:contrast
```

---

## 6. Model Context Protocol (MCP) Configuration

To connect PortNexus tools to your AI agent (Claude Desktop, Cursor, Gemini), add the following configuration:

```json
{
  "mcpServers": {
    "portnexus": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://portnexus.equisaas-bd.com/api/mcp/sse"]
    }
  }
}
```

---

## 7. License & Compliance

PortNexus is developed for international commercial trade operations. All Letter of Credit verification rules are modeled on ICC UCP 600 publication standards. Tariff calculations reference World Customs Organization Harmonized System nomenclatures.
