// PortNexus Responsive UI/UX & Playwright Automation Audit
// Uses Playwright route fulfillment (zero external network required).
// Tests sticky navigation, mobile drawer toggle, horizontal overflow across 9 viewports.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const VIEWPORTS = [
  { name: 'Mobile XS (iPhone SE 1st)', width: 320, height: 568, isMobile: true },
  { name: 'Mobile SM (iPhone SE 2nd)', width: 375, height: 667, isMobile: true },
  { name: 'Mobile MD (iPhone 12/13/14)', width: 390, height: 844, isMobile: true },
  { name: 'Mobile LG (iPhone Plus/XR)', width: 414, height: 896, isMobile: true },
  { name: 'Tablet Portrait (iPad Mini)', width: 768, height: 1024, isMobile: true },
  { name: 'Tablet Landscape (iPad)', width: 1024, height: 768, isMobile: false },
  { name: 'Laptop (Standard 13")', width: 1280, height: 800, isMobile: false },
  { name: 'Desktop (1080p Standard)', width: 1440, height: 900, isMobile: false },
  { name: 'Large Desktop (1600p+)', width: 1920, height: 1080, isMobile: false },
];

async function setupContextWithLocalRoutes(browser, vp) {
  const publicDir = path.join(__dirname, '..', 'public');
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    userAgent: vp.isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  });

  await context.route('**/*', (route) => {
    try {
      const url = new URL(route.request().url());
      let pathname = url.pathname;
      if (pathname === '/') pathname = '/index.html';
      const filePath = path.join(publicDir, pathname);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        route.fulfill({
          status: 200,
          contentType: MIME_TYPES[ext] || 'application/octet-stream',
          body: fs.readFileSync(filePath),
        });
      } else {
        route.fulfill({ status: 404, body: 'Not found' });
      }
    } catch (e) {
      route.abort();
    }
  });

  return context;
}

async function runAudit() {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function record(desc, passed, detail = '') {
    totalTests++;
    if (passed) {
      passedTests++;
      console.log(`  [PASS] ${desc}`);
    } else {
      failedTests++;
      console.error(`  [FAIL] ${desc} : ${detail}`);
    }
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. AUDIT HOME PAGE (index.html)
    // ─────────────────────────────────────────────────────────────
    console.log('============================================================');
    console.log('AUDIT SUITE 1: Home Page (index.html)');
    console.log('============================================================');

    for (const vp of VIEWPORTS) {
      console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      const context = await setupContextWithLocalRoutes(browser, vp);
      const page = await context.newPage();
      await page.goto('http://portnexus.local/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);

      // A. Horizontal Overflow Check
      const overflowData = await page.evaluate(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const windowWidth = window.innerWidth;
        const overflowingElements = [];

        if (docScrollWidth > windowWidth || bodyScrollWidth > windowWidth) {
          const all = document.querySelectorAll('*');
          all.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > windowWidth + 1) {
              overflowingElements.push({
                tag: el.tagName.toLowerCase(),
                id: el.id || '',
                className: (el.className || '').toString().slice(0, 40),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                windowWidth,
              });
            }
          });
        }

        return {
          windowWidth,
          docScrollWidth,
          bodyScrollWidth,
          hasOverflow: docScrollWidth > windowWidth || bodyScrollWidth > windowWidth,
          overflowingElements: overflowingElements.slice(0, 5),
        };
      });

      record(
        `No horizontal overflow on ${vp.width}px (doc: ${overflowData.docScrollWidth}px, body: ${overflowData.bodyScrollWidth}px)`,
        !overflowData.hasOverflow,
        JSON.stringify(overflowData.overflowingElements)
      );

      // B. Sticky Navbar Persistence on Scroll
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(100);

      const navStickyData = await page.evaluate(() => {
        const nav = document.querySelector('.top-nav');
        if (!nav) return { found: false };
        const rect = nav.getBoundingClientRect();
        return {
          found: true,
          top: Math.round(rect.top),
          height: Math.round(rect.height),
          isFixed: Math.abs(rect.top) < 2,
        };
      });

      record(
        `Top navigation remains fixed at top: 0 after scroll on ${vp.width}px (rect.top: ${navStickyData.top}px)`,
        navStickyData.found && navStickyData.isFixed,
        `rect.top = ${navStickyData.top}`
      );

      // C. Navigation Controls & Mobile Drawer
      if (vp.isMobile) {
        const toggleVisible = await page.isVisible('.mobile-menu-toggle');
        record(`Mobile hamburger toggle is visible on ${vp.width}px`, toggleVisible);

        if (toggleVisible) {
          // Open drawer
          await page.click('.mobile-menu-toggle');
          await page.waitForTimeout(350);

          const drawerOpen = await page.evaluate(() => {
            const drawer = document.getElementById('mobileDrawer');
            const overlay = document.getElementById('mobileDrawerOverlay');
            if (!drawer || !overlay) return false;
            const rect = drawer.getBoundingClientRect();
            return (
              drawer.classList.contains('open') &&
              overlay.classList.contains('open') &&
              rect.left >= 0 &&
              rect.width > 100
            );
          });
          record(`Mobile drawer opens properly upon toggle click on ${vp.width}px`, drawerOpen);

          // Close drawer via close button
          await page.click('#btnCloseDrawer');
          await page.waitForTimeout(350);

          const drawerClosed = await page.evaluate(() => {
            const drawer = document.getElementById('mobileDrawer');
            const overlay = document.getElementById('mobileDrawerOverlay');
            return !drawer.classList.contains('open') && !overlay.classList.contains('open');
          });
          record(`Mobile drawer closes cleanly upon close button click on ${vp.width}px`, drawerClosed);

          // Test auto-close when clicking an in-page anchor link
          await page.click('.mobile-menu-toggle');
          await page.waitForTimeout(350);
          await page.click('#mobileDrawer a[href="#features"]');
          await page.waitForTimeout(350);

          const autoClosed = await page.evaluate(() => {
            const drawer = document.getElementById('mobileDrawer');
            return !drawer.classList.contains('open');
          });
          record(`Mobile drawer auto-closes after clicking in-page anchor link on ${vp.width}px`, autoClosed);
        }
      } else {
        // Desktop / Tablet landscape
        const toggleVisible = await page.isVisible('.mobile-menu-toggle');
        record(`Mobile menu toggle is hidden on desktop/tablet landscape (${vp.width}px)`, !toggleVisible);

        const navLinksVisible = await page.isVisible('.nav-links');
        record(`Desktop navigation links are visible on ${vp.width}px`, navLinksVisible);
      }

      await context.close();
    }

    // ─────────────────────────────────────────────────────────────
    // 2. AUDIT DOCUMENTATION PAGE (docs.html)
    // ─────────────────────────────────────────────────────────────
    console.log('\n============================================================');
    console.log('AUDIT SUITE 2: Documentation Page (docs.html)');
    console.log('============================================================');

    for (const vp of VIEWPORTS) {
      console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      const context = await setupContextWithLocalRoutes(browser, vp);
      const page = await context.newPage();
      await page.goto('http://portnexus.local/docs.html', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);

      const overflowData = await page.evaluate(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const windowWidth = window.innerWidth;
        const overflowingElements = [];

        if (docScrollWidth > windowWidth || bodyScrollWidth > windowWidth) {
          const all = document.querySelectorAll('*');
          all.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > windowWidth + 1) {
              overflowingElements.push({
                tag: el.tagName.toLowerCase(),
                id: el.id || '',
                className: (el.className || '').toString().slice(0, 40),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                windowWidth,
              });
            }
          });
        }

        return {
          windowWidth,
          docScrollWidth,
          bodyScrollWidth,
          hasOverflow: docScrollWidth > windowWidth || bodyScrollWidth > windowWidth,
          overflowingElements: overflowingElements.slice(0, 5),
        };
      });

      record(
        `docs.html no horizontal overflow on ${vp.width}px (doc: ${overflowData.docScrollWidth}px, body: ${overflowData.bodyScrollWidth}px)`,
        !overflowData.hasOverflow,
        JSON.stringify(overflowData.overflowingElements)
      );

      // Verify docs navbar sticky
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(100);

      const docsNavSticky = await page.evaluate(() => {
        const nav = document.querySelector('.top-nav');
        if (!nav) return false;
        const rect = nav.getBoundingClientRect();
        return Math.abs(rect.top) < 2;
      });

      record(`docs.html top navigation remains fixed at top: 0 on ${vp.width}px`, docsNavSticky);

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log('\n============================================================');
  console.log(`AUDIT SUMMARY: ${passedTests}/${totalTests} Tests Passed`);
  console.log('============================================================');

  if (failedTests > 0) {
    console.error(`FAILED: ${failedTests} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('[FATAL AUDIT ERROR]', err);
  process.exit(1);
});
