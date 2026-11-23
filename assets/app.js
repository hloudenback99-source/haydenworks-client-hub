

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
const INTRO_UNTOUCHED_MS = 4000;
const INTRO_POST_TAP_MS = 800;
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let focusOrigin = 'scene-menu';
let helloTimer = null;
let statusTimer = null;

function showScene(id){
  const target = $(id) ? id : 'scene-menu';
  if(target !== 'scene-menu' && target !== 'scene-focus' && conciergePopupOpen){ closeConciergePopup({ restoreFocus: false }); }
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
  return openConciergePopup();
}
function activeSceneId(){
  const active = document.querySelector('.scene.active');
  return active ? active.id : 'scene-menu';
}
/* Phase 7 (Scope J): focus management for scene changes. Scenes are
   shown and hidden with display:none, so a control that triggers a
   scene change ends up inside hidden markup and keyboard focus would
   be lost to the document body. After a scene change, focus moves to
   the heading of the scene that opened (both headings carry
   tabindex="-1" from the build). Guarded: hosts without a focus
   method (test stubs) simply skip the move. */
function focusEl(el){ if(el && typeof el.focus === 'function'){ el.focus(); } }
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
  $('progressBar').setAttribute('aria-valuenow', String(DATA.current_state.overall_progress));
  $('phaseRail').innerHTML = phases.map(p => `<div class="phase-chip ${p === DATA.current_state.phase ? 'current' : phases.indexOf(p) < phases.indexOf(DATA.current_state.phase) ? 'done' : ''}">${esc(p)}</div>`).join('');
  $('navPanel').innerHTML = DATA.navigation.map(n => `<button type="button" class="nav-card" data-screen="${esc(n.screen)}"><strong>${esc(n.label)} <span aria-hidden="true">→</span></strong><span>${esc(n.description)}</span></button>`).join('');
  document.querySelectorAll('[data-screen]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => renderFocus(btn.dataset.screen, activeSceneId())); });
}
function bindDynamicActions(){
  document.querySelectorAll('[data-action-message]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => actionMessage(btn.dataset.actionMessage || 'This action', btn.dataset.configNeeded || '')); });
  document.querySelectorAll('[data-track-link]').forEach(link => { if(link.dataset.hubBound) return; link.dataset.hubBound = '1'; link.addEventListener('click', () => setStatus(`Opening ${link.dataset.trackLink}.`)); });
  document.querySelectorAll('[data-return-menu]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => { setStatus('Returning to the Client Hub menu.'); showScene('scene-menu'); focusEl($('packageTitle')); }); });
  document.querySelectorAll('[data-concierge-send]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => { const field = $('conciergeMessage'); submitConciergeInquiry(null, field ? field.value : ''); }); });
  document.querySelectorAll('[data-helpdesk-load]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => { loadHelpDesk(null); }); });
  document.querySelectorAll('[data-concierge-sessions-load]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => { loadConciergeSessions(null); }); });
  document.querySelectorAll('[data-purchase-option]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => { purchaseOptionClick(btn.dataset.purchaseOption || ''); }); });
  document.querySelectorAll('[data-picker-tenant]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => { selectPickerTenant(btn.dataset.pickerTenant); }); });
  document.querySelectorAll('[data-gallery-img]').forEach(img => { if(img.dataset.hubBound) return; img.dataset.hubBound = '1'; img.addEventListener('error', () => { const note = document.createElement('div'); note.className = 'img-fallback'; note.textContent = 'Preview unavailable. The source image could not be loaded.'; img.replaceWith(note); setStatus('A preview image could not be loaded. The source may need checking.'); }); });
}
function setFocus(title, kicker, subtitle, body){
  $('focusTitle').textContent = title;
  $('focusKicker').textContent = kicker;
  $('focusSubtitle').textContent = subtitle || '';
  $('focusBody').innerHTML = body;
  bindDynamicActions();
  showScene('scene-focus');
  focusEl($('focusTitle'));
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
    let conciergeCard;
    if(!sourceId){
      conciergeCard = `<article class="card"><h2>Concierge</h2><button class="link-card missing" type="button" data-action-message="Concierge" data-config-needed="Concierge source identifier"><div><strong>Concierge</strong><span>Configuration needed</span></div><b>Needs config</b></button></article>`;
    } else if(!conciergeContractPresent()){
      conciergeCard = `<article class="card"><h2>Concierge</h2><p>Concierge inquiries from this Hub carry the source identifier <strong>${esc(sourceId)}</strong>. Status: ${esc(sourceStatus)}. The concierge backend is not configured in this build yet, so no message can be sent from this screen today and no chat success is shown. Booking a Help Desk session is the working route.</p><div class="screen-actions"><button class="btn ghost" type="button" disabled>Send concierge message</button></div><p class="quiet">Concierge messaging stays disabled until the shared concierge backend contract is configured for this build.</p></article>`;
    } else {
      conciergeStateName = conciergeInitialState();
      conciergeCard = `<article class="card"><h2>Concierge</h2><p>Send a message to the shared HaydenWorks concierge. Inquiries from this Hub carry the source identifier <strong>${esc(sourceId)}</strong>. Status: ${esc(sourceStatus)}. When your message is recorded, a receipt for it shows here. For anything urgent, booking a Help Desk session is still the fastest route to a person.</p><div class="concierge-form"><label class="quiet" for="conciergeMessage">Your message</label><textarea id="conciergeMessage" rows="4" placeholder="What do you need?"></textarea><div class="screen-actions"><button class="btn primary" type="button" id="conciergeSendBtn" data-concierge-send="1">Send concierge message</button></div><p class="concierge-status" id="conciergeStatus" data-concierge-state="${conciergeStateName}">${esc(CONCIERGE_STATE_MESSAGES[conciergeStateName])}</p></div></article>`;
    }
    const hdCards = helpdeskCardsHtml();
    return setFocus('Help Desk', 'Support routing', 'Book through the confirmed HaydenWorks Help Desk scheduling link. Live credit charges stay disabled in this build.', `
      <div class="screen-grid">
        <article class="card"><h2>Support scope</h2>${checks(['Walkthroughs','Bugs and glitches','Recovery help','Login/access routing','Post-launch review support'])}</article>
        <article class="card"><h2>Book a session</h2><p>${esc(CONFIG.helpdesk_positioning || 'Your complimentary on-call help desk provided by HaydenWorks.')}</p><div class="link-list">${linkCard('Book Help Desk','HaydenWorks Help Desk scheduling',CONFIG.HELP_DESK_BOOKING_URL)}</div></article>
      </div>
      <div class="screen-grid" style="margin-top:16px">${hdCards}</div>
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
/* Picker release (plan/PICKER-DESIGN.md): the served memberships the
   picker offers, and the tenant the user has opened. The active
   tenant stays null until a single-membership sign-in resolves it or
   the user picks an entry: no tenant-scoped call is made before
   that, so no tenant data loads before selection. */
let hubMemberships = [];
let hubPickerEntries = [];
let hubActiveTenant = null;
let hubServedSlugs = null;
let switchBrandBtn = null;
const AUTH_STATE_MESSAGES = {
  'signed-out': 'Not signed in. No live sign-in is connected to this build yet.',
  'pending': 'Checking secure access.',
  'signed-in': 'Signed in.',
  'picker': 'Signed in. Choose your brand to continue.',
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
  if(hubAuthStateName === 'picker' && hubAuthIdentity){
    message = `Signed in as ${hubAuthIdentity.email || 'verified account'}. Choose your brand to continue.`;
  }
  if(hubAuthStateName === 'signed-in' && hubAuthIdentity){
    const roles = (hubAuthIdentity.tenants || []).map(t => t.role).filter(Boolean).join(', ');
    const activeEntry = hubPickerEntries.find(e => e.tenant === hubActiveTenant) || null;
    const accessLabel = activeEntry ? (activeEntry.name || activeEntry.tenant) : 'Come Get Funded';
    message = `Signed in as ${hubAuthIdentity.email || 'verified account'}. Tenant access: ${accessLabel}. Roles: ${roles || 'member'}.`;
  }
  authStatusEl.textContent = message;
  updateSwitchBrandVisibility();
}
function updateSwitchBrandVisibility(){
  if(!switchBrandBtn) return;
  const show = hubPickerEntries.length > 1 && hubAuthStateName !== 'signed-out';
  switchBrandBtn.classList.toggle('hidden', !show);
}
function getHubPickerEntries(){ return hubPickerEntries; }
function getHubActiveTenant(){ return hubActiveTenant; }
function activeTenantSlug(){
  if(hubActiveTenant) return hubActiveTenant;
  const cfg = authConfig();
  return (cfg && cfg.tenant_slug) || '';
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
      hubMemberships = tenants;
      const served = await servedTenantSlugs(doFetch, cfg);
      const servedSet = served && served.length ? served : (cfg.tenant_slug ? [cfg.tenant_slug] : []);
      hubPickerEntries = tenants.filter(t => servedSet.includes(t.tenant));
      if(!hubPickerEntries.length){ setHubAuthState('denied'); }
      else if(hubPickerEntries.length === 1){
        hubActiveTenant = hubPickerEntries[0].tenant;
        setHubAuthState('signed-in', { email: body.email || '', tenants });
      } else {
        hubActiveTenant = null;
        setHubAuthState('picker', { email: body.email || '', tenants });
        await loadPickerBadges(doFetch);
        renderTenantPicker();
      }
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
/* Picker release: the served tenant slugs come from the function's
   public config (the tenant directory the Client Hub serves). Any
   failure or unexpected shape returns null and the caller falls back
   to the configured pilot slug: the picker never invents a served
   tenant. A good read is cached for the page session. */
async function servedTenantSlugs(fetchFn, cfg){
  if(hubServedSlugs && hubServedSlugs.length) return hubServedSlugs;
  const doFetch = fetchFn || (typeof window !== 'undefined' ? window.fetch : null);
  if(!doFetch || !cfg || !cfg.client_hub_api_base) return null;
  try{
    const res = await doFetch(`${cfg.client_hub_api_base}/api/config`);
    if(res.status !== 200) return null;
    const body = await res.json();
    const slugs = (Array.isArray(body.tenants) ? body.tenants : []).map(t => t && t.slug).filter(Boolean);
    if(slugs.length) hubServedSlugs = slugs;
    return slugs.length ? slugs : null;
  }catch(e){
    return null;
  }
}
/* Picker release: merge the server's answers-waiting counts into the
   picker entries. A failed or unconfigured badge read leaves the
   entries badgeless: counts are rendered only from a real 200. */
async function loadPickerBadges(fetchFn){
  if(!hubSessionToken || !hubPickerEntries.length) return hubPickerEntries;
  const cfg = authConfig();
  if(!cfg || !cfg.client_hub_api_base) return hubPickerEntries;
  const doFetch = fetchFn || (typeof window !== 'undefined' ? window.fetch : null);
  if(!doFetch) return hubPickerEntries;
  try{
    const res = await doFetch(`${cfg.client_hub_api_base}/api/picker/badges`, { headers: { Authorization: `Bearer ${hubSessionToken}` } });
    if(res.status === 200){
      const body = await res.json();
      const bySlug = new Map((Array.isArray(body.tenants) ? body.tenants : []).map(t => [t.tenant, t.badge]));
      for(const entry of hubPickerEntries){
        if(bySlug.has(entry.tenant)) entry.badge = bySlug.get(entry.tenant);
      }
    }
  }catch(e){ /* badgeless entries are the truthful fallback */ }
  return hubPickerEntries;
}
function pickerEntriesHtml(){
  return hubPickerEntries.map(e => {
    const badge = e.badge > 0 ? `<span class="picker-badge">${e.badge} answer${e.badge === 1 ? '' : 's'} waiting</span>` : '';
    const status = e.entitlementStatus ? `<span class="picker-status">${esc(e.entitlementStatus)}</span>` : '';
    return `<button type="button" class="picker-entry" data-picker-tenant="${esc(e.tenant)}"><strong>${esc(e.name || e.tenant)}</strong>${status}<span class="picker-role">${esc(e.role || 'member')}</span>${badge}</button>`;
  }).join('');
}
/* The picker is a focused screen in the menu's style, reached through
   the same setFocus path as every other focused screen (heading
   focus per Phase 7). Its Back path returns to Secure Access, not
   into a hub: no tenant is open until an entry is chosen. */
function renderTenantPicker(){
  focusOrigin = 'scene-access';
  return setFocus('Choose your brand', 'Your HaydenWorks brands and projects', 'Pick the brand or project you want to open. Nothing from a brand loads until you choose it.', `<div class="picker-list">${pickerEntriesHtml()}</div>`);
}
/* Switch path: re-open the picker with refreshed badges. The session
   token is never touched here; switching brands is not signing out. */
async function showTenantPicker(fetchFn){
  await loadPickerBadges(fetchFn || null);
  renderTenantPicker();
  return hubPickerEntries;
}
/* Entering a tenant: set the active tenant, record the last-opened
   marker through the Phase 4 write contract (which clears the badge
   server-side for the next visit), clear the badge locally, and open
   the menu. A failed marker write never blocks entry; the badge
   simply reappears next time rather than the user being locked out
   of their own hub over a bookkeeping write. */
async function selectPickerTenant(slug, fetchFn){
  const entry = hubPickerEntries.find(e => e.tenant === slug) || null;
  if(!entry) return null;
  hubActiveTenant = slug;
  if(hubSessionToken){
    const cfg = authConfig();
    const doFetch = fetchFn || (typeof window !== 'undefined' ? window.fetch : null);
    if(cfg && cfg.client_hub_api_base && doFetch){
      try{
        await doFetch(`${cfg.client_hub_api_base}/api/hub/writes`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${hubSessionToken}`, 'Content-Type': 'application/json', 'Idempotency-Key': newConciergeKey() },
          body: JSON.stringify({ tenant: slug, action: 'picker.tenant.open', data: {} })
        });
      }catch(e){ /* entry proceeds; see the note above */ }
    }
  }
  entry.badge = 0;
  setHubAuthState('signed-in', hubAuthIdentity);
  setStatus(`Opening ${entry.name || slug}.`);
  showScene('scene-menu');
  focusEl($('packageTitle'));
  return entry;
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

/* Phase 4 (Scope F): concierge client.
   Submits inquiries to the shared concierge contract implemented in
   repo/server/client-hub/ (POST /api/concierge/inquiries on
   CONFIG.auth.client_hub_api_base), carrying the configured source
   identifier from CONFIG.concierge. Rules it cannot break:
   - The form renders only when the backend contract is present in
     configuration (API base plus source identifier). Without the
     contract the card renders its disabled or configuration-needed
     states instead, exactly as Phase 2 required.
   - A sent state is rendered ONLY from a real backend response
     carrying a receipt (201, or 200 with duplicate: true). No click,
     timer, or local flag can produce it.
   - No session token, no request: a send attempt without the Phase 3
     in-memory token ends in the unauthorized state. The token is
     never stored, logged, or rendered by this client either.
   - One idempotency key per composed message: the key is created
     when a message is first submitted, reused across retries of
     that same message, and replaced after a successful send or when
     the message text changes, so a retry cannot double-post and an
     edit is never mistaken for a replay. */
let conciergeStateName = 'ready';
let conciergeReceipt = null;
let conciergePending = false;
let conciergeDraftKey = null;
let conciergeDraftText = null;
let conciergeKeyCounter = 0;
const CONCIERGE_STATE_MESSAGES = {
  'missing-config': 'Concierge messaging is not configured in this build yet.',
  'unauthorized': 'Secure access is not active, so the concierge cannot take your message yet. When live access is connected and you are signed in, this form sends.',
  'ready': 'Your message goes to the shared concierge with the source identifier for this Hub.',
  'pending': 'Sending your message to the concierge.',
  'sent': 'Message recorded.',
  'failure': 'Your message could not be recorded. You can try sending it again.'
};
function conciergeConfig(){ return CONFIG.concierge || null; }
function conciergeContractPresent(){
  const cfg = authConfig();
  const concierge = conciergeConfig();
  return Boolean(cfg && cfg.client_hub_api_base && concierge && concierge.source_identifier);
}
function conciergeInitialState(){
  if(!conciergeContractPresent()) return 'missing-config';
  if(!hubSessionToken) return 'unauthorized';
  return 'ready';
}
function getConciergeState(){ return conciergeStateName; }
function getConciergeReceipt(){ return conciergeReceipt; }
function renderConciergeStatus(){
  let message = CONCIERGE_STATE_MESSAGES[conciergeStateName] || CONCIERGE_STATE_MESSAGES.ready;
  if(conciergeStateName === 'sent' && conciergeReceipt){
    message = conciergeReceipt.duplicate
      ? `That message was already recorded. Receipt ${conciergeReceipt.id}.`
      : `Message recorded. Receipt ${conciergeReceipt.id}.`;
  }
  const el = $('conciergeStatus');
  if(el){
    el.dataset.conciergeState = conciergeStateName;
    el.textContent = message;
  }
  const btn = $('conciergeSendBtn');
  if(btn){ btn.disabled = conciergePending; }
  const popupStatus = $('conciergePopupStatus');
  if(popupStatus){
    popupStatus.dataset.conciergeState = conciergeStateName;
    popupStatus.textContent = message;
  }
  const popupBtn = $('conciergePopupSendBtn');
  if(popupBtn){ popupBtn.disabled = conciergePending; }
}
function setConciergeState(name, receipt){
  conciergeStateName = name;
  if(receipt !== undefined) conciergeReceipt = receipt;
  renderConciergeStatus();
}
function newConciergeKey(){
  const c = (typeof window !== 'undefined' && window.crypto) || (typeof crypto !== 'undefined' ? crypto : null);
  if(c && typeof c.randomUUID === 'function') return c.randomUUID();
  conciergeKeyCounter += 1;
  return `hub-concierge-${Date.now()}-${conciergeKeyCounter}`;
}
async function submitConciergeInquiry(fetchFn, message, options){
  if(!conciergeContractPresent()){ setConciergeState('missing-config'); return conciergeStateName; }
  const text = String(message == null ? '' : message).trim();
  if(!text){ setConciergeState(hubSessionToken ? 'ready' : 'unauthorized'); setStatus('Write a message first, then send it to the concierge.'); return conciergeStateName; }
  if(!hubSessionToken){ setConciergeState('unauthorized'); return conciergeStateName; }
  if(conciergePending) return conciergeStateName;
  const doFetch = fetchFn || (typeof window !== 'undefined' ? window.fetch : null);
  if(!doFetch){ setConciergeState('failure'); return conciergeStateName; }
  if(conciergeDraftKey === null || conciergeDraftText !== text){ conciergeDraftKey = newConciergeKey(); conciergeDraftText = text; }
  conciergePending = true;
  setConciergeState('pending');
  try{
    const cfg = authConfig();
    const concierge = conciergeConfig();
    const payload = { tenant: activeTenantSlug(), source: concierge.source_identifier, message: text, escalation: { requested: false, emergency: false } };
    if(options && options.chatSession){
      if(!conciergeChatSessionId) conciergeChatSessionId = newChatSessionId();
      payload.chatSessionId = conciergeChatSessionId;
    }
    const res = await doFetch(`${cfg.client_hub_api_base}/api/concierge/inquiries`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hubSessionToken}`, 'Content-Type': 'application/json', 'Idempotency-Key': conciergeDraftKey },
      body: JSON.stringify(payload)
    });
    let body = {};
    try{ body = await res.json(); }catch(e){ body = {}; }
    if(res.status === 201 || res.status === 200){
      conciergeDraftKey = null;
      conciergeDraftText = null;
      setConciergeState('sent', body.receipt || null);
    } else if(res.status === 401 || res.status === 403){
      setConciergeState('unauthorized');
    } else {
      setConciergeState('failure');
    }
  }catch(e){
    setConciergeState('failure');
  }
  conciergePending = false;
  renderConciergeStatus();
  return conciergeStateName;
}

/* Follow-up release (2026-11-20, plan/FOLLOWUP-DESIGN.md): the
   Concierge pop-up chat box, the Help Desk purchase surface, and the
   concierge sessions record.
   - The Concierge button (bow tie identifier, Hayden's Nov 20
     directive superseding the DEC-0101 identifier) opens an overlay
     dialog. The chat inside it sends through the exact Phase 4
     inquiry contract above; the only addition is the optional
     chatSessionId that groups one popup conversation into one
     session in the record.
   - Focus discipline follows Phase 7: opening moves focus to the
     popup title, closing returns focus to the Concierge button,
     Escape closes, and the Visit Help Desk header button closes the
     popup as it navigates.
   - The purchase surface is configuration-driven and truthful:
     while live charges are disabled its buttons are disabled and it
     says so. No fake checkout, no success state; the only credit
     path stays the Phase 6 signed-webhook issuance.
   - The sessions record reads GET /api/concierge/sessions, which is
     scoped server-side to the caller's own sessions. A loaded state
     renders only from a real 200 response. */
let conciergePopupOpen = false;
let conciergeChatSessionId = null;
function newChatSessionId(){
  return `hub-chat-${newConciergeKey().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60)}`;
}
function isConciergePopupOpen(){ return conciergePopupOpen; }
function getConciergeChatSessionId(){ return conciergeChatSessionId; }
function conciergePopupBodyHtml(){
  const stateName = conciergeInitialState();
  if(stateName === 'missing-config'){
    return `<p>Concierge messaging is not configured in this build yet, so no message can be sent from this chat today and no chat success is shown. Booking a Help Desk session is the working route.</p>`;
  }
  if(stateName === 'unauthorized'){
    return `<p>Secure access is not active, so the concierge cannot take your message yet. When live access is connected and you are signed in, this chat sends to the shared concierge.</p><p class="concierge-status" id="conciergePopupStatus" data-concierge-state="${conciergeStateName}">${esc(CONCIERGE_STATE_MESSAGES[conciergeStateName] || CONCIERGE_STATE_MESSAGES.unauthorized)}</p>`;
  }
  return `<div class="concierge-form"><label class="quiet" for="conciergePopupMessage">Your message</label><textarea id="conciergePopupMessage" rows="4" placeholder="What do you need?"></textarea><div class="screen-actions"><button class="btn primary" type="button" id="conciergePopupSendBtn" data-concierge-popup-send="1">Send concierge message</button></div><p class="concierge-status" id="conciergePopupStatus" data-concierge-state="${conciergeStateName}">${esc(CONCIERGE_STATE_MESSAGES[conciergeStateName] || CONCIERGE_STATE_MESSAGES.ready)}</p></div>`;
}
function renderConciergePopupBody(){
  const body = $('conciergePopupBody');
  if(!body) return;
  body.innerHTML = conciergePopupBodyHtml();
  renderConciergeStatus();
  bindConciergePopupActions();
}
function bindConciergePopupActions(){
  document.querySelectorAll('[data-concierge-popup-send]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => { const field = $('conciergePopupMessage'); submitConciergeInquiry(null, field ? field.value : '', { chatSession: true }); }); });
  document.querySelectorAll('[data-concierge-close]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => { closeConciergePopup(); }); });
  document.querySelectorAll('[data-concierge-helpdesk]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => { visitHelpDeskFromConcierge(); }); });
}
function openConciergePopup(){
  const popup = $('conciergePopup');
  if(!popup) return { opened: false, reason: 'missing-popup' };
  renderConciergePopupBody();
  popup.classList.remove('hidden');
  conciergePopupOpen = true;
  focusEl($('conciergePopupTitle'));
  return { opened: true };
}
function closeConciergePopup(options){
  const popup = $('conciergePopup');
  if(popup) popup.classList.add('hidden');
  const wasOpen = conciergePopupOpen;
  conciergePopupOpen = false;
  conciergeChatSessionId = null;
  if(wasOpen && !(options && options.restoreFocus === false)) focusEl($('conciergeBtn'));
  return { closed: wasOpen };
}
function handleConciergePopupKeydown(event){
  if(event && event.key === 'Escape' && conciergePopupOpen){
    closeConciergePopup();
    return true;
  }
  return false;
}
function visitHelpDeskFromConcierge(){
  closeConciergePopup({ restoreFocus: false });
  if(activeSceneId() === 'scene-focus' && $('focusTitle') && $('focusTitle').textContent === 'Help Desk'){
    setStatus('Help Desk is already open.');
    return { navigated: false, alreadyOpen: true };
  }
  setStatus('Opening Help Desk from Concierge.');
  renderFocus('helpdesk', activeSceneId());
  return { navigated: true };
}

/* Purchase surface (follow-up design section 3). State is a pure
   function of configuration: shipped configuration is
   not-available; enabling billing later is configuration (the live
   flags plus a checkout URL), not a rebuild. */
function purchaseConfig(root){
  const cfg = root || CONFIG;
  return (cfg.helpdesk && cfg.helpdesk.purchase) || {};
}
function purchaseControlState(root){
  const cfg = root || CONFIG;
  const hd = cfg.helpdesk || {};
  const purchase = purchaseConfig(cfg);
  const enabled = cfg.live_billing_controls_enabled === true && hd.live_charges_enabled === true && purchase.live_charges_enabled === true;
  if(!enabled) return { state: 'not-available', enabled: false, checkoutUrl: null };
  if(!purchase.checkout_url) return { state: 'missing-config', enabled: false, checkoutUrl: null };
  return { state: 'ready', enabled: true, checkoutUrl: purchase.checkout_url };
}
function formatPrice(cents){
  if(cents == null || !Number.isFinite(Number(cents))) return '';
  const dollars = Number(cents) / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
function purchaseOptionsHtml(){
  const purchase = purchaseConfig();
  const options = Array.isArray(purchase.options) ? purchase.options : [];
  const st = purchaseControlState();
  const note = st.state === 'ready'
    ? 'Checkout opens on the next page. Credits are added only after payment is confirmed, never by the checkout page itself.'
    : st.state === 'missing-config'
      ? 'Purchases are not available yet: checkout is not configured for this build.'
      : 'Purchases are not available yet. Live billing has not been turned on, so no charge can be made from this page.';
  if(!options.length) return `<p class="quiet" data-purchase-note="1">${note}</p>`;
  const rows = options.map(o => `<div class="hd-purchase-row"><span>${esc(o.label || o.id || 'Credits')}</span><span>${esc(formatPrice(o.price_cents))}</span><button class="btn small ${st.enabled ? 'primary' : 'ghost'}" type="button" data-purchase-option="${esc(o.id || '')}"${st.enabled ? '' : ' disabled'}>Buy</button></div>`).join('');
  return `${rows}<p class="quiet" data-purchase-note="1">${note}</p>`;
}
function purchaseOptionClick(optionId){
  const st = purchaseControlState();
  if(st.state !== 'ready'){
    setStatus('Purchases are not available yet. No charge can be made from this page.');
    return st;
  }
  if(typeof window !== 'undefined' && typeof window.open === 'function'){
    window.open(st.checkoutUrl, '_blank', 'noopener');
  }
  return st;
}

/* Concierge sessions record (follow-up design sections 5 to 7). */
let conciergeSessionsStateName = 'unauthorized';
let conciergeSessionsData = null;
let conciergeSessionSelectedId = null;
let conciergeSessionsPending = false;
const CONCIERGE_SESSIONS_STATE_MESSAGES = {
  'missing-config': 'Concierge sessions are not configured in this build yet.',
  'unauthorized': 'Secure access is not active, so your concierge sessions cannot load yet. When live access is connected and you are signed in, your session record shows here.',
  'ready': 'Your concierge sessions can load now.',
  'pending': 'Loading your concierge sessions.',
  'loaded': 'Your concierge sessions are loaded.',
  'failure': 'Your concierge sessions could not be loaded. The concierge service may not be connected in this build yet.'
};
const CONCIERGE_OUTCOME_LABELS = { open: 'Open', answered: 'Answered', escalated: 'Escalated', closed: 'Closed' };
function conciergeSessionsInitialState(){
  if(!helpdeskContractPresent()) return 'missing-config';
  if(!hubSessionToken) return 'unauthorized';
  return 'ready';
}
function getConciergeSessionsState(){ return conciergeSessionsStateName; }
function getConciergeSessions(){ return conciergeSessionsData; }
function renderConciergeSessionsStatus(){
  const el = document.querySelector('[data-concierge-sessions-status]');
  if(el){
    el.dataset.conciergeSessionsState = conciergeSessionsStateName;
    el.textContent = CONCIERGE_SESSIONS_STATE_MESSAGES[conciergeSessionsStateName] || CONCIERGE_SESSIONS_STATE_MESSAGES.ready;
  }
}
function setConciergeSessionsState(name){
  conciergeSessionsStateName = name;
  renderConciergeSessionsStatus();
}
async function loadConciergeSessions(fetchFn){
  if(!helpdeskContractPresent()){ setConciergeSessionsState('missing-config'); return conciergeSessionsStateName; }
  if(!hubSessionToken){ setConciergeSessionsState('unauthorized'); return conciergeSessionsStateName; }
  if(conciergeSessionsPending) return conciergeSessionsStateName;
  const doFetch = fetchFn || (typeof window !== 'undefined' ? window.fetch : null);
  if(!doFetch){ setConciergeSessionsState('failure'); return conciergeSessionsStateName; }
  conciergeSessionsPending = true;
  setConciergeSessionsState('pending');
  let outcome = 'failure';
  try{
    const cfg = authConfig();
    const slug = encodeURIComponent(activeTenantSlug());
    const res = await doFetch(`${cfg.client_hub_api_base}/api/concierge/sessions?tenant=${slug}`, { headers: { Authorization: `Bearer ${hubSessionToken}` } });
    if(res.status === 401 || res.status === 403){
      outcome = 'unauthorized';
    } else if(res.status === 200){
      const body = await res.json();
      conciergeSessionsData = Array.isArray(body.sessions) ? body.sessions : [];
      outcome = 'loaded';
    }
  }catch(e){
    outcome = 'failure';
  }
  conciergeSessionsPending = false;
  setConciergeSessionsState(outcome);
  renderConciergeSessionsList();
  return conciergeSessionsStateName;
}
function renderConciergeSessionsList(){
  const box = document.querySelector('[data-concierge-sessions-list]');
  if(!box) return;
  if(!Array.isArray(conciergeSessionsData)){ box.innerHTML = ''; return; }
  if(!conciergeSessionsData.length){
    box.innerHTML = '<p class="quiet">No concierge sessions yet. Messages you send to the concierge appear here.</p>';
    return;
  }
  box.innerHTML = conciergeSessionsData.map(sd => {
    const count = sd.messageCount != null ? sd.messageCount : (Array.isArray(sd.messages) ? sd.messages.length : 0);
    return `<button class="hd-session-row" type="button" data-concierge-session="${esc(sd.id)}"><strong>${esc(String(sd.startedAt || '').slice(0, 10))}</strong><span>${count} message${count === 1 ? '' : 's'}</span><span>${esc(CONCIERGE_OUTCOME_LABELS[sd.outcome] || 'Open')}</span></button>`;
  }).join('');
  bindConciergeSessionButtons();
}
function bindConciergeSessionButtons(){
  document.querySelectorAll('[data-concierge-session]').forEach(btn => { if(btn.dataset.hubBound) return; btn.dataset.hubBound = '1'; btn.addEventListener('click', () => { selectConciergeSession(btn.dataset.conciergeSession); }); });
}
function selectConciergeSession(id){
  const found = (conciergeSessionsData || []).find(sd => sd.id === id) || null;
  conciergeSessionSelectedId = found ? found.id : null;
  renderConciergeSessionDetail();
  return found;
}
function renderConciergeSessionDetail(){
  const box = document.querySelector('[data-concierge-session-detail]');
  if(!box) return;
  const session = (conciergeSessionsData || []).find(sd => sd.id === conciergeSessionSelectedId) || null;
  if(!session){ box.innerHTML = ''; return; }
  const lines = (session.messages || []).map(m => `<div class="hd-transcript-line"><span>${esc(String(m.createdAt || '').slice(0, 16).replace('T', ' '))}</span><p>${esc(m.message || '')}</p></div>`).join('');
  let resolutionHtml;
  if(session.resolution){
    const r0 = session.resolution;
    resolutionHtml = `<div class="hd-resolution"><h4>Resolution: ${esc(CONCIERGE_OUTCOME_LABELS[r0.outcome] || r0.outcome || '')}</h4><p>${esc(r0.resolutionText || '')}</p><p class="quiet">Resolved by ${esc(r0.resolvedBy || 'HaydenWorks')} on ${esc(String(r0.resolvedAt || '').slice(0, 10))}.</p></div>`;
  } else {
    resolutionHtml = '<p class="quiet">No resolution recorded yet. This session is still open.</p>';
  }
  box.innerHTML = `<div class="hd-session-detail"><h4>Session from ${esc(String(session.startedAt || '').slice(0, 10))}</h4>${lines}${resolutionHtml}</div>`;
}

/* Phase 5 (Scope G): Help Desk credit surfaces.
   Loads the derived balance and history from the Help Desk contract
   implemented in repo/server/client-hub/ (GET /api/helpdesk/balance
   and /api/helpdesk/history on CONFIG.auth.client_hub_api_base) and
   renders them on the Help Desk screen. Rules it cannot break:
   - Shadow truthfulness: the cards always carry the Shadow banner,
     the balance is whatever the backend derived from the credit
     ledger (never typed in, never computed locally), and the Buy
     credits control is rendered disabled in every state of this
     build because live charges are disabled.
   - A loaded state is rendered ONLY from real 200 responses. No
     token, no request: a load attempt without the Phase 3 in-memory
     token ends in the unauthorized state.
   - Premium renders as its own block with its label, the remaining
     credits in the current monthly allowance, and the reset rule,
     separate from purchased, subscription, and granted balances. */
let helpdeskStateName = 'unauthorized';
let helpdeskBalanceData = null;
let helpdeskHistoryData = null;
let helpdeskPending = false;
const HELPDESK_STATE_MESSAGES = {
  'missing-config': 'Credit balances are not configured in this build yet.',
  'unauthorized': 'Secure access is not active, so your credit record cannot load yet. When live access is connected and you are signed in, your balance and history show here.',
  'ready': 'Your Shadow credit record can load now.',
  'pending': 'Loading your Shadow credit record.',
  'loaded': 'Shadow credit record loaded. Balances are derived from the credit ledger, never typed in.',
  'failure': 'Your credit record could not be loaded. The Help Desk service may not be connected in this build yet.',
  'payment-pending': 'Payment confirmation is pending. Credits are added only after the payment is confirmed, never by this page returning from checkout. Use Check credit balance to see the confirmed record.'
};
/* Phase 6 (Scope H): the checkout return path, deliberately
   powerless. A browser return from checkout is never authority to
   issue credits: it records nothing, grants nothing, and does not
   refresh optimistically. It only selects the payment-pending
   state above when the address carries the checkout=return
   marker, so a returning buyer sees a truthful pending message
   while the confirmed record catches up through the webhook. The
   Buy credits control stays disabled in every state (item I). */
function checkoutReturnState(search){
  if(typeof search !== 'string' || !search) return null;
  const q = search.charAt(0) === '?' ? search.slice(1) : search;
  if(!q) return null;
  const pairs = q.split('&');
  for(const pair of pairs){
    const eq = pair.indexOf('=');
    const k = eq < 0 ? pair : pair.slice(0, eq);
    const v = eq < 0 ? '' : pair.slice(eq + 1);
    if(k === 'checkout' && v === 'return') return 'payment-pending';
  }
  return null;
}
function currentCheckoutSearch(){
  try{ return (typeof window !== 'undefined' && window.location && window.location.search) || ''; }catch(e){ return ''; }
}
function applyCheckoutReturn(search){
  const stateName = checkoutReturnState(typeof search === 'string' ? search : currentCheckoutSearch());
  if(stateName) setHelpDeskState(stateName);
  return stateName;
}
function helpdeskContractPresent(){
  const cfg = authConfig();
  return Boolean(cfg && cfg.client_hub_api_base && CONFIG.helpdesk);
}
function helpdeskInitialState(){
  if(!helpdeskContractPresent()) return 'missing-config';
  if(!hubSessionToken) return 'unauthorized';
  return 'ready';
}
function getHelpDeskState(){ return helpdeskStateName; }
function getHelpDeskBalance(){ return helpdeskBalanceData; }
function getHelpDeskHistory(){ return helpdeskHistoryData; }
function serviceMonthLabel(ym){
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
  if(!m) return 'this service month';
  return `${names[Number(m[2]) - 1] || ''} ${m[1]}`.trim();
}
function renderHelpDeskBuckets(balance){
  if(!balance || !balance.buckets) return '<p class="quiet">No balance loaded yet. Use Check credit balance after secure access is active.</p>';
  const b = balance.buckets;
  const prem = b.premium || {};
  let html = `<div class="hd-bucket premium"><div class="hd-bucket-head"><strong>${esc(prem.label || 'Help Desk Premium')}</strong><span class="badge gold">Separate allowance</span></div><p>${prem.available != null ? prem.available : 0} of ${prem.monthlyAllowance != null ? prem.monthlyAllowance : 4} call credits remain for ${esc(serviceMonthLabel(prem.serviceMonth))}.</p><p class="quiet">This allowance resets each service month and never rolls over. It is kept separate from every other credit balance.</p>${prem.expiresAt ? `<p class="quiet">This service month ends ${esc(String(prem.expiresAt).slice(0, 10))}; unused Premium calls expire then.</p>` : ''}</div>`;
  const row = (label, bucket, meta) => {
    const avail = bucket && bucket.available != null ? bucket.available : 0;
    const held = bucket && bucket.held ? `, ${bucket.held} on hold` : '';
    return `<div class="hd-bucket"><strong>${label}</strong><span>${avail} available${held}</span>${meta ? `<span class="hd-meta">${esc(meta)}</span>` : ''}</div>`;
  };
  const expiryMeta = (bucket) => (bucket && bucket.nextExpiresAt ? `Next expiry ${String(bucket.nextExpiresAt).slice(0, 10)}` : '');
  const subMeta = [b.subscription && b.subscription.rolloverDate ? `Rolls over ${String(b.subscription.rolloverDate).slice(0, 10)}, up to the cap of 8 credits` : '', expiryMeta(b.subscription)].filter(Boolean).join(' · ');
  html += row('Purchased credits', b.purchased, expiryMeta(b.purchased)) + row('Subscription credits', b.subscription, subMeta) + row('Granted credits', b.grant, expiryMeta(b.grant));
  if(balance.subscriptionStatus){
    const ss = balance.subscriptionStatus;
    html += `<p class="quiet">Subscription: ${ss.active ? `active, ${ss.creditsPerMonth != null ? ss.creditsPerMonth : 4} credits per month` : 'not active'}${ss.nextRolloverAt ? `. Next rollover ${String(ss.nextRolloverAt).slice(0, 10)}` : ''}.</p>`;
  }
  if(balance.lastSession){
    const ls = balance.lastSession;
    html += `<p class="quiet">Last Help Desk call: ${esc(ls.sessionKind || 'session')} session on ${esc(String(ls.completedAt || '').slice(0, 10))}, ${ls.credits != null ? ls.credits : 0} credit${ls.credits === 1 ? '' : 's'} used.</p>`;
  } else if(balance.lastSession === null){
    html += '<p class="quiet">No completed Help Desk calls yet.</p>';
  }
  html += `<p class="quiet">Total available: ${balance.totalAvailable != null ? balance.totalAvailable : 0} credits${balance.totalHeld ? `, ${balance.totalHeld} on hold` : ''}.</p>`;
  if(balance.overdraftOutstanding > 0) html += `<p class="quiet">An emergency overdraft of ${balance.overdraftOutstanding} credit${balance.overdraftOutstanding === 1 ? '' : 's'} is outstanding. New credits repay it first.</p>`;
  return html;
}
function renderHelpDeskHistory(entries){
  if(!Array.isArray(entries)) return '<p class="quiet">No history loaded yet.</p>';
  if(!entries.length) return '<p class="quiet">No credit activity yet in this Shadow record.</p>';
  return entries.map(e => `<div class="hd-entry"><b>${esc(e.explanation || e.kind || 'Entry')}</b><span>${esc(String(e.effectiveAt || '').slice(0, 10))} · Shadow record</span></div>`).join('');
}
function helpdeskCardsHtml(){
  helpdeskStateName = checkoutReturnState(currentCheckoutSearch()) || helpdeskInitialState();
  return `<article class="card"><h2>Help Desk credits</h2><div class="hd-shadow"><strong>Shadow mode.</strong> This credit record proves the Help Desk lifecycle for reconciliation. No live charges are possible in this build, and no payment is ever taken on this screen.</div><p class="concierge-status" id="helpdeskStatus" data-helpdesk-state="${helpdeskStateName}">${esc(HELPDESK_STATE_MESSAGES[helpdeskStateName])}</p><div id="helpdeskBuckets">${renderHelpDeskBuckets(null)}</div><div class="screen-actions"><button class="btn ghost" type="button" data-helpdesk-load="1">Check credit balance</button><button class="btn primary" type="button" disabled>Buy credits</button></div><p class="quiet">Purchases stay disabled until live billing is approved. In this build, bookings and balances are Shadow records kept for reconciliation.</p><div class="hd-purchase"><h3>Buy more credits</h3>${purchaseOptionsHtml()}</div></article><article class="card"><h2>Credit history</h2><div id="helpdeskHistoryList">${renderHelpDeskHistory(null)}</div></article><article class="card"><h2>Concierge sessions</h2><p>Your concierge chat sessions, with the full transcript of each one and how it was resolved.</p><p class="concierge-status" data-concierge-sessions-status="1">${esc(CONCIERGE_SESSIONS_STATE_MESSAGES[conciergeSessionsInitialState()])}</p><div class="screen-actions"><button class="btn ghost" type="button" data-concierge-sessions-load="1">View concierge sessions</button></div><div data-concierge-sessions-list="1"></div><div data-concierge-session-detail="1"></div></article>`;
}
function renderHelpDeskStatus(){
  const el = $('helpdeskStatus');
  if(el){
    el.dataset.helpdeskState = helpdeskStateName;
    el.textContent = HELPDESK_STATE_MESSAGES[helpdeskStateName] || HELPDESK_STATE_MESSAGES.ready;
  }
  const buckets = $('helpdeskBuckets');
  if(buckets && helpdeskBalanceData) buckets.innerHTML = renderHelpDeskBuckets(helpdeskBalanceData);
  const list = $('helpdeskHistoryList');
  if(list && helpdeskHistoryData) list.innerHTML = renderHelpDeskHistory(helpdeskHistoryData);
}
function setHelpDeskState(name){
  helpdeskStateName = name;
  renderHelpDeskStatus();
}
async function loadHelpDesk(fetchFn){
  if(!helpdeskContractPresent()){ setHelpDeskState('missing-config'); return helpdeskStateName; }
  if(!hubSessionToken){ setHelpDeskState('unauthorized'); return helpdeskStateName; }
  if(helpdeskPending) return helpdeskStateName;
  const doFetch = fetchFn || (typeof window !== 'undefined' ? window.fetch : null);
  if(!doFetch){ setHelpDeskState('failure'); return helpdeskStateName; }
  helpdeskPending = true;
  setHelpDeskState('pending');
  let outcome = 'failure';
  try{
    const cfg = authConfig();
    const slug = encodeURIComponent(activeTenantSlug());
    const headers = { Authorization: `Bearer ${hubSessionToken}` };
    const balRes = await doFetch(`${cfg.client_hub_api_base}/api/helpdesk/balance?tenant=${slug}`, { headers });
    if(balRes.status === 401 || balRes.status === 403){
      outcome = 'unauthorized';
    } else if(balRes.status === 200){
      const balBody = await balRes.json();
      const histRes = await doFetch(`${cfg.client_hub_api_base}/api/helpdesk/history?tenant=${slug}`, { headers });
      if(histRes.status === 200){
        const histBody = await histRes.json();
        helpdeskBalanceData = balBody.balance || null;
        helpdeskHistoryData = Array.isArray(histBody.entries) ? histBody.entries : [];
        outcome = 'loaded';
      }
    }
  }catch(e){
    outcome = 'failure';
  }
  helpdeskPending = false;
  setHelpDeskState(outcome);
  return helpdeskStateName;
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
  $('enterBtn').addEventListener('click', () => { if(enterPending) return; enterPending = true; setStatus('Opening Client Hub menu.'); showScene('scene-welcome'); setTimeout(()=>{ showScene('scene-menu'); focusEl($('packageTitle')); enterPending = false; }, reduceMotion ? 0 : 750); });
  $('skipIntro').addEventListener('click', () => { setStatus('Intro skipped.'); showScene('scene-menu'); focusEl($('packageTitle')); });
  $('backToMenu').addEventListener('click', () => { setStatus('Returning to previous Client Hub screen.'); showScene(focusOrigin || 'scene-menu'); focusEl($('packageTitle')); });
  $('securityBtn').addEventListener('click', () => renderFocus('security', activeSceneId()));
  const conciergeBtn = document.createElement('button');
  conciergeBtn.id = 'conciergeBtn';
  conciergeBtn.type = 'button';
  conciergeBtn.className = 'concierge-btn hidden';
  conciergeBtn.setAttribute('aria-label', 'Concierge: open the concierge chat');
  conciergeBtn.innerHTML = '<span class="concierge-mark" aria-hidden="true">🎀</span><span>Concierge</span>';
  conciergeBtn.addEventListener('click', openConcierge);
  document.body.appendChild(conciergeBtn);
  const conciergePopup = document.createElement('div');
  conciergePopup.id = 'conciergePopup';
  conciergePopup.className = 'concierge-popup hidden';
  conciergePopup.setAttribute('role', 'dialog');
  conciergePopup.setAttribute('aria-modal', 'true');
  conciergePopup.setAttribute('aria-labelledby', 'conciergePopupTitle');
  conciergePopup.innerHTML = '<div class="concierge-popup-card"><div class="concierge-popup-head"><h2 id="conciergePopupTitle" tabindex="-1">Concierge</h2><div class="concierge-popup-actions"><button class="btn small primary" type="button" data-concierge-helpdesk="1">Visit Help Desk</button><button class="btn small ghost" type="button" data-concierge-close="1" aria-label="Close concierge chat">Close</button></div></div><div class="concierge-popup-body" id="conciergePopupBody"></div></div>';
  conciergePopup.addEventListener('keydown', handleConciergePopupKeydown);
  document.body.appendChild(conciergePopup);
  if(typeof document.addEventListener === 'function'){ document.addEventListener('keydown', handleConciergePopupKeydown); }
  bindConciergePopupActions();
  updateConciergeVisibility(activeSceneId());
  /* Picker release: the Switch brand button lives on the menu scene
     and is visible only for a signed-in user with more than one
     served membership (updateSwitchBrandVisibility, driven from the
     auth panel renders). It returns to the picker without signing
     out. */
  switchBrandBtn = document.createElement('button');
  switchBrandBtn.id = 'switchBrandBtn';
  switchBrandBtn.type = 'button';
  switchBrandBtn.className = 'btn ghost hidden';
  switchBrandBtn.textContent = 'Switch brand';
  switchBrandBtn.addEventListener('click', () => { showTenantPicker(); });
  const menuScene = $('scene-menu');
  if(menuScene){ menuScene.appendChild(switchBrandBtn); }
  const accessHost = (document.querySelector && document.querySelector('.access-card')) || $('scene-access');
  if(accessHost){ authPanelEl = createAuthPanel(); accessHost.appendChild(authPanelEl); renderAuthPanel(); }
  bindDynamicActions();
}
boot();

