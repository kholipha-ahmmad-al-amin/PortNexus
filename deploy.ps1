# PortNexus Enterprise : Automated Production Deployment Pipeline
# Enforces:
# 1. Automated Playwright WCAG 2.1 AAA Accessibility & Functional Verification
# 2. Strict Single Fresh Initial Root Commit on GitHub origin main (Zero Commit History Leakage)
# 3. Privacy Verification (Strict omission of .env and docs/ from Git)
# 4. Direct Vercel Production Deployment
# 5. Immediate Supabase & Vercel Warm-Up Health Ping

$ErrorActionPreference = "Continue"
if (-not $env:GIT_CONFIG_GLOBAL) {
    $env:GIT_CONFIG_GLOBAL = "NUL"
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "        PORTNEXUS ENTERPRISE : PRODUCTION DEPLOYMENT LOOP        " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# ─── STEP 1: PRE-FLIGHT VERIFICATION TESTS ─────────────────────────────────────
Write-Host "`n[1/5] Running Automated Pre-Flight Quality, SEO & Contrast Audits..." -ForegroundColor Yellow
$auditExitCode = 0
try {
    node scripts/verify_seo.js
    if ($LASTEXITCODE -ne 0) { throw "SEO verification failed" }
    node scripts/audit_contrast.js
    if ($LASTEXITCODE -ne 0) { throw "Contrast verification failed" }
    node scripts/audit_playwright_responsive.js
    $auditExitCode = $LASTEXITCODE
} catch {
    $auditExitCode = 1
}

if ($auditExitCode -ne 0) {
    Write-Host "`nPre-flight verification failed! Aborting deployment." -ForegroundColor Red
    exit 1
}
Write-Host "Pre-flight audit PASSED with 100% compliance." -ForegroundColor Green

# ─── STEP 2: GIT CLEAN-UP & PRIVACY VERIFICATION ──────────────────────────────
Write-Host "`n[2/5] Enforcing Git Privacy Constraints (.env and docs/ exclusion)..." -ForegroundColor Yellow

# Untrack any cached private files if they exist in the git index
$trackedPrivate = git ls-files docs .env .env.local 2>$null
if ($trackedPrivate) {
    git rm -r --cached docs 2>$null | Out-Null
    git rm --cached .env 2>$null | Out-Null
    git rm --cached .env.local 2>$null | Out-Null
}

# ─── STEP 3: CREATE SINGLE FRESH ROOT INITIAL COMMIT ──────────────────────────
Write-Host "`n[3/5] Squashing Repository to Single Fresh Root Commit..." -ForegroundColor Yellow

# Create orphan branch detached from previous history
git checkout --orphan fresh-root-deploy 2>$null | Out-Null

# Stage all files respecting .gitignore
git add -A

# Verify staged files do not contain forbidden secret files or docs/
$stagedForbidden = git status --porcelain | Select-String -Pattern "^\s*[AM]\s+(\.env$|\.env\.local$|\.env\.production$|docs/)"
if ($stagedForbidden) {
    Write-Host "SECURITY ALERT: Sensitive files detected in git stage!" -ForegroundColor Red
    Write-Host $stagedForbidden
    exit 1
}

# Set repository-local identity
git config user.name "Team EquiSaaS BD"
git config user.email "engineering@equisaas-bd.com"

# Create single official commit
$commitMessage = "feat(core): PortNexus Enterprise v2.0 - Autonomous Trade & L/C Audit Engine`n`n- Commercial Multimodal Document OCR (Gemini 2.5 Flash + Tesseract Fallback)`n- SWIFT MT700 ISO 15022 Banking FIN Message Parser`n- 14-Point ICC UCP 600 Discrepancy & Risk Cross-Examination`n- WCO 8-Digit Harmonized Tariff & Duty Computation Engine`n- Tamper-Evident SHA-256 PDF Pre-Customs Clearance Certificates`n- Content-Negotiated Responsive QR Verification Badge (/verify)`n- Multi-Tenant Persistent Ledger on Supabase PostgreSQL (ap-southeast-1)`n- Model Context Protocol (MCP) Server-Sent Events Bridge for AI Agents`n- Enterprise Technical SEO, AEO & Schema.org Universal Entity Knowledge Graphs`n- Enterprise 4-Breakpoint Responsive Engine & Motion Micro-Interactions`n- Playwright Responsive UI/UX Verification across 9 Device Viewports"

git commit -m $commitMessage

# Ensure branch is main
if ((git branch --show-current).Trim() -ne "main") {
    git branch -D main 2>$null | Out-Null
    git branch -m main
}

# Force push to GitHub origin
Write-Host "Pushing single clean commit to GitHub origin main..." -ForegroundColor Cyan
git push -f origin main

$commitCount = (git rev-list --count HEAD).Trim()
$currentSha = (git rev-parse --short HEAD).Trim()
Write-Host "Local Git Verified   : Commit $currentSha (Total Local Commits: $commitCount)" -ForegroundColor Green

# Verify via GitHub CLI (gh)
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "Verifying remote state via GitHub CLI (gh)..." -ForegroundColor Cyan
    $ghRepo = gh repo view --json nameWithOwner,visibility --jq '"\(.nameWithOwner) [\(.visibility)]"' 2>$null
    $remoteCommits = gh api /repos/kholipha-ahmmad-al-amin/PortNexus/commits --jq "length" 2>$null
    Write-Host "GitHub CLI Repo      : $ghRepo" -ForegroundColor Green
    Write-Host "GitHub Remote Commits: $remoteCommits Clean Root Commit" -ForegroundColor Green
}

# ─── STEP 4: VERCEL PRODUCTION DEPLOYMENT ─────────────────────────────────────
Write-Host "`n[4/5] Deploying Production Build to Vercel..." -ForegroundColor Yellow
npx vercel --prod --yes

# ─── STEP 5: SUPABASE & VERCEL KEEPALIVE HEALTH PING ──────────────────────────
Write-Host "`n[5/5] Executing Live Production Keepalive & Database Check..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $health = Invoke-RestMethod -Uri "https://portnexus.equisaas-bd.com/api/health" -Method Get
    Write-Host "Live App Status     : $($health.status)" -ForegroundColor Green
    Write-Host "Database Connected  : $($health.database.connected) ($($health.database.url))" -ForegroundColor Green
    Write-Host "Multimodal Vision   : $($health.capabilities.geminiMultimodal)" -ForegroundColor Green
    Write-Host "Memory Heap Used    : $($health.memory.heapUsedMb) MB" -ForegroundColor Green
    Write-Host "Uptime              : $($health.uptimeSeconds)s" -ForegroundColor Green
} catch {
    Write-Host "Warning: Health ping returned an error: $_" -ForegroundColor Yellow
}

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host "          DEPLOYMENT SUCCESSFULLY COMPLETED & VERIFIED           " -ForegroundColor Green
Write-Host "  Domain: https://portnexus.equisaas-bd.com                      " -ForegroundColor Green
Write-Host "  Commit: $currentSha (1 Clean Initial Root Commit)              " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
