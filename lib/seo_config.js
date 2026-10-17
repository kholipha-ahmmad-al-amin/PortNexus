// PortNexus : Centralized Technical SEO, AEO & GEO Configuration Engine
// Provides dynamic canonical resolution, OpenGraph/Twitter card generation,
// and Schema.org Universal Entity Knowledge Graphs.
// Adheres strictly to Hallmark anti-slop rules: zero emojis, zero em/en dashes.

const PRIMARY_DOMAIN = 'https://portnexus.equisaas-bd.com';

const SEO_CONFIG = {
  brand: {
    name: 'PortNexus',
    fullName: 'PortNexus Enterprise',
    legalName: 'PortNexus TradeTech Solutions',
    tagline: 'Autonomous Cross-Border Trade Compliance and L/C Audit Engine',
    slogan: 'Trade document screening and evidence management for cross-border transactions.',
    url: PRIMARY_DOMAIN,
    logo: `${PRIMARY_DOMAIN}/og-image.png`,
    emblem: `${PRIMARY_DOMAIN}/favicon.svg`,
    squareLogo: `${PRIMARY_DOMAIN}/logo-square.png`,
    email: 'contact@equisaas-bd.com',
    foundingDate: '2026-01-01',
    industry: 'TradeTech, Financial Technology, Supply Chain Management',
    sameAs: [
      'https://github.com/kholipha-ahmmad-al-amin/PortNexus',
      'https://portnexus.equisaas-bd.com'
    ]
  },

  creator: {
    team: {
      name: 'Team EquiSaaS BD',
      url: 'https://equisaas-bd.com/',
      description: 'Enterprise AI and Software Engineering Team'
    }
  },

  routes: {
    home: {
      path: '/',
      title: 'PortNexus : Autonomous Cross-Border Trade & L/C Audit Engine',
      description: 'Autonomous Cross-Border Trade Compliance and Letter of Credit Audit Engine. Cross-examines commercial invoices, bills of lading, and SWIFT MT700 credits against ICC UCP 600 rules and WCO tariff schedules.',
      canonical: PRIMARY_DOMAIN,
      ogType: 'website',
      keywords: 'TradeTech, Letter of Credit, UCP 600, SWIFT MT700, Customs HS Code, Chattogram Port, Demurrage Prevention, Model Context Protocol, Graph RAG'
    },
    docs: {
      path: '/docs.html',
      title: 'Documentation : PortNexus Enterprise Trade Intelligence & API Reference',
      description: 'Technical documentation, REST API specifications, UCP 600 compliance rules, Model Context Protocol (MCP) integration, and WCO tariff calculation guides.',
      canonical: `${PRIMARY_DOMAIN}/docs.html`,
      ogType: 'article',
      keywords: 'PortNexus API, MCP SSE Endpoint, UCP 600 Rules Engine, Trade Document OCR, WCO HS Code Calculator'
    },
    verify: {
      path: '/verify',
      title: 'Certificate Verification : PortNexus Tamper-Evident Trade Compliance',
      description: 'Cryptographic SHA-256 authenticity verification for PortNexus Pre-Customs Clearance Inspection Certificates. Conforms to ICC UCP 600 and WCO trade standards.',
      canonical: `${PRIMARY_DOMAIN}/verify`,
      ogType: 'website',
      keywords: 'Certificate Verification, Pre-Customs Clearance, SHA-256 Trade Seal, QR Verification'
    }
  },

  defaultMeta: {
    locale: 'en_US',
    themeColor: '#0284c7',
    author: 'Team EquiSaaS BD',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    twitterCard: 'summary_large_image',
    ogImage: `${PRIMARY_DOMAIN}/og-image.png`,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/png',
    ogImageAlt: 'PortNexus Enterprise Autonomous Trade Intelligence Platform'
  }
};

/**
 * Returns dynamic canonical URL ensuring absolute resolution
 */
function getCanonicalUrl(routePath = '/') {
  const cleanPath = routePath.split('?')[0];
  if (cleanPath === '/' || cleanPath === '') {
    return PRIMARY_DOMAIN;
  }
  return `${PRIMARY_DOMAIN}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

/**
 * Generates Schema.org Organization Graph
 */
function getOrganizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${PRIMARY_DOMAIN}/#organization`,
    name: SEO_CONFIG.brand.name,
    legalName: SEO_CONFIG.brand.legalName,
    alternateName: SEO_CONFIG.brand.fullName,
    url: PRIMARY_DOMAIN,
    logo: {
      '@type': 'ImageObject',
      url: SEO_CONFIG.brand.logo,
      width: 1200,
      height: 630
    },
    image: SEO_CONFIG.brand.logo,
    description: SEO_CONFIG.brand.tagline,
    slogan: SEO_CONFIG.brand.slogan,
    sameAs: SEO_CONFIG.brand.sameAs,
    creator: {
      '@type': 'Organization',
      name: SEO_CONFIG.creator.team.name,
      url: SEO_CONFIG.creator.team.url
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'technical support',
      url: `${PRIMARY_DOMAIN}/docs.html`,
      availableLanguage: ['English', 'Bengali']
    }
  };
}

/**
 * Generates Schema.org SoftwareApplication & WebApplication Graph
 */
function getSoftwareApplicationSchema() {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${PRIMARY_DOMAIN}/#softwareapplication`,
    name: SEO_CONFIG.brand.fullName,
    applicationCategory: 'BusinessApplication, FinanceApplication',
    applicationSubCategory: 'TradeTech and Documentary Credit Audit',
    operatingSystem: 'Web Browser, Cloud Edge, Serverless',
    url: PRIMARY_DOMAIN,
    softwareVersion: '2.0.0',
    description: 'Enterprise Autonomous Cross-Border Trade & Letter of Credit (L/C) Audit Engine. Cross-examines multi-document packages against ICC UCP 600 rules and WCO tariff schedules.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Developer Sandbox and Live Commercial Trade Audit Workspace',
      availability: 'https://schema.org/OnlineOnly'
    },
    provider: {
      '@id': `${PRIMARY_DOMAIN}/#organization`
    },
    featureList: [
      'Selected deterministic trade document field checks with human review for unresolved items',
      'SWIFT MT700 ISO 15022 FIN Banking Message Parser',
      'Gemini document extraction and local Tesseract OCR for supported images',
      'Limited keyword HS code candidates and unverified illustrative tariff calculations',
      'Static illustrative trade graph with source verification required',
      'Local keyword reference search with source verification required',
      'HMAC-SHA-256 sealed audit snapshots when evidence persistence is enabled',
      'Model Context Protocol Streamable HTTP endpoint'
    ]
  };
}

/**
 * Generates Schema.org FAQPage Graph
 */
function getFAQPageSchema() {
  return {
    '@type': 'FAQPage',
    '@id': `${PRIMARY_DOMAIN}/#faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What does PortNexus do?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'PortNexus compares selected fields extracted from trade documents and flags missing or differing values for qualified review. It does not decide bank acceptance, guarantee payment, or determine customs clearance.'
        }
      },
      {
        '@type': 'Question',
        name: 'How does PortNexus audit documents under ICC UCP 600 Article 18(c)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'PortNexus can compare extracted invoice and credit descriptions. A difference is routed for qualified review because automated text comparison alone cannot decide whether the descriptions correspond under the credit and applicable banking practice.'
        }
      },
      {
        '@type': 'Question',
        name: 'What does the candidate HS code feature return?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The current sample classifier returns limited keyword candidates. Bundled duty rates are unverified demonstration data and must not be used for a customs declaration.'
        }
      },
      {
        '@type': 'Question',
        name: 'How can autonomous AI assistants connect to PortNexus via Model Context Protocol (MCP)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'PortNexus exposes a stateless Model Context Protocol endpoint at https://portnexus.equisaas-bd.com/api/mcp using Streamable HTTP JSON-RPC. Organization authentication is required for protected operations.'
        }
      },
      {
        '@type': 'Question',
        name: 'What is the PortNexus Pre-Customs Clearance Inspection Certificate?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'When evidence persistence is enabled, PortNexus can produce a PDF with a QR link and HMAC-SHA-256 seal that authenticates a stored audit snapshot. It does not certify customs clearance or guarantee acceptance by a bank.'
        }
      }
    ]
  };
}

/**
 * Generates Schema.org BreadcrumbList Graph
 */
function getBreadcrumbSchema(items = []) {
  const itemListElement = items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url.startsWith('http') ? item.url : `${PRIMARY_DOMAIN}${item.url}`
  }));

  return {
    '@type': 'BreadcrumbList',
    '@id': `${PRIMARY_DOMAIN}/#breadcrumb`,
    itemListElement
  };
}

/**
 * Returns unified JSON-LD graph script tag for HTML injection
 */
function getCompleteRootSchemaGraph() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(),
      getSoftwareApplicationSchema(),
      getFAQPageSchema(),
      {
        '@type': 'WebSite',
        '@id': `${PRIMARY_DOMAIN}/#website`,
        url: PRIMARY_DOMAIN,
        name: SEO_CONFIG.brand.fullName,
        description: SEO_CONFIG.brand.tagline,
        publisher: {
          '@id': `${PRIMARY_DOMAIN}/#organization`
        },
        inLanguage: 'en-US'
      }
    ]
  };

  return JSON.stringify(schema, null, 2);
}

/**
 * Returns docs JSON-LD graph script tag
 */
function getDocsSchemaGraph() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(),
      {
        '@type': 'TechArticle',
        '@id': `${PRIMARY_DOMAIN}/docs.html#article`,
        headline: 'PortNexus Enterprise Trade Intelligence & API Reference',
        description: 'Complete technical documentation, REST API specifications, UCP 600 banking rules engine, and Model Context Protocol (MCP) integration guides.',
        url: `${PRIMARY_DOMAIN}/docs.html`,
        inLanguage: 'en-US',
        mainEntityOfPage: `${PRIMARY_DOMAIN}/docs.html`,
        datePublished: '2026-01-15T00:00:00Z',
        dateModified: '2026-10-17T06:00:00Z',
        author: {
          '@type': 'Organization',
          name: SEO_CONFIG.creator.team.name,
          url: SEO_CONFIG.creator.team.url
        },
        publisher: {
          '@id': `${PRIMARY_DOMAIN}/#organization`
        },
        articleSection: 'TradeTech, API Reference, UCP 600, MCP SSE'
      },
      getBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Documentation', url: '/docs.html' }
      ]),
      getFAQPageSchema()
    ]
  };

  return JSON.stringify(schema, null, 2);
}

module.exports = {
  PRIMARY_DOMAIN,
  SEO_CONFIG,
  getCanonicalUrl,
  getOrganizationSchema,
  getSoftwareApplicationSchema,
  getFAQPageSchema,
  getBreadcrumbSchema,
  getCompleteRootSchemaGraph,
  getDocsSchemaGraph
};
