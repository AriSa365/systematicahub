import { useState, useRef } from 'react'
import Icon from '../components/Icon.jsx'

const DATABASES = [
  { id:'pubmed',    label:'PubMed/MEDLINE',  color:'#2653A3', syntax:'mesh' },
  { id:'embase',    label:'Embase',          color:'#0D7377', syntax:'emtree' },
  { id:'cochrane',  label:'Cochrane CENTRAL', color:'#6B2FA0', syntax:'mesh' },
  { id:'scopus',    label:'Scopus',           color:'#C47A1E', syntax:'title_abs' },
  { id:'cinahl',    label:'CINAHL',           color:'#2E7D32', syntax:'cinahl' },
  { id:'psycinfo',  label:'PsycINFO',         color:'#C62828', syntax:'thesaurus' },
  { id:'econlit',   label:'EconLit',          color:'#555',    syntax:'title_abs' },
  { id:'nhseed',    label:'NHS EED / HEOR',   color:'#0a5457', syntax:'mesh' },
]

const STRATEGY_TEMPLATES = {
  pubmed: (terms) => `(
  ${terms.population.mesh.map(t => `"${t}"[Mesh]`).join(' OR\n  ')}
  OR ${terms.population.free.map(t => `"${t}"[tiab]`).join(' OR\n  ')}
)
AND
(
  ${terms.intervention.mesh.map(t => `"${t}"[Mesh]`).join(' OR\n  ')}
  OR ${terms.intervention.free.map(t => `"${t}"[tiab]`).join(' OR\n  ')}
)
AND
(
  ${terms.outcome.mesh.map(t => `"${t}"[Mesh]`).join(' OR\n  ')}
  OR ${terms.outcome.free.map(t => `"${t}"[tiab]`).join(' OR\n  ')}
)
${terms.studyDesign.free.length ? `AND\n(\n  ${terms.studyDesign.free.map(t => `"${t}"[tiab]`).join(' OR\n  ')}\n)` : ''}`,

  embase: (terms) => `(
  ${terms.population.mesh.map(t => `'${t}'/exp`).join(' OR\n  ')}
  OR ${terms.population.free.map(t => `'${t}':ti,ab`).join(' OR\n  ')}
)
AND
(
  ${terms.intervention.mesh.map(t => `'${t}'/exp`).join(' OR\n  ')}
  OR ${terms.intervention.free.map(t => `'${t}':ti,ab`).join(' OR\n  ')}
)
AND
(
  ${terms.outcome.mesh.map(t => `'${t}'/exp`).join(' OR\n  ')}
  OR ${terms.outcome.free.map(t => `'${t}':ti,ab`).join(' OR\n  ')}
)`,

  scopus: (terms) => `TITLE-ABS-KEY(
  ( ${[...terms.population.free, ...terms.population.mesh].map(t => `"${t}"`).join(' OR ')} )
  AND ( ${[...terms.intervention.free, ...terms.intervention.mesh].map(t => `"${t}"`).join(' OR ')} )
  AND ( ${[...terms.outcome.free, ...terms.outcome.mesh].map(t => `"${t}"`).join(' OR ')} )
)`,

  cochrane: (terms) => `#1 MeSH descriptor: [${terms.population.mesh[0] || 'Population'}] explode all trees
#2 ${terms.population.free.map(t => `"${t}"`).join(' OR ')} (Word variations have been searched)
#3 #1 OR #2
#4 MeSH descriptor: [${terms.intervention.mesh[0] || 'Intervention'}] explode all trees
#5 ${terms.intervention.free.map(t => `"${t}"`).join(' OR ')} (Word variations have been searched)
#6 #4 OR #5
#7 MeSH descriptor: [${terms.outcome.mesh[0] || 'Outcome'}] explode all trees
#8 ${terms.outcome.free.map(t => `"${t}"`).join(' OR ')}
#9 #7 OR #8
#10 #3 AND #6 AND #9`,

  cinahl: (terms) => `S1 (MH "${terms.population.mesh[0] || 'Population'}+")
S2 ${terms.population.free.map(t => `TI "${t}" OR AB "${t}"`).join(' OR ')}
S3 S1 OR S2
S4 (MH "${terms.intervention.mesh[0] || 'Intervention'}+")
S5 ${terms.intervention.free.map(t => `TI "${t}" OR AB "${t}"`).join(' OR ')}
S6 S4 OR S5
S7 (MH "${terms.outcome.mesh[0] || 'Outcome'}+")
S8 ${terms.outcome.free.map(t => `TI "${t}" OR AB "${t}"`).join(' OR ')}
S9 S7 OR S8
S10 S3 AND S6 AND S9`,

  psycinfo: (terms) => `(
  ${terms.population.free.map(t => `ti("${t}") OR ab("${t}")`).join(' OR\n  ')}
)
AND
(
  ${terms.intervention.free.map(t => `ti("${t}") OR ab("${t}")`).join(' OR\n  ')}
)
AND
(
  ${terms.outcome.free.map(t => `ti("${t}") OR ab("${t}")`).join(' OR\n  ')}
)`,

  econlit: (terms) => `TI (${[...terms.intervention.free, ...terms.outcome.free].map(t => `"${t}"`).join(' OR ')}) AND AB (${terms.population.free.map(t => `"${t}"`).join(' OR ')})`,

  nhseed: (terms) => `Same as PubMed strategy above, filtered to:
Limit to: Economic evaluations, HTA reports, Systematic reviews
Date: 2010 to present

Additional NHS EED filter:
AND ("cost*"[tiab] OR "economic*"[tiab] OR "discrete choice"[tiab] OR "conjoint"[tiab] OR "willingness to pay"[tiab] OR "preference*"[tiab])`,
}

// Keyword-based free strategy generator (no API needed)
function generateFreeStrategy(pico) {
  const text = pico.toLowerCase()

  // Auto-detect population
  const popTerms = { mesh: [], free: [] }
  if (text.includes('type 2 diabetes') || text.includes('t2dm') || text.includes('t2d')) {
    popTerms.mesh = ['Diabetes Mellitus, Type 2']
    popTerms.free = ['type 2 diabetes', 'T2DM', 'T2D', 'type 2 diabetes mellitus', 'non-insulin-dependent diabetes']
  } else if (text.includes('diabetes')) {
    popTerms.mesh = ['Diabetes Mellitus']
    popTerms.free = ['diabetes mellitus', 'diabetes']
  } else {
    popTerms.free = [pico.match(/in (adults?|patients?|children|elderly)[^,.]*/i)?.[0]?.replace(/^in /i,'') || 'patients'].filter(Boolean)
  }

  // Auto-detect intervention
  const intTerms = { mesh: [], free: [] }
  const glp1 = ['glp-1','glp1','glucagon','semaglutide','liraglutide','exenatide','dulaglutide','tirzepatide']
  const sglt2 = ['sglt2','sglt-2','canagliflozin','dapagliflozin','empagliflozin','ertugliflozin']
  const hasGLP1 = glp1.some(k => text.includes(k))
  const hasSGLT2 = sglt2.some(k => text.includes(k))
  if (hasGLP1) {
    intTerms.mesh.push('Glucagon-Like Peptide-1 Receptor Agonists', 'Glucagon-like peptide 1')
    intTerms.free.push('GLP-1', 'GLP1', 'GLP-1 RA', 'GLP-1 receptor agonist', 'semaglutide', 'liraglutide', 'exenatide', 'dulaglutide', 'lixisenatide', 'tirzepatide', 'albiglutide')
  }
  if (hasSGLT2) {
    intTerms.mesh.push('Sodium-Glucose Transporter 2 Inhibitors', 'Sodium-Glucose Cotransporter 2')
    intTerms.free.push('SGLT2', 'SGLT-2', 'SGLT2 inhibitor', 'canagliflozin', 'dapagliflozin', 'empagliflozin', 'ertugliflozin')
  }
  if (!hasGLP1 && !hasSGLT2) {
    intTerms.free = ['intervention', 'treatment', 'therapy']
  }

  // Auto-detect outcome
  const outTerms = { mesh: [], free: [] }
  const safetyWords = ['adverse','risk','safety','side effect','complication','tolerab']
  const prefWords = ['discrete choice','conjoint','preference','dce','willingness to pay']
  const hasSafety = safetyWords.some(k => text.includes(k))
  const hasPref = prefWords.some(k => text.includes(k))
  if (hasSafety) {
    outTerms.mesh = ['Drug-Related Side Effects and Adverse Reactions', 'Safety']
    outTerms.free = ['adverse event*', 'adverse effect*', 'side effect*', 'risk*', 'safety', 'tolerability', 'complication*', 'pancreatitis', 'ketoacidosis', 'hypoglycemi*', 'nausea', 'cardiovascular', 'renal', 'genital infection']
  }
  if (hasPref) {
    outTerms.mesh.push('Patient Preference')
    outTerms.free.push(...['discrete choice experiment*', 'DCE', 'conjoint analysis', 'stated preference*', 'best-worst scaling', 'willingness to pay', 'patient preference*', 'preference elicitation'])
  }
  if (!hasSafety && !hasPref) {
    outTerms.free = ['outcome*', 'efficacy', 'effectiveness']
  }

  // Study design (HEOR-specific)
  const studyDesign = { mesh: [], free: [] }
  if (hasPref) {
    studyDesign.free = ['discrete choice experiment*', 'conjoint', 'stated preference*', 'best-worst scaling', 'DCE']
  }

  return { population: popTerms, intervention: intTerms, outcome: outTerms, studyDesign }
}

export default function SearchStrategy({ showToast }) {
  const [pico, setPico] = useState('')
  const [selectedDBs, setSelectedDBs] = useState(['pubmed','embase','cochrane','scopus'])
  const [generated, setGenerated] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [activeDB, setActiveDB] = useState('pubmed')
  const [terms, setTerms] = useState(null)
  const [editMode, setEditMode] = useState(false)

  const toggleDB = (id) => setSelectedDBs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])

  const generate = () => {
    if (!pico.trim()) { showToast('Enter your research question first', 'error'); return }
    setGenerating(true)
    setTimeout(() => {
      const t = generateFreeStrategy(pico)
      setTerms(t)
      const strategies = {}
      selectedDBs.forEach(db => {
        const fn = STRATEGY_TEMPLATES[db]
        strategies[db] = fn ? fn(t) : '— Not yet supported —'
      })
      setGenerated(strategies)
      setActiveDB(selectedDBs[0])
      setGenerating(false)
      showToast('Search strategies generated for ' + selectedDBs.length + ' databases!', 'success')
    }, 600)
  }

  const copy = (text) => {
    navigator.clipboard.writeText(text)
    showToast('Copied to clipboard', 'success')
  }

  const exportAll = () => {
    if (!generated) return
    const content = Object.entries(generated).map(([db, s]) => {
      const label = DATABASES.find(d => d.id === db)?.label || db
      return `${'='.repeat(60)}\n${label}\n${'='.repeat(60)}\n${s}\n`
    }).join('\n')
    const blob = new Blob([`SYSTEMATICAHUB — SEARCH STRATEGIES\nResearch question: ${pico}\nGenerated: ${new Date().toLocaleDateString()}\n\n${content}`], {type:'text/plain'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'search-strategies.txt'; a.click()
    showToast('All strategies exported', 'success')
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <h1>Search Strategy Builder</h1>
          {generated && <button className="btn btn-ghost" onClick={exportAll}><Icon name="download" size={14}/>Export all (.txt)</button>}
        </div>
      </div>

      <div className="page-body">

        {/* Research question input */}
        <div className="card card-p" style={{marginBottom:16}}>
          <div className="section-title" style={{marginBottom:4}}>Research question (PICO)</div>
          <div style={{fontSize:12,color:'var(--ink-soft)',marginBottom:12}}>
            Paste your PICO question or describe your topic — the builder auto-detects population, intervention, and outcome terms.
          </div>
          <textarea
            className="form-input"
            style={{minHeight:90,marginBottom:12,width:'100%'}}
            placeholder="e.g. In adults with type 2 diabetes mellitus, what are the risk attributes of GLP-1 receptor agonists and SGLT-2 inhibitors that influence patient preferences in discrete choice experiments?"
            value={pico}
            onChange={e => setPico(e.target.value)}
          />

          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--ink-soft)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>Select databases</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {DATABASES.map(db => (
                <button key={db.id}
                  className="db-chip"
                  style={selectedDBs.includes(db.id) ? {background:db.color,borderColor:db.color,color:'white'} : {}}
                  onClick={() => toggleDB(db.id)}>
                  {db.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn btn-primary btn-lg" onClick={generate} disabled={generating || !pico.trim()}>
              {generating ? <><span className="loading-spin"/>Generating…</> : <><Icon name="sparkle" size={16}/>Generate search strategies</>}
            </button>
            <span style={{fontSize:12,color:'var(--ink-soft)'}}>100% free · runs in your browser · no API key needed</span>
          </div>
        </div>

        {/* Generated strategies */}
        {generated && terms && (
          <>
            {/* Term overview */}
            <div className="card card-p" style={{marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div className="section-title">Detected PICO terms</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(!editMode)}>
                  {editMode ? 'Done editing' : 'Edit terms'}
                </button>
              </div>
              <div className="grid-2" style={{gap:12}}>
                {[
                  ['Population (P)', terms.population, 'var(--accent)'],
                  ['Intervention (I)', terms.intervention, 'var(--teal)'],
                  ['Outcome (O)', terms.outcome, 'var(--amber)'],
                  ['Study design (S)', terms.studyDesign, 'var(--purple)'],
                ].map(([label, t, color]) => (
                  <div key={label} style={{background:'var(--bg)',borderRadius:'var(--radius-sm)',padding:'10px 12px'}}>
                    <div style={{fontSize:11,fontWeight:700,color,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>{label}</div>
                    {t.mesh.length > 0 && <div style={{marginBottom:4}}>
                      <span style={{fontSize:10,fontWeight:600,color:'var(--ink-ghost)',textTransform:'uppercase'}}>Controlled vocab: </span>
                      {t.mesh.map((m,i) => <span key={i} style={{fontSize:12,background:color+'22',color,padding:'1px 6px',borderRadius:3,marginRight:4,display:'inline-block',marginBottom:3}}>{m}</span>)}
                    </div>}
                    <div>
                      <span style={{fontSize:10,fontWeight:600,color:'var(--ink-ghost)',textTransform:'uppercase'}}>Free text: </span>
                      {t.free.slice(0,6).map((f,i) => <span key={i} style={{fontSize:12,background:'var(--surface)',border:'1px solid var(--border)',padding:'1px 6px',borderRadius:3,marginRight:4,display:'inline-block',marginBottom:3}}>{f}</span>)}
                      {t.free.length > 6 && <span style={{fontSize:11,color:'var(--ink-ghost)'}}>+{t.free.length-6} more</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy tabs per database */}
            <div className="card" style={{overflow:'hidden'}}>
              <div style={{borderBottom:'1px solid var(--border)',display:'flex',gap:0,overflowX:'auto'}}>
                {selectedDBs.map(db => {
                  const info = DATABASES.find(d => d.id === db)
                  return (
                    <button key={db}
                      style={{padding:'10px 16px',border:'none',background:activeDB===db?'var(--surface)':'var(--bg)',
                        fontSize:13,fontWeight:500,cursor:'pointer',color:activeDB===db?info.color:'var(--ink-soft)',
                        borderBottom:activeDB===db?`2px solid ${info.color}`:'2px solid transparent',
                        whiteSpace:'nowrap'}}
                      onClick={() => setActiveDB(db)}>
                      {info.label}
                    </button>
                  )
                })}
              </div>
              <div style={{padding:'1.2rem 1.4rem'}}>
                <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8,gap:8}}>
                  <button className="copy-btn" onClick={() => copy(generated[activeDB])}>
                    <Icon name="copy" size={12}/> Copy
                  </button>
                </div>
                <div className="strategy-block">{generated[activeDB]}</div>
                <div style={{marginTop:10,padding:'8px 12px',background:'var(--accent-light)',borderRadius:'var(--radius-sm)',fontSize:12,color:'var(--ink-mid)'}}>
                  <strong style={{color:'var(--accent)'}}>Tip:</strong> Always have your search strategy peer-reviewed by a librarian or information specialist before running. Add date limits, language filters, and publication type filters as needed.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
