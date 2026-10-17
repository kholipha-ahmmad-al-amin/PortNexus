// PortNexus :: Automated High-Resolution Brand Asset Generator
// Generates:
// 1. public/favicon.svg (Scalable vector)
// 2. public/favicon-48x48.png (Exact 48x48 px for search engine crawlers & SEO)
// 3. public/favicon.ico (Multi-size icon fallback)
// 4. public/apple-touch-icon.png (180x180 px)
// 5. public/logo-square.png (512x512 px high-res brandmark)
// 6. public/logo.svg (Horizontal brandmark + typography)
// 7. public/og-image.png (1200x630 px OpenGraph social card with centered 630x630 square safe zone)

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// 1. The Pure Vector Brand Mark (SVG)
const BRANDMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="pnBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="pnCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="pnAzure" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0ea5e9" />
    </linearGradient>
    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#0284c7" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Base Rounded Container -->
  <rect width="512" height="512" rx="112" fill="url(#pnBg)" />
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#334155" stroke-width="4" opacity="0.6" />

  <!-- Subtle Coordinate / Grid Accents -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="#1e293b" stroke-width="2" stroke-dasharray="8 8" />
  <circle cx="256" cy="256" r="130" fill="none" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="4 6" opacity="0.3" />

  <!-- Isometric Maritime Port & Convergence Node (The Nexus Monogram) -->
  <g filter="url(#subtleGlow)">
    <!-- Left Pillar (Harbor Berth & Portal) -->
    <path d="M156 148 L216 114 L216 364 L156 398 Z" fill="url(#pnCyan)" />
    
    <!-- Top Canopy (Trade Corridor Beam) -->
    <path d="M216 114 L356 195 L296 229 L156 148 Z" fill="#38bdf8" opacity="0.9" />

    <!-- Right Pillar / Chevron (Forward Trade Compass) -->
    <path d="M296 229 L356 195 L356 364 L296 398 Z" fill="url(#pnAzure)" />

    <!-- Central Connecting Diamond (Audit Convergence Core) -->
    <path d="M256 220 L316 255 L256 290 L196 255 Z" fill="#ffffff" />
    <circle cx="256" cy="255" r="14" fill="#0284c7" />
  </g>
</svg>`;

// 2. Horizontal Logo with Typography
const HORIZONTAL_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 140" width="100%" height="100%">
  <defs>
    <linearGradient id="pnLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="pnLogoCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>

  <!-- Brand Emblem (120x120) -->
  <g transform="translate(10, 10)">
    <rect width="120" height="120" rx="28" fill="url(#pnLogoBg)" />
    <rect x="2" y="2" width="116" height="116" rx="26" fill="none" stroke="#334155" stroke-width="2" opacity="0.6" />
    
    <!-- Emblem Vectors scaled to 120 -->
    <g transform="scale(0.234) translate(0, 0)">
      <path d="M156 148 L216 114 L216 364 L156 398 Z" fill="url(#pnLogoCyan)" />
      <path d="M216 114 L356 195 L296 229 L156 148 Z" fill="#38bdf8" opacity="0.9" />
      <path d="M296 229 L356 195 L356 364 L296 398 Z" fill="#0284c7" />
      <path d="M256 220 L316 255 L256 290 L196 255 Z" fill="#ffffff" />
      <circle cx="256" cy="255" r="14" fill="#0284c7" />
    </g>
  </g>

  <!-- Typography: PortNexus -->
  <text x="150" y="78" font-family="'Space Grotesk', -apple-system, sans-serif" font-weight="700" font-size="52" fill="#0f172a" letter-spacing="-1.5">
    Port<tspan fill="#0284c7">Nexus</tspan>
  </text>
  
  <!-- Subtitle: Autonomous Trade Intelligence -->
  <text x="154" y="106" font-family="'Inter', -apple-system, sans-serif" font-weight="600" font-size="14.5" fill="#64748b" letter-spacing="1.2">
    AUTONOMOUS TRADE &amp; L/C AUDIT ENGINE
  </text>
</svg>`;

// 3. HTML for rendering the OpenGraph 1200x630 Card
// Built with exact safe square margins:
// Width: 1200px, Height: 630px
// Safe zone for 1:1 square crop (WhatsApp, Telegram, preview cards):
// X from 285px to 915px (centered 630x630 box)
const OG_IMAGE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    background: #0f172a;
    color: #f8fafc;
    font-family: 'Inter', sans-serif;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* Architectural Grid Background */
  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse at 50% 50%, #000 40%, transparent 80%);
  }

  /* Ambient Maritime Glow */
  .glow-cyan {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 680px;
    height: 480px;
    background: radial-gradient(circle, rgba(2, 132, 199, 0.22) 0%, rgba(15, 23, 42, 0) 70%);
    pointer-events: none;
  }

  /* Flank Left: Trade Metrics (Visible on 16:9 / 1.91:1) */
  .flank-left {
    position: absolute;
    left: 45px;
    top: 50%;
    transform: translateY(-50%);
    width: 220px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    z-index: 10;
  }
  .stat-card {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 14px 18px;
    backdrop-filter: blur(8px);
  }
  .stat-val {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 24px;
    color: #38bdf8;
    line-height: 1.1;
  }
  .stat-lbl {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-top: 4px;
  }

  /* Center Safe Square (630x630, Perfectly Preserved in 1:1 Crops) */
  .center-square {
    position: absolute;
    left: 285px;
    width: 630px;
    height: 630px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 30px;
    z-index: 20;
  }

  .logo-box {
    width: 110px;
    height: 110px;
    margin-bottom: 22px;
    filter: drop-shadow(0 12px 24px rgba(2, 132, 199, 0.4));
  }

  .category-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(2, 132, 199, 0.18);
    border: 1px solid rgba(56, 189, 248, 0.4);
    color: #38bdf8;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    padding: 6px 16px;
    border-radius: 9999px;
    margin-bottom: 18px;
  }
  .pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #38bdf8;
    box-shadow: 0 0 10px #38bdf8;
  }

  .main-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 58px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -2px;
    color: #ffffff;
    margin-bottom: 12px;
  }
  .main-title span {
    color: #38bdf8;
  }

  .tagline {
    font-size: 19px;
    font-weight: 500;
    color: #cbd5e1;
    line-height: 1.35;
    max-width: 520px;
    margin-bottom: 24px;
  }

  .badges-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .badge-tag {
    background: #1e293b;
    border: 1px solid #334155;
    color: #e2e8f0;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 8px;
  }

  /* Flank Right: Documentary Reconciliation Diagram */
  .flank-right {
    position: absolute;
    right: 45px;
    top: 50%;
    transform: translateY(-50%);
    width: 220px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    z-index: 10;
  }
  .doc-node {
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .doc-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: rgba(2, 132, 199, 0.25);
    color: #38bdf8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 11px;
  }
  .doc-meta {
    font-size: 12px;
    font-weight: 600;
    color: #f1f5f9;
  }
  .doc-sub {
    font-size: 10px;
    color: #64748b;
  }

  /* Bottom Domain Bar */
  .bottom-bar {
    position: absolute;
    bottom: 20px;
    left: 0;
    right: 0;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #64748b;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  <div class="grid-pattern"></div>
  <div class="glow-cyan"></div>

  <!-- Left Flank -->
  <div class="flank-left">
    <div class="stat-card">
      <div class="stat-val">14-Point</div>
      <div class="stat-lbl">UCP 600 Audit Engine</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">ISO 15022</div>
      <div class="stat-lbl">SWIFT MT700 Parser</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">SHA-256</div>
      <div class="stat-lbl">Digital Compliance Seal</div>
    </div>
  </div>

  <!-- Center Safe Square (630x630) -->
  <div class="center-square">
    <div class="logo-box">
      ${BRANDMARK_SVG}
    </div>

    <div class="category-pill">
      <span class="pulse-dot"></span>
      Enterprise Trade Intelligence
    </div>

    <h1 class="main-title">Port<span>Nexus</span></h1>
    <p class="tagline">Autonomous Cross-Border Trade Compliance &amp; Letter of Credit Audit Engine</p>

    <div class="badges-row">
      <div class="badge-tag">Zero Demurrage</div>
      <div class="badge-tag">WCO HS Classifier</div>
      <div class="badge-tag">Graph RAG</div>
      <div class="badge-tag">MCP SSE Bridge</div>
    </div>
  </div>

  <!-- Right Flank -->
  <div class="flank-right">
    <div class="doc-node">
      <div class="doc-icon">LC</div>
      <div>
        <div class="doc-meta">SWIFT MT700</div>
        <div class="doc-sub">Credit Stipulations</div>
      </div>
    </div>
    <div class="doc-node">
      <div class="doc-icon">INV</div>
      <div>
        <div class="doc-meta">Commercial Invoice</div>
        <div class="doc-sub">Field 45A Correlated</div>
      </div>
    </div>
    <div class="doc-node">
      <div class="doc-icon">BL</div>
      <div>
        <div class="doc-meta">Ocean Bill of Lading</div>
        <div class="doc-sub">Clean Shipped On-Board</div>
      </div>
    </div>
  </div>

  <div class="bottom-bar">
    portnexus.equisaas-bd.com &bull; ICC UCP 600 &bull; WCO Harmonized System
  </div>
</body>
</html>`;

async function generateAllAssets() {
  console.log('[Branding] Starting asset generation...');

  // 1. Write SVG Brandmark and Logo
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), BRANDMARK_SVG.trim());
  fs.writeFileSync(path.join(PUBLIC_DIR, 'logo.svg'), HORIZONTAL_LOGO_SVG.trim());
  console.log('  [OK] Saved public/favicon.svg');
  console.log('  [OK] Saved public/logo.svg');

  const browser = await chromium.launch({ headless: true });

  try {
    // 2. Render Favicon 48x48 PNG (Exact 48x48 px for SEO & crawlers)
    const pageFavicon48 = await browser.newPage();
    await pageFavicon48.setViewportSize({ width: 48, height: 48 });
    await pageFavicon48.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent;">${BRANDMARK_SVG}</body></html>`);
    await pageFavicon48.screenshot({
      path: path.join(PUBLIC_DIR, 'favicon-48x48.png'),
      omitBackground: true,
      clip: { x: 0, y: 0, width: 48, height: 48 }
    });
    console.log('  [OK] Saved public/favicon-48x48.png (48x48 px)');

    // Also copy to favicon.ico for standard browser fallback
    fs.copyFileSync(path.join(PUBLIC_DIR, 'favicon-48x48.png'), path.join(PUBLIC_DIR, 'favicon.ico'));
    console.log('  [OK] Saved public/favicon.ico');

    // 3. Render Apple Touch Icon (180x180 px)
    const pageApple = await browser.newPage();
    await pageApple.setViewportSize({ width: 180, height: 180 });
    await pageApple.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:#0f172a;">${BRANDMARK_SVG}</body></html>`);
    await pageApple.screenshot({
      path: path.join(PUBLIC_DIR, 'apple-touch-icon.png'),
      clip: { x: 0, y: 0, width: 180, height: 180 }
    });
    console.log('  [OK] Saved public/apple-touch-icon.png (180x180 px)');

    // 4. Render Square Brandmark 512x512 PNG
    const page512 = await browser.newPage();
    await page512.setViewportSize({ width: 512, height: 512 });
    await page512.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent;">${BRANDMARK_SVG}</body></html>`);
    await page512.screenshot({
      path: path.join(PUBLIC_DIR, 'logo-square.png'),
      omitBackground: true,
      clip: { x: 0, y: 0, width: 512, height: 512 }
    });
    console.log('  [OK] Saved public/logo-square.png (512x512 px)');

    // 5. Render OpenGraph 1200x630 Card with Centered 630x630 Safe Square
    const pageOG = await browser.newPage();
    await pageOG.setViewportSize({ width: 1200, height: 630 });
    await pageOG.setContent(OG_IMAGE_HTML);
    // Wait for fonts to load
    await pageOG.waitForTimeout(1000);
    await pageOG.screenshot({
      path: path.join(PUBLIC_DIR, 'og-image.png'),
      clip: { x: 0, y: 0, width: 1200, height: 630 }
    });
    console.log('  [OK] Saved public/og-image.png (1200x630 px with 630x630 safe zone)');

  } finally {
    await browser.close();
  }

  console.log('[Branding] All assets successfully generated with mathematical precision!');
}

generateAllAssets().catch(err => {
  console.error('[Branding] Generation error:', err);
  process.exit(1);
});
