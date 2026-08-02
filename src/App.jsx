import { useState, useEffect } from 'react'
import { supabase, isConfigured } from './lib/supabase.js'
import Icon from './components/Icon.jsx'
import Library from './pages/Library.jsx'
import SearchStrategy from './pages/SearchStrategy.jsx'

// ── Demo data ──
const DEMO_REVIEWS = [
  { id:'1', title:'Risk attributes of GLP-1 RAs and SGLT-2 inhibitors for T2DM', pico:'In adults with T2DM, what risk attributes of GLP-1 RAs/SGLT-2 inhibitors influence patient preferences in DCEs?', status:'active', studies_count:0, protocol_id:'', created_at:'2025-01-01', lead:'You' },
]
const DEMO_STUDIES = []
const DEMO_TEAM = []
const DEMO_PRISMA = { identified:0, screened:0, eligible:0, included:0, excl_title:0, excl_fulltext:0 }

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t) }, [])
  return <div className={`toast ${type}`}>{msg}</div>
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true)
    if (!supabase) { setError('Supabase not configured. Copy .env.example to .env and fill in your keys.'); setLoading(false); return }
    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onLogin(data.user)
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
        if (error) throw error
        setSuccess('Check your email to confirm, then sign in.'); setMode('login')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setSuccess('Reset link sent to your email.')
      }
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleGoogle = async () => {
    if (!supabase) { setError('Supabase not configured.'); return }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
    if (error) setError(error.message)
  }

  return (
    <div className="auth-root">
      <div className="auth-left">
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'3rem'}}>
          <div className="logo-box"><Icon name="layers" size={16}/></div>
          <span style={{fontFamily:'DM Serif Display,serif',fontSize:'1.3rem',color:'white'}}>SystematicaHub</span>
        </div>
        <h1>Evidence synthesis,<br/><em>made rigorous</em></h1>
        <p>Open-source platform for systematic reviews, meta-analyses, and HEOR evidence maps — aligned with PRISMA 2020 and Cochrane standards.</p>
        {[['sparkle','AI search strategy builder (PubMed, Embase, Scopus, CINAHL…)'],
          ['search','PubMed/database CSV import + keyword screener'],
          ['layers','PRISMA 2020 flow diagram builder'],
          ['file','Structured data extraction & export'],
          ['check','Risk of bias & GRADE appraisal tools'],
          ['users','Team collaboration & screening']
        ].map(([icon, text]) => (
          <div key={icon} className="auth-pill">
            <div className="auth-pill-icon"><Icon name={icon} size={16}/></div>
            <span className="auth-pill-text">{text}</span>
          </div>
        ))}
        {!isConfigured && (
          <div style={{marginTop:'1.5rem',background:'rgba(255,255,255,.1)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'rgba(255,255,255,.7)'}}>
            ℹ️ Running without Supabase — copy <code>.env.example</code> to <code>.env</code> to enable login & database.
          </div>
        )}
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <h2>{mode==='login'?'Sign in':mode==='signup'?'Create account':'Reset password'}</h2>
          <p className="auth-card-sub">{mode==='login'?'Welcome back to SystematicaHub':mode==='signup'?'Start your first systematic review':'We\'ll send a reset link'}</p>
          {error   && <div className="error-msg"   style={{marginBottom:12}}>{error}</div>}
          {success && <div className="success-msg" style={{marginBottom:12}}>{success}</div>}
          {!isConfigured && (
            <div style={{background:'var(--amber-light)',border:'1px solid rgba(196,122,30,.3)',borderRadius:'var(--radius-sm)',padding:'9px 13px',fontSize:12,color:'var(--ink-mid)',marginBottom:12}}>
              Supabase not configured — <strong>add your .env keys</strong> to enable login, or use demo mode below.
              <br/><button style={{background:'none',border:'none',color:'var(--accent)',fontWeight:600,cursor:'pointer',fontSize:12,padding:0,marginTop:4}}
                onClick={() => onLogin({email:'demo@researcher.edu',user_metadata:{full_name:'Demo Researcher'}})}>
                Continue in demo mode →
              </button>
            </div>
          )}
          <div className="auth-form">
            {mode==='signup' && <div><label className="field-label">Full name</label><input className="field-input" placeholder="Dr. Jane Smith" value={fullName} onChange={e=>setFullName(e.target.value)}/></div>}
            <div><label className="field-label">Email</label><input className="field-input" type="email" placeholder="you@university.edu" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/></div>
            {mode!=='reset' && <div><label className="field-label">Password</label><input className="field-input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/></div>}
            {mode==='login' && <div style={{textAlign:'right',marginTop:-6}}><button style={{background:'none',border:'none',color:'var(--accent)',fontSize:13,cursor:'pointer'}} onClick={()=>setMode('reset')}>Forgot password?</button></div>}
            <button className="btn btn-primary btn-full btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading?<span className="loading-spin"/>:mode==='login'?'Sign in':mode==='signup'?'Create account':'Send reset link'}
            </button>
            {mode!=='reset' && <>
              <div className="divider-or">or</div>
              <button className="google-btn" onClick={handleGoogle}>
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
            </>}
          </div>
          <div className="auth-switch">
            {mode==='login'?<>Don't have an account? <button onClick={()=>{setMode('signup');setError('')}}>Sign up free</button></>:<><button onClick={()=>{setMode('login');setError('')}}>← Back to sign in</button></>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Sidebar({ active, onNav, user, onLogout }) {
  const initials = (user?.user_metadata?.full_name||user?.email||'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const navItems = [
    ['home','Dashboard','home'],
    ['layers','My Reviews','reviews'],
    ['sparkle','Search Strategy','strategy'],
    ['search','Literature Library','library'],
    ['chart','PRISMA Builder','prisma'],
    ['file','Data Extraction','extraction'],
    ['check','Quality Appraisal','quality'],
    ['users','Team & Collaboration','team'],
  ]
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-box"><Icon name="layers" size={16}/></div>
        <div className="logo-name">SystematicaHub<span>Evidence Synthesis</span></div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-label">Workspace</div>
        {navItems.map(([icon,label,key]) => (
          <button key={key} className={`nav-item${active===key?' active':''}`} onClick={() => onNav(key)}>
            <Icon name={icon} size={16}/>{label}
          </button>
        ))}
        <div className="nav-section-label" style={{marginTop:8}}>Account</div>
        <button className="nav-item" onClick={() => onNav('settings')}><Icon name="settings" size={16}/>Settings</button>
      </nav>
      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">{initials}</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="user-name">{user?.user_metadata?.full_name||'Researcher'}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-soft)',padding:4}} onClick={onLogout} title="Sign out"><Icon name="logout" size={15}/></button>
        </div>
      </div>
    </div>
  )
}

// Simple placeholder pages (extend as needed)
function Dashboard({ reviews, studies, onNav }) {
  const active = reviews.filter(r=>r.status==='active').length
  return (
    <div>
      <div className="page-header"><div className="page-header-row"><h1>Dashboard</h1><button className="btn btn-primary" onClick={()=>onNav('reviews')}><Icon name="plus" size={15}/>New review</button></div></div>
      <div className="page-body">
        <div className="grid-4" style={{marginBottom:24}}>
          {[['Total reviews',reviews.length,'layers'],['Active reviews',active,'chart'],['Studies indexed',studies.length,'file'],['Team members',3,'users']].map(([label,num,icon])=>(
            <div className="stat-card" key={label}>
              <div style={{color:'var(--ink-soft)',marginBottom:8}}><Icon name={icon} size={16}/></div>
              <div className="stat-num">{num}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
        <div className="section-head"><div className="section-title">Recent reviews</div><button className="btn btn-ghost btn-sm" onClick={()=>onNav('reviews')}>View all</button></div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {reviews.slice(0,3).map(r=>(
            <div className="review-card" key={r.id}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:6}}>
                <div style={{fontWeight:600,fontSize:14.5,color:'var(--ink)'}}>{r.title}</div>
                <span className={`badge badge-${r.status}`}>{r.status}</span>
              </div>
              {r.pico && <div style={{fontSize:12,color:'var(--ink-mid)',marginTop:4,lineHeight:1.5}}>{r.pico}</div>}
              <div className="progress-bar"><div className="progress-fill" style={{width:r.status==='complete'?'100%':'65%'}}/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ReviewsPage({ reviews, setReviews, user, showToast }) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({title:'',pico:'',protocol_id:'',status:'draft'})
  const [loading, setLoading] = useState(false)
  const handleCreate = async () => {
    if (!form.title.trim()) return
    setLoading(true)
    const nr = {id:Date.now().toString(),...form,studies_count:0,created_at:new Date().toISOString(),lead:user?.email||'You'}
    if (isConfigured) {
      const {data,error} = await supabase.from('reviews').insert([{...form,lead_id:user.id}]).select().single()
      if (error) { showToast(error.message,'error'); setLoading(false); return }
      setReviews(prev=>[data,...prev])
    } else setReviews(prev=>[nr,...prev])
    showToast('Review created','success'); setShowModal(false); setForm({title:'',pico:'',protocol_id:'',status:'draft'})
    setLoading(false)
  }
  return (
    <div>
      <div className="page-header"><div className="page-header-row"><h1>My Reviews</h1><button className="btn btn-primary" onClick={()=>setShowModal(true)}><Icon name="plus" size={15}/>New review</button></div></div>
      <div className="page-body">
        {reviews.length===0?<div className="empty-state"><Icon name="layers" size={40}/><h3>No reviews yet</h3><p>Create your first systematic review.</p><div style={{marginTop:16}}><button className="btn btn-primary" onClick={()=>setShowModal(true)}>Create review</button></div></div>:(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {reviews.map(r=>(
              <div className="review-card" key={r.id}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:6}}>
                  <div style={{fontWeight:600,fontSize:14.5,color:'var(--ink)'}}>{r.title}</div>
                  <span className={`badge badge-${r.status}`}>{r.status}</span>
                </div>
                {r.pico&&<div style={{fontSize:12,color:'var(--ink-mid)',marginBottom:6,lineHeight:1.5}}>{r.pico}</div>}
                <div style={{fontSize:12,color:'var(--ink-soft)',display:'flex',gap:12}}>
                  <span>{r.studies_count||0} studies</span>
                  {r.protocol_id&&<span>Protocol: {r.protocol_id}</span>}
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{width:r.status==='complete'?'100%':r.status==='active'?'65%':'20%'}}/></div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">New systematic review</div><button className="modal-close" onClick={()=>setShowModal(false)}><Icon name="x"/></button></div>
            <div className="form-row">
              <div className="form-field" style={{gridColumn:'1/-1'}}><label className="form-label">Review title *</label><input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Full title of your systematic review"/></div>
              <div className="form-field" style={{gridColumn:'1/-1'}}><label className="form-label">PICO question</label><textarea className="form-input" value={form.pico} onChange={e=>setForm(f=>({...f,pico:e.target.value}))} placeholder="In [population], does [intervention] vs [comparator] affect [outcome]?"/></div>
              <div className="form-field"><label className="form-label">PROSPERO / INPLASY ID</label><input className="form-input" value={form.protocol_id} onChange={e=>setForm(f=>({...f,protocol_id:e.target.value}))} placeholder="CRD42024…"/></div>
              <div className="form-field"><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option value="draft">Draft</option><option value="active">Active</option><option value="complete">Complete</option></select></div>
            </div>
            <div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate} disabled={loading||!form.title.trim()}>{loading?<span className="loading-spin"/>:'Create review'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

function PrismaPage() {
  const [data, setData] = useState(DEMO_PRISMA)
  const max = data.identified||1
  const pct = n => `${Math.min(100,Math.round((n/max)*100))}%`
  return (
    <div>
      <div className="page-header"><div className="page-header-row"><h1>PRISMA Flow Builder</h1></div></div>
      <div className="page-body">
        <div className="card card-p" style={{marginBottom:16}}>
          <div style={{fontWeight:600,marginBottom:12}}>Enter your screening numbers</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[['identified','Records identified'],['screened','Records screened'],['eligible','Full-texts assessed'],['included','Studies included'],['excl_title','Excluded at title/abstract'],['excl_fulltext','Excluded at full-text']].map(([key,label])=>(
              <div className="form-field" key={key}><label className="form-label">{label}</label><input className="form-input" type="number" value={data[key]} onChange={e=>setData(d=>({...d,[key]:parseInt(e.target.value)||0}))}/></div>
            ))}
          </div>
        </div>
        <div className="card card-p">
          <div style={{fontWeight:600,fontSize:15,marginBottom:4}}>PRISMA 2020 flow diagram</div>
          <div style={{fontSize:12,color:'var(--ink-soft)',marginBottom:20}}>Auto-generated from your numbers above</div>
          <div className="prisma-grid">
            <div className="prisma-phase"><div className="phase-header ph-ident">Identification</div><div className="phase-box"><strong>Records identified</strong>Databases & registers<div className="phase-n">{data.identified?.toLocaleString()}</div><div className="funnel-bar-wrap"><div className="funnel-bar" style={{width:'100%',background:'var(--accent)'}}/></div></div></div>
            <div className="prisma-phase"><div className="phase-header ph-screen">Screening</div><div className="phase-box"><strong>Records screened</strong>After deduplication<div className="phase-n">{data.screened?.toLocaleString()}</div><div className="funnel-bar-wrap"><div className="funnel-bar" style={{width:pct(data.screened),background:'var(--teal)'}}/></div></div><div className="phase-excl" style={{fontSize:11,color:'var(--ink-soft)',border:'1px dashed var(--border-strong)',borderRadius:'var(--radius-sm)',padding:'9px 12px'}}><div style={{fontWeight:700,color:'var(--red)',fontSize:10,textTransform:'uppercase',marginBottom:3}}>Excluded</div>Not relevant to PICO<div style={{fontFamily:'JetBrains Mono',fontSize:'1rem',color:'var(--red)',marginTop:2}}>n = {(data.excl_title||0).toLocaleString()}</div></div></div>
            <div className="prisma-phase"><div className="phase-header ph-elig">Eligibility</div><div className="phase-box"><strong>Full-texts assessed</strong>Eligibility review<div className="phase-n">{data.eligible?.toLocaleString()}</div><div className="funnel-bar-wrap"><div className="funnel-bar" style={{width:pct(data.eligible),background:'var(--amber)'}}/></div></div><div className="phase-excl" style={{fontSize:11,color:'var(--ink-soft)',border:'1px dashed var(--border-strong)',borderRadius:'var(--radius-sm)',padding:'9px 12px'}}><div style={{fontWeight:700,color:'var(--red)',fontSize:10,textTransform:'uppercase',marginBottom:3}}>Excluded</div>Ineligible full-texts<div style={{fontFamily:'JetBrains Mono',fontSize:'1rem',color:'var(--red)',marginTop:2}}>n = {(data.excl_fulltext||0).toLocaleString()}</div></div></div>
            <div className="prisma-phase"><div className="phase-header ph-incl">Included</div><div className="phase-box" style={{borderColor:'var(--green)',background:'var(--green-light)'}}><strong style={{color:'var(--green)'}}>Studies included</strong>In final review<div className="phase-n" style={{color:'var(--green)'}}>{data.included?.toLocaleString()}</div><div className="funnel-bar-wrap"><div className="funnel-bar" style={{width:pct(data.included),background:'var(--green)'}}/></div></div></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SimpleQuality() {
  const [tool,setTool]=useState('rob2')
  const [scores,setScores]=useState({d1:'Low',d2:'Low',d3:'Some concern',d4:'Low',d5:'Low'})
  const overall=Object.values(scores).includes('High')?'High':Object.values(scores).includes('Some concern')?'Some concern':'Low'
  const oc=overall==='Low'?'var(--green)':overall==='High'?'var(--red)':'var(--amber)'
  return(
    <div>
      <div className="page-header"><div className="page-header-row"><h1>Quality Appraisal</h1></div></div>
      <div className="page-body">
        <div className="tabs">{[['rob2','RoB 2.0'],['grade','GRADE'],['nos','Newcastle–Ottawa'],['casp','CASP']].map(([k,l])=><button key={k} className={`tab${tool===k?' active':''}`} onClick={()=>setTool(k)}>{l}</button>)}</div>
        {tool==='rob2'&&<div className="grid-2"><div className="card card-p"><div style={{fontWeight:600,marginBottom:12}}>Cochrane RoB 2.0</div>{['D1 · Randomisation','D2 · Deviations','D3 · Missing data','D4 · Measurement','D5 · Reporting'].map((d,i)=>{const k='d'+(i+1);return(<div key={d} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:'8px 0',borderBottom:i<4?'1px solid var(--border)':'none'}}><div style={{fontSize:13,color:'var(--ink-mid)',flex:1}}>{d}</div><select className="form-input" style={{width:140}} value={scores[k]} onChange={e=>setScores(s=>({...s,[k]:e.target.value}))}><option>Low</option><option>Some concern</option><option>High</option></select></div>)})}<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:14,paddingTop:12,borderTop:'2px solid var(--border)'}}><div style={{fontWeight:600}}>Overall</div><div style={{fontWeight:700,color:oc}}>{overall==='Low'?'✓ Low risk':overall==='High'?'✗ High risk':'⚠ Some concern'}</div></div></div></div>}
        {tool==='grade'&&<div className="card card-p" style={{maxWidth:560}}><div style={{fontWeight:600,marginBottom:12}}>GRADE Evidence Profile</div>{[['Risk of bias'],['Inconsistency'],['Indirectness'],['Imprecision'],['Publication bias']].map(([d])=><div key={d} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}><div style={{fontSize:13,color:'var(--ink-mid)',width:140}}>{d}</div><select className="form-input" style={{flex:1}}><option>Not serious</option><option>Serious (-1)</option><option>Very serious (-2)</option></select></div>)}<div style={{display:'flex',justifyContent:'space-between',marginTop:14,paddingTop:12,borderTop:'2px solid var(--border)'}}><span style={{fontWeight:600}}>Certainty</span><span style={{fontWeight:700,color:'var(--amber)'}}>⊕⊕⊕⊝ Moderate</span></div></div>}
      </div>
    </div>
  )
}

function SettingsPage({ user, showToast }) {
  const [name, setName] = useState(user?.user_metadata?.full_name||'')
  return (
    <div>
      <div className="page-header"><div className="page-header-row"><h1>Settings</h1></div></div>
      <div className="page-body">
        <div className="card card-p" style={{maxWidth:480,marginBottom:16}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Profile</div>
          <div className="form-field" style={{marginBottom:12}}><label className="form-label">Full name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)}/></div>
          <div className="form-field" style={{marginBottom:14}}><label className="form-label">Email</label><input className="form-input" value={user?.email||''} disabled style={{opacity:.6}}/></div>
          <button className="btn btn-primary" onClick={()=>showToast('Profile saved','success')}>Save changes</button>
        </div>
        <div className="card card-p" style={{maxWidth:480}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>Supabase connection</div>
          <div style={{display:'flex',gap:10,alignItems:'center',fontSize:13,color:'var(--ink-mid)'}}>
            <span style={{width:10,height:10,borderRadius:'50%',background:isConfigured?'var(--green)':'var(--amber)',display:'inline-block'}}/>
            {isConfigured?'Connected to Supabase':'Demo mode — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN APP ──
export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('home')
  const [reviews, setReviews] = useState(DEMO_REVIEWS)
  const [studies, setStudies] = useState(DEMO_STUDIES)
  const [team, setTeam] = useState(DEMO_TEAM)
  const [loading, setLoading] = useState(isConfigured)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type='success') => setToast({ msg, type })

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(data.session.user)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null); setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user || !isConfigured) return
    supabase.from('reviews').select('*').order('created_at',{ascending:false}).then(({data})=>data&&setReviews(data))
    supabase.from('studies').select('*').order('created_at',{ascending:false}).then(({data})=>data&&setStudies(data))
  }, [user])

  const handleLogout = async () => {
    if (isConfigured) await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}><div className="loading-spin" style={{width:36,height:36,borderColor:'rgba(38,83,163,.2)',borderTopColor:'var(--accent)'}}/></div>
  if (!user) return <AuthScreen onLogin={setUser}/>

  const pages = {
    home:       <Dashboard reviews={reviews} studies={studies} onNav={setPage}/>,
    reviews:    <ReviewsPage reviews={reviews} setReviews={setReviews} user={user} showToast={showToast}/>,
    strategy:   <SearchStrategy showToast={showToast}/>,
    library:    <Library studies={studies} setStudies={setStudies} reviews={reviews} showToast={showToast}/>,
    prisma:     <PrismaPage/>,
    extraction: <div className="page-body" style={{padding:'2rem'}}><h2 style={{fontFamily:'DM Serif Display,serif'}}>Data Extraction</h2><p style={{marginTop:8,color:'var(--ink-mid)'}}>Upload a CSV to the Library then export included studies as CSV for extraction.</p></div>,
    quality:    <SimpleQuality/>,
    team:       <div className="page-body" style={{padding:'2rem'}}><h2 style={{fontFamily:'DM Serif Display,serif'}}>Team & Collaboration</h2><p style={{marginTop:8,color:'var(--ink-mid)'}}>Invite co-reviewers via Supabase Auth — coming in next release.</p></div>,
    settings:   <SettingsPage user={user} showToast={showToast}/>,
  }

  return (
    <div className="app-root">
      <Sidebar active={page} onNav={setPage} user={user} onLogout={handleLogout}/>
      <main className="main-content">{pages[page]||pages.home}</main>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  )
}
