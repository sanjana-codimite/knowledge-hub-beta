import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || ''
const SESSION_KEY = 'atlas.session'

const docs = [
  { id: 1, title: 'Payments service runbook', type: 'PDF', project: 'Payments', icon: '▤', status: 'Current', meta: 'updated 3d ago · Nadia R.', excerpt: 'On-call procedures for the settlement pipeline: retry windows, dead-letter replay, and the escalation ladder for stuck payouts.', tags: ['oncall', 'runbook', 'settlement'] },
  { id: 2, title: 'README — atlas-ingest', type: 'README', project: 'Platform', icon: '›_', status: 'Current', meta: 'synced from GitHub · 1d ago', excerpt: 'Local setup, env vars and the ingestion CLI. Covers parser plugins for PDF, Markdown and Google Docs exports.', tags: ['setup', 'cli', 'ingest'] },
  { id: 3, title: 'Onboarding checklist for new hires', type: 'Google Doc', project: 'People', icon: '◲', status: 'Outdated', meta: 'updated 7mo ago · Priya M.', excerpt: 'Day-one accounts, laptop provisioning and the buddy programme. Some tooling steps predate the SSO migration.', tags: ['onboarding', 'accounts', 'sso'] },
  { id: 4, title: 'Designing idempotent webhooks', type: 'Medium', project: 'Platform', icon: '✎', status: 'Current', meta: 'saved by Tom B. · 2w ago', excerpt: 'External write-up the team uses as the reference for webhook keys, replay windows and consumer-side deduplication.', tags: ['webhooks', 'idempotency'] },
  { id: 5, title: 'Multi-region failover drill notes', type: 'PDF', project: 'Platform', icon: '▤', status: 'In review', meta: 'updated 5d ago · Sam O.', excerpt: 'What broke during the June drill, how long DNS propagation actually took, and the follow-up actions still open.', tags: ['failover', 'incident', 'dns'] },
]

const threads = [
  { id: 1, title: "Why do payouts stall at 'pending_capture'?", project: 'Payments', status: 'Answered', preview: 'Seeing payouts stuck for over an hour. Nothing in the dead-letter queue.', meta: '6 replies · 2d ago' },
  { id: 2, title: 'Which accounts are auto-provisioned after SSO?', project: 'People', status: 'Answered', preview: 'The onboarding doc still lists manual Jira and Figma steps.', meta: '2 replies · 5d ago' },
  { id: 3, title: 'How do I add a new parser plugin?', project: 'Platform', status: 'Answered', preview: 'Want to index Confluence exports without patching the ingest service.', meta: '3 replies · 1w ago' },
  { id: 4, title: 'Do we still need a manual DNS cutover?', project: 'Platform', status: 'Open', preview: 'Drill notes say yes, but the new health checks might handle it.', meta: '4 replies · open' },
]

async function request(path, options = {}, session, onSession) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  let response = await fetch(`${API}${path}`, { ...options, headers })
  if (response.status === 401 && session?.refresh_token) {
    const refresh = await fetch(`${API}/web/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }) })
    if (refresh.ok) {
      const next = await refresh.json()
      onSession({ ...session, ...next })
      headers.Authorization = `Bearer ${next.access_token}`
      response = await fetch(`${API}${path}`, { ...options, headers })
    }
  }
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `Request failed (${response.status})`)
  return response.status === 204 ? null : response.json()
}

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'))
  const [user, setUser] = useState(null)
  const [view, setView] = useState('search')
  const [query, setQuery] = useState('')
  const [project, setProject] = useState('All projects')
  const [sidebar, setSidebar] = useState(false)
  const [panel, setPanel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const saveSession = (next) => { setSession(next); if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next)); else localStorage.removeItem(SESSION_KEY) }

  useEffect(() => {
    if (!session) return
    request('/web/auth/me', {}, session, saveSession).then(setUser).catch(() => { saveSession(null); setUser(null) })
  }, [session])

  const signIn = () => {
    setError(''); setBusy(true)
    const popup = window.open(`${API}/web/auth/google/login`, 'atlas-google-login', 'popup,width=520,height=700')
    if (!popup) { setBusy(false); setError('Please allow popups to continue with Google.'); return }
    const started = Date.now()
    const timer = window.setInterval(async () => {
      if (popup.closed || Date.now() - started > 120000) {
        window.clearInterval(timer); setBusy(false); if (!popup.closed) popup.close(); return
      }
      try {
        if (!popup.location.href.startsWith(window.location.origin)) return
        const raw = popup.document.body?.innerText || ''
        if (!raw.includes('access_token')) return
        const result = JSON.parse(raw)
        window.clearInterval(timer); popup.close()
        saveSession(result.tokens); setUser(result.user); setBusy(false)
      } catch { /* Cross-origin until Google redirects back. */ }
    }, 500)
  }

  const signOut = async () => { try { await request('/web/auth/logout', { method: 'POST' }, session, saveSession) } catch { /* Session is cleared locally either way. */ } saveSession(null); setUser(null) }

  const filteredDocs = useMemo(() => docs.filter((doc) => {
    const text = `${doc.title} ${doc.excerpt} ${doc.tags.join(' ')}`.toLowerCase()
    return (project === 'All projects' || doc.project === project) && (!query || text.includes(query.toLowerCase()))
  }), [project, query])

  if (!session || !user) return <LoginScreen busy={busy} error={error} onSignIn={signIn} />

  return (
    <div className="app-shell">
      <header className="topbar"><button className="icon-button menu" onClick={() => setSidebar(!sidebar)} aria-label="Toggle navigation">☰</button><div className="brand"><span className="brand-mark">✦</span><strong>Atlas</strong></div><div className="search"><span>⌕</span><input value={query} onChange={(e) => { setQuery(e.target.value); setView('search') }} placeholder="Search docs, READMEs, threads..." /><kbd>⌘ K</kbd></div><button className="upload-button" onClick={() => setPanel('upload')}>＋ Upload</button><button className="avatar" onClick={signOut} title="Sign out">{(user.name || 'U').slice(0, 2).toUpperCase()}</button></header>
      <div className="workspace"><aside className={`sidebar ${sidebar ? 'open' : ''}`}><nav><NavButton icon="⌕" label="Search" count={docs.length} active={view === 'search'} onClick={() => { setView('search'); setSidebar(false) }} /><NavButton icon="◇" label="Threads" count={threads.length} active={view === 'threads'} onClick={() => { setView('threads'); setSidebar(false) }} /><NavButton icon="⧉" label="Sources" count="5" active={view === 'sources'} onClick={() => { setView('sources'); setSidebar(false) }} /></nav><div className="side-label">Projects</div>{['All projects', 'Platform', 'Payments', 'People', 'Design'].map((name) => <button className={`project-link ${project === name ? 'active' : ''}`} key={name} onClick={() => { setProject(name); setView('search'); setSidebar(false) }}><span className="project-dot" data-project={name} />{name}<small>{name === 'All projects' ? docs.length : docs.filter((d) => d.project === name).length}</small></button>)}<div className="sync-card"><div><b>Drive sync <span className="online" /></b><p>3 folders · last synced 12 min ago</p><button onClick={() => setView('sources')}>Manage sources</button></div></div></aside>
        <main className="main-content">{view === 'search' && <><section className="hero-panel"><span className="eyebrow">KNOWLEDGE HUB</span><h1>{query ? `Results for “${query}”` : 'What are you looking for?'}</h1><p>Search across docs, READMEs, imported articles and accepted answers.</p><div className="suggestions">{['payout retry window', 'SSO onboarding', 'parser plugin', 'refund timeline EU'].map((item) => <button key={item} onClick={() => setQuery(item)}>{item}</button>)}</div></section><div className="result-head"><span>{filteredDocs.length} results in <b>{project}</b></span><span className="filter-note">Current · Outdated · In review</span></div><div className="doc-list">{filteredDocs.map((doc) => <DocumentCard key={doc.id} doc={doc} onClick={() => setPanel(doc)} />)}</div></>}{view === 'threads' && <><PageTitle title="Threads" subtitle="Ask the team. Accepted answers become searchable docs." action="＋ Ask a question" onAction={() => setPanel('ask')} /><div className="thread-grid">{threads.map((thread) => <ThreadCard key={thread.id} thread={thread} onClick={() => setPanel(thread)} />)}</div></>}{view === 'sources' && <><PageTitle title="Sources" subtitle="Manage the places Atlas keeps in sync." /><div className="source-grid">{['Google Drive', 'GitHub READMEs', 'Medium', 'Dev.to', 'Accepted answers'].map((source, index) => <div className="source-card" key={source}><span className="source-icon">{['◲', '›_', '✎', '✎', '◇'][index]}</span><div><b>{source}</b><p>{['3 folders · auto-sync hourly', '12 repos · on push', 'Saved links · manual', 'Saved links · manual', '68 threads indexed'][index]}</p></div><span className="online" /></div>)}</div></>}</main></div>{panel && <Panel data={panel} close={() => setPanel(null)} />}<div className="user-status">Signed in as {user.email}</div>
    </div>
  )
}

function LoginScreen({ onSignIn, busy, error }) { return <div className="login-screen"><div className="login-glow" /><div className="login-layout"><section className="intro"><div className="brand"><span className="brand-mark">✦</span><strong>Atlas</strong></div><h1>Every answer your team already wrote down.</h1><p>Atlas indexes uploads, Drive folders, READMEs and saved articles, plus the threads your colleagues have already answered.</p><div className="feature-list"><div><span>⌕</span><b>One search box</b><small>Docs, articles and accepted answers in one place.</small></div><div><span>◇</span><b>Ask when search fails</b><small>Route questions to the people who own the area.</small></div><div><span>⧗</span><b>Trust what you find</b><small>Version history makes stale knowledge visible.</small></div></div></section><section className="login-card"><span className="eyebrow">WORKSPACE ACCESS</span><h2>Sign in</h2><p>Use your work Google account to enter Atlas.</p><button className="google-button" onClick={onSignIn} disabled={busy}><span className="google-g">G</span>{busy ? 'Waiting for Google...' : 'Continue with Google'}</button>{error && <div className="error-message">{error}</div>}<div className="secure-note"><span className="online" /> Your access is protected by Google SSO.</div><small className="policy">Only verified Codimite workspace accounts can access the hub.</small></section></div></div> }
function NavButton({ icon, label, count, active, onClick }) { return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}><span>{icon}</span>{label}<small>{count}</small></button> }
function PageTitle({ title, subtitle, action, onAction }) { return <div className="page-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button className="upload-button" onClick={onAction}>{action}</button>}</div> }
function DocumentCard({ doc, onClick }) { return <button className="document-card" onClick={onClick}><span className="doc-icon">{doc.icon}</span><span className="doc-body"><span className="doc-title"><b>{doc.title}</b><Status label={doc.status} /></span><span className="doc-excerpt">{doc.excerpt}</span><span className="doc-meta">{doc.type} · {doc.project} · {doc.meta}</span></span><span className="arrow">›</span></button> }
function ThreadCard({ thread, onClick }) { return <button className="thread-card" onClick={onClick}><span className="thread-meta"><Status label={thread.status} /> <small>{thread.project}</small></span><b>{thread.title}</b><p>{thread.preview}</p><small className="mono">{thread.meta}</small></button> }
function Status({ label }) { return <span className={`status ${label.toLowerCase().replace(' ', '-')}`}>{label}</span> }
function Panel({ data, close }) { const isDoc = data.type; const isThread = data.title && !isDoc; return <div className="panel-layer" onClick={close}><section className="detail-panel" onClick={(e) => e.stopPropagation()}><button className="close-button" onClick={close}>×</button>{isDoc ? <><Status label={data.status} /><span className="panel-kicker">{data.type} · {data.project}</span><h2>{data.title}</h2><p>{data.excerpt}</p><div className="panel-actions"><button>Mark as outdated</button><button>Open source</button></div><h3>Version history</h3><div className="history"><div><b>v4.2</b><span>Added the latest operational guidance<small>Nadia R. · 12 Aug 2026</small></span></div><div><b>v4.1</b><span>Escalation ladder updated<small>Tom B. · 27 Jun 2026</small></span></div></div></> : isThread ? <><Status label={data.status} /><span className="panel-kicker">Thread · {data.project}</span><h2>{data.title}</h2><span className="mono">{data.meta}</span><p>{data.preview} The team is collecting the confirmed answer here so it can be found again later.</p><div className="answer"><b>✓ Accepted answer</b><p>Replay the pending work using the current runbook. Anything older than the supported window needs a manual review in the provider console.</p></div><div className="reply"><input placeholder="Write an answer..." /><button>Post</button></div></> : <><h2>{data === 'ask' ? 'Ask the team' : 'Add to the hub'}</h2><p>Share a question or source with the team and keep the knowledge searchable.</p><input className="panel-input" placeholder={data === 'ask' ? 'Question — e.g. Why do payouts stall?' : 'Paste a document URL...'} /><textarea placeholder="Add context..." rows="5" /><button className="primary-action" onClick={close}>{data === 'ask' ? 'Post question' : 'Add to hub'}</button></>}</section></div> }

export default App
