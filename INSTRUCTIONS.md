# PortNexus : Production Operations & Deployment Instructions

## 1. Automated Production Deployment Workflow

All production deployments to Vercel and GitHub must be executed through the single-command PowerShell script:

```powershell
.\deploy.ps1
```

### What `deploy.ps1` Automates:
1. **Automated Verification:** Executes `node scripts/audit_contrast.js` (Playwright WCAG 2.1 AAA contrast and functional tests). If any test fails, deployment halts immediately.
2. **Privacy Enforcement:** Confirms that `.env`, `.env.*`, and `docs/` are untracked and strictly omitted from git staging.
3. **Single Fresh Initial Root Commit:**
   - Squashes the entire git history into exactly ONE clean initial commit using an orphan branch.
   - Force-pushes to GitHub `origin main` so hackathon judges and public evaluators only see a pristine, professional repository with zero messy commit clutter.
4. **Vercel Production Deployment:** Runs `npx vercel --prod --yes` to push the latest verified build live to `portnexus.equisaas-bd.com`.
5. **Live Health & Keepalive Verification:** Queries `https://portnexus.equisaas-bd.com/api/health` to confirm Supabase PostgreSQL connectivity and Gemini Multimodal vision capabilities.

---

## 2. Strict Git Commit Policy (Mandatory Rule)

Whenever updating GitHub, **always maintain exactly ONE initial root commit on `origin main`**:
- Never push intermediate "wip", "fix typo", or fragmented debug commits.
- Use `.\deploy.ps1` or the manual orphan-branch technique:
  ```powershell
  git checkout --orphan temp-main
  git add -A
  git commit -m "feat(core): PortNexus Enterprise v2.0 - Autonomous Trade & L/C Audit Engine"
  git branch -D main
  git branch -m main
  git push -f origin main
  ```

---

## 3. Privacy & Security Constraints

The following directories and files must NEVER be pushed to public GitHub:
- `.env`, `.env.local`, `*.env` (Contains Gemini API Key and Supabase Service Keys)
- `docs/` (Contains internal product specifications, technical requirements, and system design architecture)
- `.vercel/` (Local Vercel build caches)

These entries are strictly defined in `.gitignore`.

---

## 4. Supabase Keepalive Automation (Anti-Pausing Mechanism)

Supabase free-tier PostgreSQL clusters pause after 7 days of inactivity. To keep the database permanently active:

* **GitHub Action:** `.github/workflows/keepalive.yml`
* **Schedule:** Runs daily at 04:00 UTC (10:00 BST).
* **Target:** Pings `https://portnexus.equisaas-bd.com/api/health`.
* **Execution:** The `/api/health` handler executes an active count query on the Supabase `organizations` table (`db.checkDBConnection()`), keeping both the serverless Lambda and the PostgreSQL database warm and active 24/7.

---

## 5. Environment Variables Configuration

Production environment variables configured in Vercel:

| Variable Name | Description | Example / Location |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key for multimodal document OCR | `AQ.Ab8RN6LNOL...` |
| `SUPABASE_URL` | Supabase cloud PostgreSQL endpoint | `https://qpzjrhvuxtvmkhdrusub.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anonymous client API key | `eyJhbGciOiJIUzI1NiIsInR5cCI...` |

---

## 6. Primary URLs & Service Endpoints

* **Production URL:** `https://portnexus.equisaas-bd.com`
* **API Health Check:** `https://portnexus.equisaas-bd.com/api/health`
* **Certificate Verification:** `https://portnexus.equisaas-bd.com/verify?id=:certId`
* **Model Context Protocol SSE:** `https://portnexus.equisaas-bd.com/api/mcp/sse`
* **Public GitHub Repository:** `https://github.com/kholipha-ahmmad-al-amin/PortNexus`
