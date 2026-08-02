import { useState, useRef } from 'react'
import Icon from '../components/Icon.jsx'
import { parseCSV, csvRowToStudy, keywordScreen } from '../lib/screener.js'
import { supabase, isConfigured } from '../lib/supabase.js'

const DEMO_MODE = false

export default function Library({ studies, setStudies, reviews, showToast }) {
  const [query, setQuery] = useState('')
  const [designFilter, setDesignFilter] = useState('All')
  const [decisionFilter, setDecisionFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [form, setForm] = useState({
    title:'', authors:'', year:new Date().getFullYear(), journal:'',
    design:'RCT', n:'', outcome:'', effect_size:'', ci:'',
    rob_score:'Low', abstract:'', review_id: reviews[0]?.id||''
  })
  const fileRef = useRef(null)

  const designs = ['All','RCT','Cohort','Observational','Qualitative','Case-Control']
  const pending   = studies.filter(s => !s.screen_decision).length
  const included  = studies.filter(s => s.screen_decision === 'include').length
  const excluded  = studies.filter(s => s.screen_decision === 'exclude').length
  const uncertain = studies.filter(s => s.screen_decision === 'uncertain').length
  const screened  = studies.length - pending
  const pct = studies.length ? Math.round((screened / studies.length) * 100) : 0

  const filtered = studies.filter(s => {
    const q = query.toLowerCase()
    const matchQ = !q || (s.title||'').toLowerCase().includes(q) ||
      (s.authors||'').toLowerCase().includes(q) || (s.journal||'').toLowerCase().includes(q)
    const matchD = designFilter === 'All' || s.design === designFilter
    const matchDec = decisionFilter === 'all'
      || (decisionFilter === 'included'  && s.screen_decision === 'include')
      || (decisionFilter === 'excluded'  && s.screen_decision === 'exclude')
      || (decisionFilter === 'uncertain' && s.screen_decision === 'uncertain')
      || (decisionFilter === 'pending'   && !s.screen_decision)
    return matchQ && matchD && matchDec
  })

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) { showToast('Please upload a .csv file', 'error'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const rows = parseCSV(e.target.result)
      if (!rows.length) { showToast('No data found in CSV', 'error'); return }
      const imported = rows.map((row, i) => csvRowToStudy(row, i, reviews[0]?.id)).filter(s => s.title.trim())
      setStudies(prev => {
        const existing = new Set(prev.map(s => (s.title||'').toLowerCase().trim()))
        const newOnes  = imported.filter(s => !existing.has(s.title.toLowerCase().trim()))
        showToast(`Imported ${newOnes.length} studies${imported.length - newOnes.length ? ' · ' + (imported.length - newOnes.length) + ' duplicates skipped' : ''}`, 'success')
        return [...newOnes, ...prev]
      })
    }
    reader.readAsText(file)
  }

  const runScreenAll = () => {
    const p = studies.filter(s => !s.screen_decision)
    if (!p.length) { showToast('No pending studies', 'error'); return }
    setStudies(prev => prev.map(s => {
      if (s.screen_decision) return s
      const r = keywordScreen(s.title, s.authors, s.journal)
      return { ...s, screen_decision: r.decision, screen_reason: r.reason, screen_confidence: r.confidence }
    }))
    showToast(`Screened ${p.length} studies — review uncertain cases manually`, 'success')
  }

  const manualDecide = (id, decision) => {
    setStudies(prev => prev.map(s => s.id === id
      ? { ...s, screen_decision: decision, screen_reason: 'Manually decided', screen_confidence: 'high' } : s))
  }

  const exportCSV = (type) => {
    const rows = type === 'included'
      ? studies.filter(s => s.screen_decision === 'include')
      : studies.filter(s => s.screen_decision)
    if (!rows.length) { showToast('No studies to export', 'error'); return }
    const h = ['Title','Authors','Journal','Year','DOI','PMID','Decision','Confidence','Reason']
    const lines = rows.map(s => h.map(k =>
      '"' + String(({Title:s.title,Authors:s.authors,Journal:s.journal,Year:s.year,
        DOI:s.doi||'',PMID:s.pmid||'',Decision:s.screen_decision||'',
        Confidence:s.screen_confidence||'',Reason:s.screen_reason||''})[k]||'').replace(/"/g,'""') + '"'
    ).join(','))
    const blob = new Blob([[h.join(','),...lines].join('\n')], {type:'text/csv'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = type + '-studies.csv'; a.click()
    showToast('Exported ' + rows.length + ' studies', 'success')
  }

  const decColor = dec => dec==='include'?'var(--green)':dec==='exclude'?'var(--red)':dec==='uncertain'?'var(--amber)':'var(--border-strong)'

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <h1>Literature Library</h1>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-ghost" onClick={() => exportCSV('included')}><Icon name="download" size={14}/>Export included</button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}><Icon name="plus" size={15}/>Add study</button>
          </div>
        </div>
        <div style={{marginTop:10,display:'flex',gap:10}}>
          <div className="search-wrap" style={{flex:1}}>
            <Icon name="search" size={16}/>
            <input className="search-input" placeholder="Search by title, author, keyword…" value={query} onChange={e => setQuery(e.target.value)}/>
          </div>
        </div>
        <div className="filter-row" style={{marginTop:8}}>
          {designs.map(d => <button key={d} className={`filter-chip${designFilter===d?' active':''}`} onClick={() => setDesignFilter(d)}>{d}</button>)}
        </div>
      </div>

      <div className="page-body">
        {/* CSV Upload */}
        <div
          className={`upload-zone${dragging?' drag':''}`}
          onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0])}}
          onClick={()=>fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{margin:'0 auto 10px',display:'block',stroke:'var(--ink-ghost)'}}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div style={{fontWeight:600,fontSize:14,color:'var(--ink-mid)'}}>{dragging ? 'Drop PubMed CSV here' : 'Upload PubMed / Database CSV'}</div>
          <div style={{fontSize:12,color:'var(--ink-soft)',marginTop:3}}>Drag & drop or click · Supports PubMed, Embase, Scopus, CINAHL export formats</div>
        </div>

        {/* Screening panel */}
        {studies.length > 0 && (
          <div className="screen-panel">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div>
                <div style={{fontWeight:600,fontSize:14}}>Keyword Screener</div>
                <div style={{fontSize:12,color:'var(--ink-soft)',marginTop:2}}>Free · instant · runs in your browser · based on your PICO keywords</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-ghost btn-sm" onClick={() => setStudies(prev => prev.map(s => ({...s,screen_decision:null,screen_reason:null})))}>Reset</button>
                <button className="btn btn-ghost btn-sm" onClick={() => exportCSV('all')}>Export all CSV</button>
                <button className="btn btn-primary btn-sm" onClick={runScreenAll} disabled={!pending}>
                  <Icon name="check" size={13}/>Screen {pending} pending
                </button>
              </div>
            </div>
            <div style={{background:'var(--accent-light)',border:'1px solid rgba(38,83,163,.15)',borderRadius:'var(--radius-sm)',padding:'8px 12px',marginBottom:10,fontSize:12,color:'var(--ink-mid)'}}>
              <strong style={{color:'var(--accent)'}}>100% free</strong> — no API key needed. Matches GLP-1/SGLT-2 drug terms and T2DM risk/preference keywords. Review <span style={{color:'var(--amber)',fontWeight:600}}>uncertain</span> results manually.
              {' '}<span style={{color:'var(--ink-soft)'}}>Customise keywords in <code style={{fontSize:11}}>src/lib/screener.js</code></span>
            </div>
            <div className="screen-bar-wrap"><div className="screen-bar" style={{width:pct+'%'}}/></div>
            <div className="screen-counts">
              <span style={{color:'var(--ink-soft)'}}>{pct}% ({screened}/{studies.length})</span>
              <span style={{color:'var(--green)',fontWeight:600}}>✓ {included} include</span>
              <span style={{color:'var(--red)',fontWeight:600}}>✗ {excluded} exclude</span>
              {uncertain > 0 && <span style={{color:'var(--amber)',fontWeight:600}}>⚠ {uncertain} uncertain</span>}
              {pending > 0 && <span style={{color:'var(--ink-ghost)'}}>· {pending} pending</span>}
            </div>
          </div>
        )}

        {/* Decision filter tabs */}
        {studies.length > 0 && (
          <div className="ftabs">
            {[['all','All',studies.length],['included','Include',included],['excluded','Exclude',excluded],['uncertain','⚠ Uncertain',uncertain],['pending','Pending',pending]].map(([k,l,c]) => (
              <button key={k} className={`ftab${decisionFilter===k?' active':''}`} onClick={() => setDecisionFilter(k)}>
                {l} <span style={{fontSize:11,background:'var(--bg)',padding:'1px 6px',borderRadius:10,marginLeft:4}}>{c}</span>
              </button>
            ))}
          </div>
        )}

        {/* Study list */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Icon name="search" size={40}/>
            <h3>{studies.length === 0 ? 'No studies yet' : 'No studies match this filter'}</h3>
            <p>{studies.length === 0 ? 'Upload a CSV from PubMed, Embase, or Scopus above.' : 'Try a different filter.'}</p>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {filtered.map(s => {
              const dec = s.screen_decision
              const bc = decColor(dec)
              return (
                <div key={s.id} style={{background:'var(--surface)',border:`1px solid ${bc}`,borderLeft:`4px solid ${bc}`,borderRadius:'var(--radius)',padding:'1rem 1.2rem'}}>
                  <div style={{fontWeight:600,fontSize:13.5,color:'var(--ink)',lineHeight:1.45,marginBottom:4}}>{s.title}</div>
                  <div style={{fontSize:12,color:'var(--ink-soft)',marginBottom:6}}>
                    {s.authors && <span>{s.authors.split(',')[0]}{s.authors.includes(',')?' et al.':''} · </span>}
                    <em>{s.journal}</em>{s.year?' '+s.year:''}
                    {s.doi && <span> · <a href={'https://doi.org/'+s.doi} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>DOI ↗</a></span>}
                    {s.pmid && <span> · <a href={'https://pubmed.ncbi.nlm.nih.gov/'+s.pmid} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>PubMed ↗</a></span>}
                  </div>
                  {dec && (
                    <div style={{marginBottom:6}}>
                      <span className={`dec-badge dec-${dec}`}>{dec==='include'?'✓ Include':dec==='exclude'?'✗ Exclude':'⚠ Uncertain'}</span>
                      {s.screen_reason && <span style={{fontSize:11,color:'var(--ink-mid)',marginLeft:6,fontStyle:'italic'}}>{s.screen_reason}</span>}
                    </div>
                  )}
                  <div style={{display:'flex',gap:6,alignItems:'center',marginTop:8,paddingTop:8,borderTop:'1px solid var(--border)'}}>
                    {[['include','✓ Include','var(--green-light)','var(--green)'],['exclude','✗ Exclude','var(--red-light)','var(--red)'],['uncertain','⚠ Uncertain','var(--amber-light)','var(--amber)']].map(([d,l,bg,col]) => (
                      <button key={d} className="btn btn-sm" onClick={() => manualDecide(s.id, d)}
                        style={{background:dec===d?col:bg,color:dec===d?'white':col,border:'none',fontSize:12}}>{l}</button>
                    ))}
                    {dec && <button className="btn btn-sm btn-ghost" onClick={() => setStudies(prev => prev.map(x => x.id===s.id?{...x,screen_decision:null,screen_reason:null}:x))}>Undo</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add study modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Add study manually</div>
              <button className="modal-close" onClick={() => setShowModal(false)}><Icon name="x"/></button>
            </div>
            <div className="form-row">
              <div className="form-field" style={{gridColumn:'1/-1'}}><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Full study title"/></div>
              <div className="form-field"><label className="form-label">Authors</label><input className="form-input" value={form.authors} onChange={e=>setForm(f=>({...f,authors:e.target.value}))} placeholder="Smith J, Jones A"/></div>
              <div className="form-field"><label className="form-label">Journal</label><input className="form-input" value={form.journal} onChange={e=>setForm(f=>({...f,journal:e.target.value}))} placeholder="Lancet, BMJ…"/></div>
              <div className="form-field"><label className="form-label">Year</label><input className="form-input" type="number" value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))}/></div>
              <div className="form-field"><label className="form-label">Design</label>
                <select className="form-input" value={form.design} onChange={e=>setForm(f=>({...f,design:e.target.value}))}>
                  {['RCT','Cohort','Observational','Qualitative','Case-Control'].map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-field"><label className="form-label">n</label><input className="form-input" type="number" value={form.n} onChange={e=>setForm(f=>({...f,n:e.target.value}))} placeholder="312"/></div>
              <div className="form-field"><label className="form-label">Primary outcome</label><input className="form-input" value={form.outcome} onChange={e=>setForm(f=>({...f,outcome:e.target.value}))} placeholder="HbA1c (%)"/></div>
              <div className="form-field"><label className="form-label">Effect size</label><input className="form-input" value={form.effect_size} onChange={e=>setForm(f=>({...f,effect_size:e.target.value}))} placeholder="-0.41"/></div>
              <div className="form-field"><label className="form-label">95% CI</label><input className="form-input" value={form.ci} onChange={e=>setForm(f=>({...f,ci:e.target.value}))} placeholder="(-0.57, -0.25)"/></div>
              <div className="form-field"><label className="form-label">Risk of bias</label>
                <select className="form-input" value={form.rob_score} onChange={e=>setForm(f=>({...f,rob_score:e.target.value}))}>
                  {['Low','Moderate','High'].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-field" style={{gridColumn:'1/-1'}}><label className="form-label">Abstract</label><textarea className="form-input" value={form.abstract} onChange={e=>setForm(f=>({...f,abstract:e.target.value}))} placeholder="Paste abstract…"/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={addLoading||!form.title.trim()} onClick={async () => {
                setAddLoading(true)
                const ns = {id:Date.now().toString(),...form,n:parseInt(form.n)||0,included:true}
                if (isConfigured && !DEMO_MODE) {
                  const { data, error } = await supabase.from('studies').insert([{...form,n:parseInt(form.n)||0,included:true}]).select().single()
                  if (error) showToast(error.message, 'error')
                  else { setStudies(prev => [data,...prev]); showToast('Study added','success'); setShowModal(false) }
                } else {
                  setStudies(prev => [ns,...prev]); showToast('Study added','success'); setShowModal(false)
                }
                setAddLoading(false)
              }}>{addLoading?<span className="loading-spin"/>:'Add study'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
