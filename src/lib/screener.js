// Free keyword-based PICO screener — runs entirely in browser, no API key needed
// Customise DRUG_TERMS and CONTEXT_TERMS to match your own PICO question

export const DRUG_TERMS = [
  'glp-1','glp1','glucagon-like peptide','semaglutide','liraglutide','exenatide',
  'dulaglutide','lixisenatide','tirzepatide','albiglutide','ozempic','wegovy',
  'victoza','trulicity','sglt2','sglt-2','sodium-glucose','canagliflozin',
  'dapagliflozin','empagliflozin','ertugliflozin','invokana','jardiance',
  'farxiga','forxiga','steglatro',
]

export const CONTEXT_TERMS = [
  'type 2 diabetes','t2dm','t2d','diabetes mellitus','hyperglycemi',
  'adverse','safety','side effect','risk','tolerability','complication',
  'pancreatitis','ketoacidosis','dka','hypoglycemi','nausea','vomiting',
  'gastrointestinal','cardiovascular','renal','kidney','heart failure',
  'genital','urinary','infection','thyroid','retinopathy','fracture',
  'amputation','weight','preference','discrete choice','conjoint',
  'patient preference','efficacy','clinical trial','randomized','randomised',
  'systematic review','meta-analysis','cohort','observational','pharmacovigilance',
]

export const EXCLUDE_TERMS = [
  'type 1 diabetes','t1dm','t1d','bariatric','gastric bypass',
  'in vitro','animal model','mice','rat model','rodent',
]

export function keywordScreen(title = '', authors = '', journal = '') {
  const text = (title + ' ' + authors + ' ' + journal).toLowerCase()
  const drugMatches    = DRUG_TERMS.filter(k => text.includes(k))
  const contextMatches = CONTEXT_TERMS.filter(k => text.includes(k))
  const excludeMatches = EXCLUDE_TERMS.filter(k => text.includes(k))
  const hasDrug    = drugMatches.length > 0
  const hasContext = contextMatches.length > 0
  const hasExclude = excludeMatches.length > 0

  if (hasExclude && !hasDrug)
    return { decision:'exclude', confidence:'high',
      reason:`Exclusion signal (${excludeMatches.slice(0,2).join(', ')}) — no GLP-1/SGLT-2 terms found.` }

  if (hasDrug && hasContext) {
    if (hasExclude)
      return { decision:'uncertain', confidence:'moderate',
        reason:`Drug match (${drugMatches[0]}) + context (${contextMatches[0]}) but exclusion signal (${excludeMatches[0]}) — manual review needed.` }
    return { decision:'include', confidence: contextMatches.length > 2 ? 'high' : 'moderate',
      reason:`Matches drug (${drugMatches.slice(0,2).join(', ')}) and context (${contextMatches.slice(0,2).join(', ')}).` }
  }
  if (hasDrug)
    return { decision:'uncertain', confidence:'low',
      reason:`Drug term found (${drugMatches[0]}) but context unclear — manual review recommended.` }

  return { decision:'exclude', confidence:'high',
    reason:'No GLP-1 RA or SGLT-2 inhibitor terms found in title/journal.' }
}

// PubMed CSV parser (handles quoted fields, BOM, Windows line endings)
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.replace(/^"|"$/g,'').trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = []; let cur = '', inQ = false
    for (let c = 0; c < lines[i].length; c++) {
      const ch = lines[i][c]
      if (ch === '"' && !inQ) inQ = true
      else if (ch === '"' && inQ && lines[i][c+1] === '"') { cur += '"'; c++ }
      else if (ch === '"' && inQ) inQ = false
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())
    if (cols.length >= 2) {
      const row = {}
      headers.forEach((h, idx) => { row[h] = (cols[idx]||'').replace(/^"|"$/g,'') })
      rows.push(row)
    }
  }
  return rows
}

export function csvRowToStudy(row, idx, reviewId) {
  return {
    id: 'csv_' + Date.now() + '_' + idx,
    title:   row['Title']          || row['title']         || '',
    authors: row['Authors']        || row['First Author']  || '',
    year:    parseInt(row['Publication Year'] || row['year'] || 0) || new Date().getFullYear(),
    journal: row['Journal/Book']   || row['Journal']       || '',
    doi:     row['DOI']            || row['doi']           || '',
    pmid:    row['PMID']           || row['pmid']          || '',
    design: 'Observational', n: 0, outcome:'', effect_size:'', ci:'',
    rob_score:'Moderate', abstract:'', included: null,
    screen_decision: null, screen_reason: null, screen_confidence: null,
    review_id: reviewId || '',
  }
}
