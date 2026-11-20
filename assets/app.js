

/* HW Client Hub, reconciled source, Phase 1 (2026-11-18).
   Base behavior: canonical v1.2.2 standalone. Merged from the ZIP package:
   strict absolute-URL validation for embedded/linked sources, validated
   gallery and embed sources with configuration-needed fallbacks, and the
   config-needed detail in missing-action messaging. ZIP data files supply
   the v1.2.2 state and rules. Hello physics, timing, and presentation are
   the canonical implementation, unchanged. See evidence/phase1-diff-inventory.md. */
const DATA = window.CLIENT_HUB_STATE;
const CONFIG = window.CLIENT_HUB_CONFIG || {};
const RULES = window.CLIENT_HUB_RULES;
const $ = (id) => document.getElementById(id);
const esc = (str='') => String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const phases = ['ONBOARDING','BRANDING','WEB DEV','LAUNCH','HAND-OFF'];
const INTRO_UNTOUCHED_MS = 25000;
const INTRO_POST_TAP_MS = 10000;
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let focusOrigin = 'scene-menu';
let helloTimer = null;
let statusTimer = null;

function showScene(id){
  const target = $(id) ? id : 'scene-menu';
  document.querySelectorAll('.scene').forEach(s => s.classList.toggle('active', s.id === target));
  const scene = $(target);
  if(scene){ scene.scrollTop = 0; }
  updateConciergeVisibility(target);
}
function updateConciergeVisibility(sceneId){
  const btn = $('conciergeBtn');
  if(!btn) return;
  const show = sceneId === 'scene-menu' || sceneId === 'scene-focus';
  btn.classList.toggle('hidden', !show);
}
function openConcierge(){
  if(activeSceneId() === 'scene-focus' && $('focusTitle') && $('focusTitle').textContent === 'Help Desk'){ setStatus('Help Desk is already open.'); return; }
  setStatus('Opening Help Desk from Concierge.');
  renderFocus('helpdesk', activeSceneId());
}
function activeSceneId(){
  const active = document.querySelector('.scene.active');
  return active ? active.id : 'scene-menu';
}
function setStatus(message){
  const box = $('actionStatus');
  if(!box) return;
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(()=>box.classList.remove('show'), 3200);
}
function validUrl(url){
  try{ const parsed = new URL(String(url || ''), window.location.href); return parsed.protocol === 'https:' || parsed.protocol === 'http:'; }
  catch(e){ return false; }
}
function external(url){
  try{ const parsed = new URL(String(url || '')); return (parsed.protocol === 'https:' || parsed.protocol === 'http:') ? parsed.href : ''; }
  catch(e){ return ''; }
}
function actionMessage(label, need){ setStatus(need ? `${label} is not configured yet. Needed: ${need}. Confirm before external release.` : `${label} is not configured yet. Confirm the missing URL before external release.`); }
function linkCard(label, description, url){
  const safe = external(url);
  if(!safe){ return `<button class="link-card missing" type="button" data-action-message="${esc(label)}" data-config-needed="${esc(label)} destination URL"><div><strong>${esc(label)}</strong><span>${esc(description || 'Configuration needed')}</span></div><b>Needs config</b></button>`; }
  return `<a class="link-card" href="${esc(safe)}" target="_blank" rel="noopener noreferrer" data-track-link="${esc(label)}"><div><strong>${esc(label)}</strong><span>${esc(description || 'Open source file')}</span></div><b>↗</b></a>`;
}
function miniLink(label, url){
  const safe = external(url);
  if(!safe){ return `<button class="btn small ghost missing" type="button" data-action-message="${esc(label)}" data-config-needed="${esc(label)} destination URL">${esc(label)} · Needs config</button>`; }
  return `<a class="btn small ghost" href="${esc(safe)}" target="_blank" rel="noopener noreferrer" data-track-link="${esc(label)}">${esc(label)} ↗</a>`;
}
function checks(items, warn=false){ return `<div class="checks">${items.map(i => `<div class="check ${warn?'warn':''}"><b>${warn?'!':'✓'}</b><span>${esc(i)}</span></div>`).join('')}</div>`; }
function gallery(items){
  return `<div class="gallery">${items.map(item => { const src = external(item.native_url); const media = src ? `<img data-gallery-img src="${esc(src)}" alt="${esc(item.label)}" loading="lazy">` : `<div class="img-fallback" role="note">Preview not configured<span>${esc(item.label)} image URL is missing or invalid.</span></div>`; return `<article class="asset"><div class="asset-img">${media}</div><footer><strong>${esc(item.label)}</strong>${miniLink('Open', item.url)}</footer></article>`; }).join('')}</div>`;
}
function opportunityCards(items){
  return `<div class="opp-list">${items.map(o => `<article class="opp"><div><h3>${esc(o.contact || 'Opportunity')}</h3><p>${esc(o.summary || '')}</p><div class="opp-meta"><span class="badge green">${esc(o.status||'New')}</span><span class="badge">${esc(o.strength||'Review')}</span><span class="badge gold">${esc(o.market||'Market')}</span><span class="badge">${esc(o.source||'Source')}</span></div></div><div class="opp-actions">${miniLink('Source', o.source_url)}${miniLink('Notion', o.notion_url)}</div></article>`).join('')}</div>`;
}
function embedCard(e){
  const preview = external(e.url);
  if(!preview){ return `<article class="embed-card"><div class="route-banner"><div><p class="kicker">Native Preview</p><h3>${esc(e.label)}</h3></div>${miniLink('Open Source', e.fallback_url)}</div><button class="link-card missing" type="button" data-action-message="${esc(e.label)} preview" data-config-needed="${esc(e.label)} preview URL"><div><strong>Preview unavailable</strong><span>Configuration needed</span></div><b>Needs config</b></button></article>`; }
  return `<article class="embed-card"><div class="route-banner"><div><p class="kicker">Native Preview</p><h3>${esc(e.label)}</h3></div>${miniLink('Open Source', e.fallback_url)}</div><div class="embed-wrap"><iframe src="${esc(preview)}" title="${esc(e.label)}" loading="lazy"></iframe></div></article>`;
}
function renderBase(){
  $('clientName').textContent = DATA.client.client_name;
  $('ownerName').textContent = DATA.client.owner_name;
  $('packageTitle').textContent = `${DATA.client.package_name} Client Hub`;
  $('clientMessage').textContent = DATA.current_state.client_message;
  $('phaseName').textContent = DATA.current_state.phase.replace('-', ' ');
  $('stepName').textContent = DATA.current_state.status_label;
  $('progressText').textContent = `${DATA.current_state.overall_progress}%`;
  $('progressBar').style.width = `${DATA.current_state.overall_progress}%`;
  $('phaseRail').innerHTML = phases.map(p => `<div class="phase-chip ${p === DATA.current_state.phase ? 'current' : phases.indexOf(p) < phases.indexOf(DATA.current_state.phase) ? 'done' : ''}">${esc(p)}</div>`).join('');
  $('navPanel').innerHTML = DATA.navigation.map(n => `<button type="button" class="nav-card" data-screen="${esc(n.screen)}"><strong>${esc(n.label)} <span aria-hidden="true">→</span></strong><span>${esc(n.description)}</span></button>`).join('');
  document.querySelectorAll('[data-screen]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => renderFocus(btn.dataset.screen, activeSceneId())); });
}
function bindDynamicActions(){
  document.querySelectorAll('[data-action-message]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => actionMessage(btn.dataset.actionMessage || 'This action', btn.dataset.configNeeded || '')); });
  document.querySelectorAll('[data-track-link]').forEach(link => { if(link.dataset.hubBound) return; link.dataset.hubBound = '1'; link.addEventListener('click', () => setStatus(`Opening ${link.dataset.trackLink}.`)); });
  document.querySelectorAll('[data-return-menu]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => { setStatus('Returning to the Client Hub menu.'); showScene('scene-menu'); }); });
  document.querySelectorAll('[data-gallery-img]').forEach(img => { if(img.dataset.hubBound) return; img.dataset.hubBound = '1'; img.addEventListener('error', () => { const note = document.createElement('div'); note.className = 'img-fallback'; note.textContent = 'Preview unavailable. The source image could not be loaded.'; img.replaceWith(note); setStatus('A preview image could not be loaded. The source may need checking.'); }); });
}
function setFocus(title, kicker, subtitle, body){
  $('focusTitle').textContent = title;
  $('focusKicker').textContent = kicker;
  $('focusSubtitle').textContent = subtitle || '';
  $('focusBody').innerHTML = body;
  bindDynamicActions();
  showScene('scene-focus');
}
function renderFocus(screen, origin){
  focusOrigin = origin && origin !== 'scene-focus' ? origin : 'scene-menu';
  const L = DATA.links, N = DATA.native_display, S = DATA.source_summary;
  const unresolved = S.unresolved_external_release_items || [];
  if(screen === 'opportunity_hq'){
    return setFocus('Opportunity HQ', 'Come Get Funded HQ', 'Native summary first. Full Notion workspace opens only when needed.', `
      <div class="screen-grid">
        <article class="card"><h2>HQ status</h2><p>${esc(S.opportunity_hq_status)}</p><div class="pills">${S.provider_pathways.map(p=>`<span class="pill">${esc(p)}</span>`).join('')}</div></article>
        <article class="card"><h2>HQ navigation</h2><div class="link-list">
          ${linkCard('CGF Opportunity HQ [Lite]','Main client-facing HQ workspace',L.opportunity_hq_lite)}
          ${linkCard('Opportunity Dashboard','Open the dashboard page',L.opportunity_dashboard)}
          ${linkCard('Insights','Open insights page',L.insights)}
          ${linkCard('Provider & Funding Insights','Open provider pathway insights',L.provider_funding_insights)}
          ${linkCard('Targeting & Scanner Status','Open targeting/scanner controls',L.targeting_scanner_status)}
        </div></article>
      </div>`);
  }
  if(screen === 'opportunity_board'){
    return setFocus('Opportunity Board', 'Native board preview', 'Preview the latest board records without turning the whole Hub into one long page.', `
      <div class="route-banner"><p>Showing ${N.opportunities.length} captured preview records. Use the full board link for live Notion work.</p>${miniLink('Open Full Board', L.opportunity_board)}</div>
      ${opportunityCards(N.opportunities)}`);
  }
  if(screen === 'brand_assets'){
    return setFocus('Brand Assets', 'Drive-backed asset bank', 'Logo, banner, and icon files are displayed natively from Drive thumbnails.', `
      <div class="route-banner"><p>Finalized Come Get Funded brand assets.</p>${miniLink('Open Assets Folder', L.assets_folder)}</div>
      ${gallery(N.brand_assets)}`);
  }
  if(screen === 'brand_concepts'){
    return setFocus('Brand Concepts', 'Concept review archive', 'Current CGF concept images stay in their own focused review screen.', `
      <div class="route-banner"><p>Concept previews from the ComeGetFunded concepts folder.</p>${miniLink('Open Concepts Folder', L.concepts_folder)}</div>
      ${gallery(N.concept_assets)}`);
  }
  if(screen === 'website'){
    return setFocus('Website Build', 'Google Sites asset', 'The published Come Get Funded website is connected from the verified Hub configuration. The editable Google Sites build stays internal.', `
      <div class="screen-grid">
        <article class="card"><h2>Published website</h2><p>The public published URL was confirmed by Hayden on 2026-11-18 and is carried in the Hub configuration.</p><div class="link-list">${linkCard('Open Published Website','Come Get Funded public site',CONFIG.client_website_url)}${linkCard('Open Google Sites Build','Editable Google Sites asset, internal only',L.site_edit)}</div></article>
        <article class="card"><h2>Before external release</h2>${checks(['Published URL confirmed in Hub configuration','Confirm client access expectations','Keep edit/admin access internal unless intentionally shared'], true)}</article>
      </div>`);
  }
  if(screen === 'documents'){
    return setFocus('Documents', 'Native PDF + folder previews', 'Documents and folders are previewed here instead of being stacked on the main menu.', `
      <div class="embed-grid">${N.embeds.map(embedCard).join('')}</div>`);
  }
  if(screen === 'helpdesk'){
    const sourceId = (CONFIG.concierge && CONFIG.concierge.source_identifier) || '';
    const sourceStatus = (CONFIG.concierge && CONFIG.concierge.source_identifier_status) || '';
    const conciergeCard = sourceId ? `<article class="card"><h2>Concierge</h2><p>Concierge inquiries from this Hub carry the source identifier <strong>${esc(sourceId)}</strong>. Status: ${esc(sourceStatus)}. The concierge chat backend is not connected in this build yet, so no message can be sent from this screen today and no chat success is shown. Booking a Help Desk session is the working route.</p><div class="screen-actions"><button class="btn ghost" type="button" disabled>Start concierge chat</button></div><p class="quiet">Concierge chat stays disabled until the shared concierge service is connected (Plan Phase 4).</p></article>` : `<article class="card"><h2>Concierge</h2><button class="link-card missing" type="button" data-action-message="Concierge" data-config-needed="Concierge source identifier"><div><strong>Concierge</strong><span>Configuration needed</span></div><b>Needs config</b></button></article>`;
    return setFocus('Help Desk', 'Support routing', 'Book through the confirmed HaydenWorks Help Desk scheduling link. Live credit charges stay disabled in this build.', `
      <div class="screen-grid">
        <article class="card"><h2>Support scope</h2>${checks(['Walkthroughs','Bugs and glitches','Recovery help','Login/access routing','Post-launch review support'])}</article>
        <article class="card"><h2>Book a session</h2><p>${esc(CONFIG.helpdesk_positioning || 'Your complimentary on-call help desk provided by HaydenWorks.')}</p><div class="link-list">${linkCard('Book Help Desk','HaydenWorks Help Desk scheduling',CONFIG.HELP_DESK_BOOKING_URL)}</div></article>
      </div>
      <div style="margin-top:16px">${conciergeCard}</div>`);
  }
  if(screen === 'handoff'){
    return setFocus('Final Hand-Off', 'Release checklist', 'Hand-off is shown as its own screen so the client can orient without seeing sensitive launch credentials.', `
      <div class="screen-grid">
        <article class="card"><h2>Ready for client orientation</h2>${checks(['Come Get Funded launched status reflected','Provider pathways summarized','Opportunity HQ connected','Drive-backed asset bank connected','PDF previews connected','Website build asset connected'])}</article>
        <article class="card"><h2>Release gates still open</h2>${checks(unresolved.concat(['Secure credential handoff remains intentionally excluded until approved']), true)}</article>
      </div>
      <div class="screen-grid three" style="margin-top:16px">
        <article class="card"><h3>Core records</h3><div class="link-list">${linkCard('Regene Notion Page','Source client/sales record',L.regene_notion_page)}${linkCard('Internal Control','Internal CGF control page',L.internal_control)}</div></article>
        <article class="card"><h3>Client files</h3><div class="link-list">${linkCard('Regene Drive Folder','Client folder',L.client_drive_folder)}${linkCard('Assets Folder','Brand files',L.assets_folder)}</div></article>
        <article class="card"><h3>HQ</h3><div class="link-list">${linkCard('Opportunity HQ','Client HQ',L.opportunity_hq_lite)}${linkCard('Opportunity Board','Live board',L.opportunity_board)}</div></article>
      </div>`);
  }
  if(screen === 'security'){
    return setFocus('Access + Security', 'Controlled autonomy boundary', 'This screen preserves the credential and release boundaries before external client use.', `
      <div class="screen-grid">
        <article class="card"><h2>Do not store</h2>${checks(['Passwords','Launch credentials','API keys / Notion tokens / Drive service credentials','Banking details','OTPs or access codes'], true)}</article>
        <article class="card"><h2>Release requirements</h2>${checks(['Deploy Cloudflare Pages preview','Configure Cloudflare Access approved email policy','Replace editable Google Sites link with public URL if appropriate','Confirm reusable Help Desk scheduling link','Run browser/device QA after deployment'], true)}</article>
      </div>`);
  }
  return setFocus('Screen not found', 'Unknown route', 'This screen key is not recognized in the current Client Hub configuration.', `
    <article class="card"><h2>Configuration check</h2><p>The requested Client Hub screen key was <strong>${esc(screen || 'blank')}</strong>. Use the Hub menu to continue.</p><div class="screen-actions"><button class="btn primary" type="button" data-return-menu="1">Return to Hub</button></div></article>`);
}

/* Phase 3 (Scope E): Secure Access session client.
   This client talks to the Client Hub backend contract implemented in
   repo/server/client-hub/ (GET /api/me on CONFIG.auth.client_hub_api_base)
   and renders the auth state machine truthfully. Rules it cannot break:
   - A signed-in state is rendered ONLY after a 200 from /api/me whose
     tenant list includes the configured tenant slug. Nothing else, no
     button click, no local flag, can produce it.
   - The client-hub function is not deployed in this phase, so a sign-in
     attempt with no session token ends in backend-unreachable, and a
     missing auth config ends in missing-config. No fake login success.
   - This build collects no credentials and has no sign-in form. When
     live access is activated, the token arrives from the Supabase Auth
     flow on the shared stack and is handed to setHubSessionToken.
   - The token is held in page memory only: never in browser storage,
     never in Notion or Drive records, never logged, never rendered. */
let hubAuthStateName = 'signed-out';
let hubSessionToken = null;
let hubAuthIdentity = null;
let hubAuthPending = false;
let authPanelEl = null;
let authStatusEl = null;
const AUTH_STATE_MESSAGES = {
  'signed-out': 'Not signed in. No live sign-in is connected to this build yet.',
  'pending': 'Checking secure access.',
  'signed-in': 'Signed in.',
  'denied': 'This account does not have access to the Come Get Funded Client Hub. This Hub is limited to its own client tenant.',
  'expired': 'Your session has expired. When live access is connected, sign in again to continue.',
  'tampered': 'The session token was rejected as invalid. It may have been altered, or issued for a different service.',
  'backend-unreachable': 'The secure access service is not available yet. The Client Hub backend is not deployed, so sign-in cannot complete in this build.',
  'missing-config': 'Secure access is not configured yet. Configuration is needed before sign-in can work.'
};
function authConfig(){ return CONFIG.auth || null; }
function classifyAuthStatus(status, error){
  if(status === 501 || error === 'auth_not_configured') return 'missing-config';
  if(status === 403) return 'denied';
  if(status === 401){
    if(error === 'token_expired') return 'expired';
    if(error === 'not_signed_in') return 'signed-out';
    return 'tampered';
  }
  return 'backend-unreachable';
}
function getHubAuthState(){ return hubAuthStateName; }
function setHubSessionToken(token){ hubSessionToken = token || null; }
function renderAuthPanel(){
  if(!authPanelEl || !authStatusEl) return;
  authPanelEl.dataset.authState = hubAuthStateName;
  let message = AUTH_STATE_MESSAGES[hubAuthStateName] || AUTH_STATE_MESSAGES['signed-out'];
  if(hubAuthStateName === 'signed-in' && hubAuthIdentity){
    const roles = (hubAuthIdentity.tenants || []).map(t => t.role).filter(Boolean).join(', ');
    message = `Signed in as ${hubAuthIdentity.email || 'verified account'}. Tenant access: Come Get Funded. Roles: ${roles || 'member'}.`;
  }
  authStatusEl.textContent = message;
}
function setHubAuthState(name, identity){
  hubAuthStateName = name;
  hubAuthIdentity = identity || null;
  renderAuthPanel();
}
async function checkHubSession(fetchFn){
  const cfg = authConfig();
  if(!cfg || !cfg.client_hub_api_base){ setHubAuthState('missing-config'); return hubAuthStateName; }
  if(!hubSessionToken){ setHubAuthState('signed-out'); return hubAuthStateName; }
  const doFetch = fetchFn || (typeof window !== 'undefined' ? window.fetch : null);
  if(!doFetch){ setHubAuthState('backend-unreachable'); return hubAuthStateName; }
  if(hubAuthPending) return hubAuthStateName;
  hubAuthPending = true;
  setHubAuthState('pending');
  try{
    const res = await doFetch(`${cfg.client_hub_api_base}/api/me`, { headers: { Authorization: `Bearer ${hubSessionToken}` } });
    let body = {};
    try{ body = await res.json(); }catch(e){ body = {}; }
    if(res.status === 200){
      const tenants = Array.isArray(body.tenants) ? body.tenants : [];
      const slug = cfg.tenant_slug || '';
      if(slug && !tenants.some(t => t.tenant === slug)){ setHubAuthState('denied'); }
      else { setHubAuthState('signed-in', { email: body.email || '', tenants }); }
    } else {
      setHubAuthState(classifyAuthStatus(res.status, body && body.error));
    }
  }catch(e){
    setHubAuthState('backend-unreachable');
  }
  hubAuthPending = false;
  renderAuthPanel();
  return hubAuthStateName;
}
function attemptHubSignIn(fetchFn){
  const cfg = authConfig();
  if(!cfg || !cfg.client_hub_api_base){ setHubAuthState('missing-config'); setStatus('Secure access is not configured yet.'); return Promise.resolve(hubAuthStateName); }
  if(!hubSessionToken){ setHubAuthState('backend-unreachable'); setStatus('Secure access is not available yet. The Client Hub backend is not deployed.'); return Promise.resolve(hubAuthStateName); }
  return checkHubSession(fetchFn);
}
function createAuthPanel(){
  const panel = document.createElement('div');
  panel.id = 'authPanel';
  panel.className = 'auth-panel';
  const title = document.createElement('p');
  title.className = 'kicker';
  title.textContent = 'Secure Access status';
  authStatusEl = document.createElement('p');
  authStatusEl.className = 'auth-status';
  const actions = document.createElement('div');
  actions.className = 'screen-actions';
  const btn = document.createElement('button');
  btn.id = 'authCheckBtn';
  btn.type = 'button';
  btn.className = 'btn ghost';
  btn.textContent = 'Check secure access';
  btn.addEventListener('click', () => { attemptHubSignIn(); });
  actions.appendChild(btn);
  panel.appendChild(title);
  panel.appendChild(authStatusEl);
  panel.appendChild(actions);
  return panel;
}

function setupHelloPhysics(){
  const scene = $('scene-hello');
  const obj = $('helloObject');
  if(!scene || !obj){ scheduleHello(INTRO_UNTOUCHED_MS); return; }
  let state = {active:false, initialized:false, x:0, y:0, vx:0, vy:0, rot:0, vr:0, last:0, raf:0};
  function apply(){ obj.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rot}deg)`; }
  function initialize(){
    const sr = scene.getBoundingClientRect();
    const r = obj.getBoundingClientRect();
    state.x = r.left - sr.left; state.y = r.top - sr.top;
    obj.style.left = '0px'; obj.style.top = '0px'; obj.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
    state.initialized = true; scene.classList.add('physics-on');
  }
  function tick(ts){
    if(!state.active) return;
    if(!state.last) state.last = ts;
    const dt = Math.min((ts - state.last) / 1000, 0.034);
    state.last = ts;
    const sr = scene.getBoundingClientRect();
    const r = obj.getBoundingClientRect();
    const w = r.width, h = r.height;
    const maxX = Math.max(0, sr.width - w);
    const maxY = Math.max(0, sr.height - h);
    state.vy += 1500 * dt;
    state.x += state.vx * dt;
    state.y += state.vy * dt;
    state.rot += state.vr * dt;
    const bounce = 0.66;
    if(state.x < 0){ state.x = 0; state.vx = Math.abs(state.vx) * bounce; state.vr *= .88; }
    if(state.x > maxX){ state.x = maxX; state.vx = -Math.abs(state.vx) * bounce; state.vr *= .88; }
    if(state.y < 0){ state.y = 0; state.vy = Math.abs(state.vy) * bounce; }
    if(state.y > maxY){ state.y = maxY; state.vy = -Math.abs(state.vy) * bounce; state.vx *= .965; state.vr *= .93; }
    state.vx *= .996; state.vr *= .997;
    apply();
    state.raf = requestAnimationFrame(tick);
  }
  function activate(ev){
    ev.preventDefault();
    scheduleHello(INTRO_POST_TAP_MS);
    setStatus('Hello is live. Secure access will open after a short pause.');
    if(reduceMotion){ return; }
    if(!state.initialized) initialize();
    const sr = scene.getBoundingClientRect();
    const r = obj.getBoundingClientRect();
    const cx = r.left + r.width/2;
    const clientX = ev.clientX || cx;
    const nudge = Math.max(-360, Math.min(360, (clientX - cx) * 3));
    state.vx += nudge + (Math.random() * 180 - 90);
    state.vy = -720 - Math.random() * 180;
    state.vr += (Math.random() > .5 ? 1 : -1) * (160 + Math.random() * 220);
    if(!state.active){ state.active = true; state.last = 0; state.raf = requestAnimationFrame(tick); }
  }
  obj.addEventListener('pointerdown', activate);
  obj.addEventListener('keydown', ev => { if(ev.key === 'Enter' || ev.key === ' '){ activate(ev); } });
  scheduleHello(INTRO_UNTOUCHED_MS);
}
function scheduleHello(ms){
  clearTimeout(helloTimer);
  helloTimer = setTimeout(()=>showScene('scene-access'), ms);
}
function boot(){
  renderBase();
  setupHelloPhysics();
  let enterPending = false;
  $('enterBtn').addEventListener('click', () => { if(enterPending) return; enterPending = true; setStatus('Opening Client Hub menu.'); showScene('scene-welcome'); setTimeout(()=>{ showScene('scene-menu'); enterPending = false; }, reduceMotion ? 0 : 750); });
  $('skipIntro').addEventListener('click', () => { setStatus('Intro skipped.'); showScene('scene-menu'); });
  $('backToMenu').addEventListener('click', () => { setStatus('Returning to previous Client Hub screen.'); showScene(focusOrigin || 'scene-menu'); });
  $('securityBtn').addEventListener('click', () => renderFocus('security', activeSceneId()));
  const conciergeBtn = document.createElement('button');
  conciergeBtn.id = 'conciergeBtn';
  conciergeBtn.type = 'button';
  conciergeBtn.className = 'concierge-btn hidden';
  conciergeBtn.setAttribute('aria-label', 'Concierge: open the Help Desk');
  conciergeBtn.innerHTML = '<span class="concierge-mark" aria-hidden="true">☺?</span><span>Concierge</span>';
  conciergeBtn.addEventListener('click', openConcierge);
  document.body.appendChild(conciergeBtn);
  updateConciergeVisibility(activeSceneId());
  const accessHost = (document.querySelector && document.querySelector('.access-card')) || $('scene-access');
  if(accessHost){ authPanelEl = createAuthPanel(); accessHost.appendChild(authPanelEl); renderAuthPanel(); }
  bindDynamicActions();
}
boot();

