// PortNexus : Comprehensive SEO, AEO, GEO & Schema.org Verification Script
// Audits JSON-LD syntax, canonical tags, OpenGraph, Twitter cards, robots.txt, sitemap.xml, llms.txt,
// and ensures zero em/en-dashes and zero emojis across codebase.

const fs = require('fs');
const path = require('path');

let errors = 0;
let passes = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passes++;
  } else {
    console.error(`[FAIL] ${message}`);
    errors++;
  }
}

// 1. Check robots.txt
const robotsPath = path.join(__dirname, '..', 'public', 'robots.txt');
assert(fs.existsSync(robotsPath), 'robots.txt exists in /public');
const robotsContent = fs.readFileSync(robotsPath, 'utf8');
assert(robotsContent.includes('Sitemap: https://portnexus.equisaas-bd.com/sitemap.xml'), 'robots.txt contains sitemap directive');
assert(robotsContent.includes('User-agent: GPTBot') && robotsContent.includes('User-agent: ClaudeBot'), 'robots.txt includes explicit AI crawlers');

// 2. Check sitemap.xml
const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
assert(fs.existsSync(sitemapPath), 'sitemap.xml exists in /public');
const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
assert(sitemapContent.includes('<loc>https://portnexus.equisaas-bd.com/</loc>'), 'sitemap.xml contains root domain');
assert(sitemapContent.includes('<loc>https://portnexus.equisaas-bd.com/docs.html</loc>'), 'sitemap.xml contains docs route');
assert(sitemapContent.includes('<loc>https://portnexus.equisaas-bd.com/llms.txt</loc>'), 'sitemap.xml contains llms.txt');

// 3. Check llms.txt & llms-full.txt
const llmsPath = path.join(__dirname, '..', 'public', 'llms.txt');
assert(fs.existsSync(llmsPath), 'llms.txt exists in /public');
const llmsContent = fs.readFileSync(llmsPath, 'utf8');
assert(llmsContent.includes('# PortNexus'), 'llms.txt contains brand name');
assert(llmsContent.includes('does not decide bank acceptance') && llmsContent.includes('unverified'), 'llms.txt states current limitations');

const llmsFullPath = path.join(__dirname, '..', 'public', 'llms-full.txt');
assert(fs.existsSync(llmsFullPath), 'llms-full.txt exists in /public');
const llmsFullContent = fs.readFileSync(llmsFullPath, 'utf8');
assert(llmsFullContent.includes('Eight selected field-comparison groups'), 'llms-full.txt describes the implemented screening scope');
assert(llmsFullContent.includes('PERSIST_AUDIT_EVIDENCE'), 'llms-full.txt documents evidence persistence configuration');

// 4. Check JSON-LD in index.html & docs.html
function testJsonLd(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const startTag = '<script type="application/ld+json">';
  const endTag = '</script>';
  const startIdx = content.indexOf(startTag);
  assert(startIdx !== -1, `${path.basename(filePath)} contains application/ld+json tag`);

  if (startIdx !== -1) {
    const jsonStr = content.substring(startIdx + startTag.length, content.indexOf(endTag, startIdx)).trim();
    try {
      const parsed = JSON.parse(jsonStr);
      assert(parsed['@context'] === 'https://schema.org', `${path.basename(filePath)} JSON-LD has valid @context`);
      assert(Array.isArray(parsed['@graph']) && parsed['@graph'].length > 0, `${path.basename(filePath)} JSON-LD contains entity @graph`);
    } catch (err) {
      assert(false, `${path.basename(filePath)} JSON-LD parse error: ${err.message}`);
    }
  }
}
testJsonLd(path.join(__dirname, '..', 'public', 'index.html'));
testJsonLd(path.join(__dirname, '..', 'public', 'docs.html'));

// 5. Check Canonical, OpenGraph & Attribution
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
assert(indexHtml.includes('<link rel="canonical" href="https://portnexus.equisaas-bd.com">'), 'index.html has a canonical tag');
assert(indexHtml.includes('property="og:image"') && indexHtml.includes('name="twitter:card"'), 'index.html has OpenGraph & Twitter tags');
assert(indexHtml.includes('Team EquiSaaS BD') && indexHtml.includes('https://equisaas-bd.com/'), 'index.html includes Team EquiSaaS BD footer attribution');
assert(indexHtml.includes('class="answer-snippet"'), 'index.html features AEO Answer Snippet box');
assert(indexHtml.includes('class="comparison-table"'), 'index.html features SERP comparison table');
assert(indexHtml.includes('id="faq"'), 'index.html features Untapped Demand FAQ section');
assert(!indexHtml.includes('aggregateRating'), 'index.html does not publish unverified review ratings');
assert(!indexHtml.includes('pn-7959742b0a444599b2387548c80216b2'), 'index.html does not expose the retired demo key');
assert(indexHtml.includes('https://portnexus.equisaas-bd.com/api/mcp'), 'index.html documents the Streamable HTTP endpoint');
assert(!indexHtml.includes('/api/mcp/sse'), 'index.html does not advertise the retired SSE placeholder');

// 6. Strict Hallmark Zero-Slop Rule: Zero em/en-dashes, Zero Emojis
const filesToAudit = [
  'public/index.html',
  'public/docs.html',
  'public/styles.css',
  'public/robots.txt',
  'public/sitemap.xml',
  'public/llms.txt',
  'public/llms-full.txt',
  'lib/seo_config.js',
  'lib/verification_view.js',
  'server.js'
];

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const dashRegex = /[\u2013\u2014]/;

filesToAudit.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    const text = fs.readFileSync(fullPath, 'utf8');
    assert(!dashRegex.test(text), `Zero em/en-dashes in ${file}`);
    assert(!emojiRegex.test(text), `Zero emojis in ${file}`);
  }
});

console.log(`\n======================================================`);
console.log(`SEO & AEO VERIFICATION AUDIT: ${passes} PASSED, ${errors} FAILED`);
console.log(`======================================================\n`);

if (errors > 0) {
  process.exit(1);
}
