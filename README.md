# 🔬 SystematicaHub

**An open-source evidence synthesis platform for systematic reviews, scoping reviews, and HEOR research.**

Built for researchers, health economists, and clinicians — completely free, runs in any browser, no server required.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Search Strategy Generator** | Paste your research question → get instant MeSH terms & search strings for PubMed, Embase, Cochrane, Scopus, CINAHL, PsycINFO, EconLit |
| 📥 **CSV Bulk Import** | Upload PubMed / Embase / Scopus exports directly |
| 🔍 **Keyword Screener** | Free, instant title screening against your PICO — no API key needed |
| 📊 **PRISMA 2020 Builder** | Auto-generates flow diagram from your screening numbers |
| 🗃️ **Data Extraction Table** | Structured extraction with CSV/RevMan export |
| ✅ **Quality Appraisal** | RoB 2.0, Newcastle–Ottawa, GRADE, CASP tools built in |
| 👥 **Team Collaboration** | Invite co-reviewers, track inter-rater reliability |
| 🔐 **Auth + Database** | Supabase (free tier) for login and persistent storage |

---

## 🚀 Quick Start (2 ways)

### Option A — GitHub Pages (no install, 5 minutes)

1. Fork this repository
2. Go to **Settings → Pages → Deploy from branch → main → / (root)**
3. Open `index.html` and fill in your Supabase credentials (see [Configuration](#configuration))
4. Commit — your site is live at `https://YOUR-USERNAME.github.io/systematicahub`

### Option B — Run locally

```bash
git clone https://github.com/YOUR-USERNAME/systematicahub.git
cd systematicahub
# Just open index.html in your browser — no build step needed
open index.html
```

---

## ⚙️ Configuration

### 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL** and **anon public key** from Settings → API

### 2. Set up the database

Run `docs/SUPABASE_SETUP.sql` in Supabase → SQL Editor → New query.
This creates all tables and Row Level Security policies (fixes the recursion bug automatically).

### 3. Add your credentials to index.html

Open `index.html` and find line ~285:

```javascript
const SUPABASE_URL     = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace with your actual values, then commit.

### 4. Enable Google OAuth (optional)

Supabase dashboard → Authentication → Providers → Google → add your OAuth credentials from [Google Cloud Console](https://console.cloud.google.com).
Add your GitHub Pages URL to **Authentication → URL Configuration → Redirect URLs**.

### 5. AI Search Strategy (optional)

The AI search generator uses the Anthropic API (Claude). To enable it:
- Get a free API key from [console.anthropic.com](https://console.anthropic.com)
- Paste it into the Search Strategy page when prompted
- New accounts get free credits — screening 65 studies costs < $0.01

---

## 🗄️ Database Schema

```
profiles          — user accounts (auto-created on signup)
reviews           — systematic review projects
studies           — imported/added studies per review
team_members      — co-reviewer invitations
prisma_data       — PRISMA flow numbers per review
extractions       — structured data extraction fields
quality_appraisals — RoB/GRADE/NOS/CASP scores
```

Full SQL in `docs/SUPABASE_SETUP.sql`.

---

## 📁 File Structure

```
systematicahub/
├── index.html              ← Main app (entire platform in one file)
├── README.md               ← This file
├── LICENSE                 ← MIT License
├── .gitignore
└── docs/
    ├── SUPABASE_SETUP.sql  ← Run this in Supabase SQL Editor
    ├── CONTRIBUTING.md     ← How to contribute
    └── screenshots/        ← UI screenshots
```

---

## 🔬 Supported Databases for Search Strategy

The AI search strategy generator produces formatted strings for:

| Database | Format |
|---|---|
| **PubMed / MEDLINE** | MeSH terms + [tiab] field tags |
| **Embase** | Emtree terms + /exp notation |
| **Cochrane CENTRAL** | MeSH + free text |
| **Scopus** | TITLE-ABS-KEY format |
| **CINAHL** | MH "exact heading" format |
| **PsycINFO** | DE "descriptor" format |
| **EconLit** | JEL codes + keyword string |
| **PROSPERO** | Plain language search |

---

## 🤝 Contributing

Pull requests welcome! See `docs/CONTRIBUTING.md`.

Key areas for contribution:
- Additional quality appraisal tools (AMSTAR-2, ROBIS)
- Forest plot / meta-analysis visualisation
- Zotero / Mendeley / EndNote import
- RevMan XML export
- GRADE evidence table generator

---

## 📄 License

MIT — free to use, modify, and distribute.

---

## 📚 Citation

If you use SystematicaHub in your research, please cite:

```
SystematicaHub (2025). Open-source evidence synthesis platform.
GitHub: https://github.com/YOUR-USERNAME/systematicahub
```

---

*Built with React, Supabase, and the Anthropic API. Aligned with PRISMA 2020 and Cochrane Handbook standards.*
