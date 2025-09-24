/* =========================
   Jesus Loves You — script.js
   Keeps every feature, adds new-believer onboarding utilities.
   ========================= */

// ---------- Helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

// ---------- PWA manifest (inline) ----------
(function initManifest(){
  const manifest = {
    name: "Jesus Loves You",
    short_name: "JLY",
    start_url: ".",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#002244",
    icons: [
      {
        src:
          "data:image/svg+xml;utf8," +
          "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>" +
          "<rect width='64' height='64' rx='12' fill='%230b2c5a'/>" +
          "<path d='M30 10h4v16h16v4H34v24h-4V30H14v-4h16z' fill='%23fff'/>" +
          "</svg>",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
  const blob = new Blob([JSON.stringify(manifest)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = url;
  document.head.appendChild(link);
})();

// ---------- Theme + Font controls ----------
(function initThemeAndFont(){
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const applyThemeMeta = () => {
    const isDark =
      root.getAttribute('data-theme') === 'dark' ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches &&
       !root.getAttribute('data-theme'));
    themeMeta && themeMeta.setAttribute('content', isDark ? '#0b1220' : '#002244');
  };

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) root.setAttribute('data-theme', savedTheme);
  applyThemeMeta();

  on($('#themeToggle'), 'click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    applyThemeMeta();
  });

  let fontScale = parseInt(localStorage.getItem('fontScale') || '100', 10);
  function applyScale(){ document.documentElement.style.fontSize = (fontScale/100*16)+'px'; }
  applyScale();
  on($('#fontMinus'), 'click', () => {
    fontScale = Math.max(85, fontScale - 5);
    localStorage.setItem('fontScale', fontScale);
    applyScale();
  });
  on($('#fontPlus'), 'click', () => {
    fontScale = Math.min(130, fontScale + 5);
    localStorage.setItem('fontScale', fontScale);
    applyScale();
  });

  // Hotkeys
  on(window, 'keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') $('#themeToggle')?.click();
    if (e.key === '+' || e.key === '=') $('#fontPlus')?.click();
    if (e.key === '-') $('#fontMinus')?.click();
  });
})();

// ---------- Mobile nav toggle ----------
on($('#menuToggle'), 'click', () => $('#mainNav')?.classList.toggle('open'));

// ---------- Compact nav (desktop) ----------
(function initCompactNav(){
  const nav = $('#mainNav');
  if (!nav) return;
  nav.classList.add('compact');
  const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (hasTouch){
    on(nav, 'click', (e)=>{
      if (e.target.closest('a')) return;
      nav.classList.toggle('expanded');
    });
    on(document, 'click', (e)=>{
      if (!nav.contains(e.target)) nav.classList.remove('expanded');
    });
  }
})();

// ---------- Smooth scroll + active section ----------
(function initSmoothScrollAndActive(){
  $$('a[href^="#"]').forEach(a => {
    on(a, 'click', e => {
      const id = a.getAttribute('href');
      if (id && id.length > 1) {
        const el = document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        const headerH = document.querySelector('header')?.offsetHeight || 0;
        const top = el.getBoundingClientRect().top + window.pageYOffset - (headerH + 8);
        window.scrollTo({ top, behavior: 'smooth' });
        const nav = $('#mainNav');
        if (nav?.classList.contains('open')) nav.classList.remove('open');
      }
    });
  });

  const links = Array.from($$('#mainNav a[href^="#"]'));
  const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const id='#'+entry.target.id;
      const link=links.find(a=>a.getAttribute('href')===id);
      if (!link) return;
      if (entry.isIntersecting) {
        links.forEach(a=>a.removeAttribute('aria-current'));
        link.setAttribute('aria-current','page');
      }
    });
  }, { rootMargin:'-40% 0px -55% 0px', threshold:0 });
  sections.forEach(sec=>io.observe(sec));
})();

// ---------- Back to top ----------
(function initBackToTop(){
  const backTop = $('#backTop');
  if (!backTop) return;
  on(window, 'scroll', () => {
    (window.scrollY > 600) ? backTop.classList.add('show') : backTop.classList.remove('show');
  });
  on(backTop, 'click', () => window.scrollTo({ top:0, behavior:'smooth' }));
})();

// ---------- Online/offline banner ----------
(function initOfflineBanner(){
  const offlineBanner = $('#offlineBanner');
  if (!offlineBanner) return;
  const updateOnline = () => offlineBanner.classList.toggle('show', !navigator.onLine);
  on(window, 'online', updateOnline);
  on(window, 'offline', updateOnline);
  updateOnline();
})();

// ---------- Verse fetcher (Our Manna API) ----------
async function fetchVerse(apiUrl, selectorId) {
  const el = document.getElementById(selectorId);
  if (!el) return;
  try {
    const resp = await fetch(apiUrl, { cache:'no-store' });
    const data = await resp.json();
    const text = data?.verse?.details?.text || '—';
    const ref  = data?.verse?.details?.reference || '';
    el.querySelector('.verse-text').textContent = text;
    el.querySelector('.cite-ref').textContent  = ref;
  } catch (err) {
    el.querySelector('.verse-text').textContent = 'Could not load verse.';
    el.querySelector('.cite-ref').textContent = '';
  }
}
document.addEventListener('DOMContentLoaded', () => {
  fetchVerse("https://beta.ourmanna.com/api/v1/get/?format=json", 'verse-esv');
});

function currentVerse(){
  const el=$('#verse-esv');
  return {
    text: el?.querySelector('.verse-text')?.textContent?.trim() || '',
    ref:  el?.querySelector('.cite-ref')?.textContent?.trim() || ''
  };
}

// ---------- Verse actions ----------
on($('#btnCopyVerse'), 'click', async ()=>{
  const v=currentVerse(); const payload=`${v.text} — ${v.ref}`;
  try{
    await navigator.clipboard.writeText(payload);
    alert('Verse copied to clipboard.');
  }catch{
    const ta=document.createElement('textarea'); ta.value=payload; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta); alert('Verse copied to clipboard.');
  }
});

on($('#btnShareVerse'), 'click', async ()=>{
  const v=currentVerse(); const text=`${v.text} — ${v.ref}`;
  if (navigator.share) {
    try { await navigator.share({ title: v.ref || 'Daily Verse', text }); } catch {}
  } else {
    const url = location.href;
    const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tw,'_blank','noopener');
  }
});

on($('#btnSpeakVerse'), 'click', ()=>{
  const v=currentVerse();
  try{
    const u=new SpeechSynthesisUtterance(`${v.text}. ${v.ref}`);
    u.lang='en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }catch{}
});

// Canvas helpers for image
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight){
  const words=text.split(' '); let line='';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
  return y;
}
function drawVerseToCanvas() {
  const { text, ref } = currentVerse();
  const canvas = $('#verseCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0b264c'); grad.addColorStop(1, '#08152a');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i=0;i<6;i++){ ctx.beginPath(); ctx.arc(80 + i*180, 120 + (i%2)*60, 60, 0, Math.PI*2); ctx.fill(); }

  ctx.fillStyle = '#9fd1ff'; ctx.font = 'bold 36px Inter, system-ui, sans-serif'; ctx.fillText('Daily Bible Verse', 60, 80);

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 44px Inter, system-ui, sans-serif'; ctx.textBaseline = 'top'; ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 4;
  const maxWidth = W - 120; let y = 140; const trySizes = [44, 40, 36, 32, 28];
  for (const size of trySizes){
    ctx.font = `bold ${size}px Inter, system-ui, sans-serif`;
    const measure = ctx.measureText(text);
    if (size === trySizes[trySizes.length-1] || measure.width / maxWidth < 3.5) {
      y = wrapCanvasText(ctx, text, 60, y, maxWidth, size * 1.35) + 24; break;
    }
  }
  ctx.shadowBlur = 0; ctx.fillStyle = '#9fd1ff'; ctx.font = 'bold 32px Inter, system-ui, sans-serif'; ctx.fillText(ref || '', 60, y);

  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '600 20px Inter, system-ui, sans-serif';
  const footer = 'jesuslovesyousomuch.github.io/Jesus-is-the-only-way';
  ctx.fillText(footer, 60, H - 60);
}

on($('#btnImageVerse'), 'click', () => {
  drawVerseToCanvas();
  const canvas = $('#verseCanvas');
  const link = document.createElement('a');
  const safeRef = (currentVerse().ref || 'verse').replace(/[^a-z0-9\-_. ]/gi,'_').slice(0,60);
  link.download = `${safeRef}.png`; link.href = canvas.toDataURL('image/png'); link.click();
});

on($('#btnOpenVerse'), 'click', ()=>{
  const v=currentVerse();
  if (v.ref){ openPassageTextModal(v.ref); }
  else { openKeywordModal('verse of the day ESV'); }
});

on($('#btnFullVerse'), 'click', ()=>{
  const v=currentVerse();
  $('#vmRef').textContent = v.ref || '';
  $('#vmText').textContent = v.text || '';
  try{ new bootstrap.Modal($('#verseModal')).show(); }catch{ alert(`${v.ref}\n\n${v.text}`); }
});

// ---------- Lookup & Story popup logic ----------
function parseBibleRef(input){
  const refRe = /^\s*([1-3]?\s?[A-Za-z\.]+)\s+(\d+)(?::(\d+(?:-\d+)?))?\s*$/;
  const m = input.match(refRe); if (!m) return null;
  const book = m[1].replace(/\s+/g,' ').trim(); const chap  = m[2]; const verse = m[3] || '';
  return { book, chap, verse };
}

function showLookupText(ref, text){
  $('#lookupText').style.display = '';
  $('#lookupFrameWrap').style.display = 'none';
  $('#lookupRef').textContent = ref;
  $('#lookupContent').textContent = text.trim();
  new bootstrap.Modal($('#lookupModal')).show();
}
function showLookupIframe(url){
  const wrap = $('#lookupFrameWrap');
  const frame = $('#lookupFrame');
  const fb = $('#lookupFallback');
  const ext = $('#lookupOpenExternal');
  $('#lookupText').style.display = 'none';
  wrap.style.display = ''; fb.style.display = 'none'; frame.src = url; ext.href = url;
  new bootstrap.Modal($('#lookupModal')).show();
  // if embedding is blocked, show fallback link
  setTimeout(()=>{ try{ void frame.contentWindow.document.title; } catch(e){ fb.style.display=''; } }, 1200);
}

async function openPassageTextModal(ref){
  // Use bible-api.com (public domain WEB translation)
  const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=web`;
  try{
    const r = await fetch(url, {cache:'no-store'}); const j = await r.json();
    const verses = (j.verses || []).map(v => `${v.text.trim()} (${v.book_name} ${v.chapter}:${v.verse})`).join('\n');
    const text = j.text ? j.text : verses || 'Passage not found.';
    const reference = j.reference || ref;
    showLookupText(reference, text);
  }catch{
    // fallback to search page in iframe
    showLookupIframe(`https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=ESV`);
  }
}

function openKeywordModal(query){
  const url = `https://www.biblegateway.com/quicksearch/?quicksearch=${encodeURIComponent(query)}&version=ESV`;
  showLookupIframe(url);
}

// Quick lookup submit
on($('#verseLookupForm'), 'submit', (e)=>{
  e.preventDefault();
  const q = ($('#verseLookupInput').value || '').trim();
  if (!q) return; 
  const ref = parseBibleRef(q);
  if (ref){
    const refString = `${ref.book} ${ref.chap}${ref.verse ? ':'+ref.verse : ''}`;
    openPassageTextModal(refString);
  } else {
    openKeywordModal(q);
  }
});

// ---------- Story Picker ----------
const STORY_REFS = [
  {label:'Creation (Genesis 1–2)', ref:'Genesis 1-2'},
  {label:'The Fall (Genesis 3)', ref:'Genesis 3'},
  {label:'Noah’s Ark (Genesis 6–9)', ref:'Genesis 6-9'},
  {label:'Abraham’s Call (Genesis 12:1–9)', ref:'Genesis 12:1-9'},
  {label:'Abraham & Isaac (Genesis 22:1–19)', ref:'Genesis 22:1-19'},
  {label:'Joseph in Egypt (Gen 37; 39–45)', ref:'Genesis 37, Genesis 39-45'},
  {label:'Moses & the Burning Bush (Ex 3:1–15)', ref:'Exodus 3:1-15'},
  {label:'Passover & Exodus (Ex 12–14)', ref:'Exodus 12-14'},
  {label:'Ten Commandments (Ex 20:1–17)', ref:'Exodus 20:1-17'},
  {label:'David & Goliath (1 Sam 17)', ref:'1 Samuel 17'},
  {label:'Elijah vs Baal (1 Kgs 18:20–46)', ref:'1 Kings 18:20-46'},
  {label:'Daniel in the Lions’ Den (Dan 6)', ref:'Daniel 6'},
  {label:'Jonah and the Great Fish (Jonah 1–4)', ref:'Jonah 1-4'},
  {label:'Birth of Jesus (Luke 2:1–20)', ref:'Luke 2:1-20'},
  {label:'Sermon on the Mount (Matt 5–7)', ref:'Matthew 5-7'},
  {label:'Good Samaritan (Luke 10:25–37)', ref:'Luke 10:25-37'},
  {label:'Prodigal Son (Luke 15:11–32)', ref:'Luke 15:11-32'},
  {label:'Jesus Walks on Water (Matt 14:22–33)', ref:'Matthew 14:22-33'},
  {label:'Crucifixion (John 19:16–30)', ref:'John 19:16-30'},
  {label:'Resurrection (Luke 24:1–12)', ref:'Luke 24:1-12'},
  {label:'Great Commission (Matt 28:16–20)', ref:'Matthew 28:16-20'},
  {label:'Pentecost (Acts 2:1–41)', ref:'Acts 2:1-41'},
  {label:'Conversion of Paul (Acts 9:1–19)', ref:'Acts 9:1-19'},
];

on($('#openStory'), 'click', ()=>{
  const sel = $('#storySelect'); if (sel?.value) openPassageTextModal(sel.value);
});
on($('#randomStory'), 'click', ()=>{
  const pick = STORY_REFS[Math.floor(Math.random()*STORY_REFS.length)];
  if ($('#storySelect')) $('#storySelect').value = pick.ref;
  openPassageTextModal(pick.ref);
});

// Story of the Day
function pickDailyStory(){
  const d = new Date(); const ymd = Number(d.toISOString().slice(0,10).replace(/-/g,'')); 
  return STORY_REFS[ymd % STORY_REFS.length];
}
function renderSOD(story){
  $('#sodLabel').textContent = story.label;
  $('#openSOD').onclick = ()=> openPassageTextModal(story.ref);
}
document.addEventListener('DOMContentLoaded', ()=>{ const s = pickDailyStory(); renderSOD(s); });
on($('#reloadSOD'), 'click', ()=>{
  const s = STORY_REFS[Math.floor(Math.random()*STORY_REFS.length)]; renderSOD(s);
});

// ---------- Prayer Streak ----------
const STREAK_KEY = 'jly:streakDates';
function todayKey(){ const d=new Date(); return d.toISOString().slice(0,10); }
function calcStreak(dates){
  const set = new Set(dates); let curr = 0; let day = new Date();
  for(;;){ const key = day.toISOString().slice(0,10); if (set.has(key)){ curr++; day.setDate(day.getDate()-1); } else break; }
  const sorted = [...dates].sort(); let longest = 0, run = 0, prev = null;
  for(const k of sorted){
    if (!prev){ run=1; }
    else {
      const d1 = new Date(prev), d2 = new Date(k);
      const diff = Math.round((d2 - d1) / 86400000);
      run = (diff === 1) ? run + 1 : 1;
    }
    longest = Math.max(longest, run); prev = k;
  }
  return { curr, longest };
}
function renderStreak(){
  const dates = JSON.parse(localStorage.getItem(STREAK_KEY) || '[]');
  const { curr, longest } = calcStreak(dates);
  $('#streakCurrent').textContent = curr;
  $('#streakLongest').textContent = longest;
}
function addToday(){
  const dates = JSON.parse(localStorage.getItem(STREAK_KEY) || '[]'); const t = todayKey();
  if (!dates.includes(t)){ dates.push(t); localStorage.setItem(STREAK_KEY, JSON.stringify(dates)); renderStreak(); }
}
function removeToday(){
  const dates = JSON.parse(localStorage.getItem(STREAK_KEY) || '[]'); const t = todayKey(); const idx = dates.indexOf(t);
  if (idx>-1){ dates.splice(idx,1); localStorage.setItem(STREAK_KEY, JSON.stringify(dates)); renderStreak(); }
}
renderStreak();
on($('#markToday'), 'click', addToday);
on($('#undoToday'), 'click', removeToday);

// ---------- Calendar (.ics) for daily devotional ----------
function pad(n){ return n.toString().padStart(2,'0'); }
function nextStartAt(hourLocal){ const d = new Date(); d.setMinutes(0,0,0); if (d.getHours() >= hourLocal) d.setDate(d.getDate()+1); d.setHours(hourLocal); return d; }
on($('#downloadICS'), 'click', ()=>{
  const start = nextStartAt(7);
  const dt = `${start.getFullYear()}${pad(start.getMonth()+1)}${pad(start.getDate())}T${pad(start.getHours())}${pad(start.getMinutes())}00`;
  const uid = `${Date.now()}@jly`;
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//JLY//Devotional Reminder//EN',
    'BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${dt}`,`DTSTART:${dt}`,
    'DURATION:PT15M','RRULE:FREQ=DAILY','SUMMARY:Daily Devotional',
    'DESCRIPTION:Set aside 15 minutes for Scripture, prayer, and reflection.','END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], {type:'text/calendar;charset=utf-8'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'daily-devotional.ics'; a.click(); URL.revokeObjectURL(url);
});

// ---------- Share & QR ----------
on($('#shareSite'), 'click', async ()=>{
  const url = location.href; const title = 'Jesus Loves You'; const text  = 'Be encouraged. Read the daily Bible verse here.';
  if (navigator.share){ try{ await navigator.share({ title, text, url }); } catch {} }
  else { try{ await navigator.clipboard.writeText(url); alert('Link copied to clipboard.'); }
  catch{ open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,'_blank','noopener'); } }
});
on($('#openQR'), 'click', ()=>{
  const url = location.href; const img = document.createElement('img'); img.alt = 'QR code'; img.width = 240; img.height = 240;
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;
  const box = $('#qrcode'); if (box){ box.innerHTML=''; box.appendChild(img); }
  try{ new bootstrap.Modal($('#qrModal')).show(); }catch{ alert('QR code ready. If the modal did not open, please allow popups.'); }
});

// ---------- Find church near me ----------
on($('#findChurch'), 'click', ()=>{
  if (navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      pos => { const { latitude, longitude } = pos.coords; const url = `https://www.google.com/maps/search/church/@${latitude},${longitude},14z`; window.open(url, '_blank', 'noopener'); },
      () => window.open('https://www.google.com/maps/search/church+near+me', '_blank', 'noopener'),
      { timeout: 6000 }
    );
  } else { window.open('https://www.google.com/maps/search/church+near+me', '_blank', 'noopener'); }
});

// ---------- Journal ----------
const J_KEY = 'jly:journal';
function renderJournal(){
  const list = $('#journalList');
  if (!list) return;
  const items = JSON.parse(localStorage.getItem(J_KEY) || '[]');
  if (!items.length){ list.innerHTML = `<p class="muted">No entries yet.</p>`; return; }
  list.innerHTML = items.slice().reverse().map((it) => `
    <div class="mb-2 p-2" style="border:1px dashed rgba(255,255,255,.2); border-radius:8px;">
      <div style="font-weight:800">${new Date(it.at).toLocaleString()}</div>
      <div style="white-space:pre-wrap">${(it.text||'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</div>
    </div>
  `).join('');
}
function saveJournal(){
  const ta = $('#journalText'); const text = (ta.value || '').trim(); if (!text) return;
  const items = JSON.parse(localStorage.getItem(J_KEY) || '[]'); items.push({ text, at: Date.now() });
  localStorage.setItem(J_KEY, JSON.stringify(items)); ta.value=''; renderJournal();
}
function exportJournal(){
  const items = JSON.parse(localStorage.getItem(J_KEY) || '[]');
  const txt = items.map(i => `[${new Date(i.at).toLocaleString()}]\n${i.text}\n\n`).join('') || 'No entries yet.';
  const blob = new Blob([txt], {type:'text/plain'}); const url  = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'journal.txt'; a.click(); URL.revokeObjectURL(url);
}
function clearJournal(){
  if (confirm('Delete ALL journal entries? This cannot be undone.')){
    localStorage.setItem(J_KEY, JSON.stringify([])); renderJournal();
  }
}
renderJournal();
on($('#saveJournal'), 'click', saveJournal);
on($('#exportJournal'), 'click', exportJournal);
on($('#clearJournal'), 'click', clearJournal);

// ---------- Devotional Timer ----------
(function initTimer(){
  const display = $('#timerDisplay');
  const startBtn = $('#timerStart');
  const pauseBtn = $('#timerPause');
  const resetBtn = $('#timerReset');
  const pills = Array.from($$('#timerCard .timer-pills button'));
  if (!display) return;

  const state = { base: 15*60, remaining: 15*60, running:false, endAt:null, id:null };

  const fmt = (sec) => {
    sec = Math.max(0, Math.ceil(sec));
    const m = Math.floor(sec/60), s = sec%60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  const render = () => { display.textContent = fmt(state.remaining); };

  function setBase(min){
    state.base = min*60;
    state.remaining = state.base;
    state.endAt = null;
    if (state.id){ clearInterval(state.id); state.id=null; }
    state.running=false;
    pills.forEach(b=>b.classList.toggle('active', Number(b.dataset.min)===min));
    render();
  }
  function tick(){
    if (!state.running) return;
    state.remaining = Math.max(0, Math.ceil((state.endAt - Date.now())/1000));
    render();
    if (state.remaining <= 0){
      stop();
      chime();
    }
  }
  function start(){
    if (state.running) return;
    state.running = true;
    state.endAt = Date.now() + state.remaining*1000;
    state.id = setInterval(tick, 250);
    tick();
  }
  function pause(){
    if (!state.running) return;
    state.running = false;
    if (state.id){ clearInterval(state.id); state.id=null; }
  }
  function stop(){ pause(); state.remaining = 0; render(); }
  function reset(){ pause(); state.remaining = state.base; render(); }
  function chime(){
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const beep = (f, t) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type='sine'; o.frequency.value=f; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime+0.02);
        o.start(); o.stop(ctx.currentTime + t);
      };
      beep(880, 0.15); setTimeout(()=>beep(660,0.2), 180);
      setTimeout(()=>ctx.close(), 800);
    }catch{}
    if (navigator.vibrate) navigator.vibrate([150,80,150]);
    try { document.title = '⏱ Done! — Jesus Loves You'; setTimeout(()=>{ document.title='Jesus Loves You'; }, 4000);} catch{}
  }

  pills.forEach(b=>on(b,'click', ()=> setBase(Number(b.dataset.min))));
  on(startBtn, 'click', start);
  on(pauseBtn, 'click', pause);
  on(resetBtn, 'click', reset);
  setBase(15);
})();

// ---------- Start Here — Onboarding ----------
(function initStartHere(){
  // Toggle gospel verses (any element with data-open="#id")
  $$('[data-open]').forEach(btn => {
    on(btn, 'click', ()=>{
      const target = $(btn.getAttribute('data-open'));
      if (!target) return;
      const hidden = target.hasAttribute('hidden');
      if (hidden) target.removeAttribute('hidden'); else target.setAttribute('hidden','');
    });
  });

  // Prayer to receive Jesus
  on($('#prayNow'), 'click', ()=>{
    const prayer =
`Lord Jesus, I confess that I am a sinner. I believe You died for my sins and rose again.
I turn from my sin and receive You as my Lord and Savior.
Lead me by Your Spirit. Amen.`;
    $('#lookupRef').textContent = 'Prayer of Salvation';
    $('#lookupContent').textContent = prayer;
    $('#lookupText').style.display = '';
    $('#lookupFrameWrap').style.display = 'none';
    try{ new bootstrap.Modal($('#lookupModal')).show(); }catch{ alert(prayer); }
  });

  // New Believer Checklist (persist per item)
  const NB_PREFIX = 'jly:nb:';
  $$('#nbChecklist input[type="checkbox"][data-key]').forEach(cb => {
    const k = cb.getAttribute('data-key');
    const saved = localStorage.getItem(NB_PREFIX + k);
    cb.checked = saved === '1';
    on(cb, 'change', () => localStorage.setItem(NB_PREFIX + k, cb.checked ? '1' : '0'));
  });
  on($('#resetNB'), 'click', ()=>{
    if (!confirm('Reset your New Believer checklist?')) return;
    $$('#nbChecklist input[type="checkbox"][data-key]').forEach(cb => {
      cb.checked = false;
      localStorage.setItem(NB_PREFIX + cb.getAttribute('data-key'), '0');
    });
  });

  // 30-day plan: download .txt + add calendar entries (single recurring)
  const PLAN_TEXT =
`30-Day Starter Plan
Days 1–7: John 1–7 (Pray 5–10 minutes daily)
Days 8–14: John 8–14 (Write 3 blessings daily)
Days 15–21: John 15–21 (Memorize John 14:6)
Days 22–30: Philippians + 1 John (Serve someone daily)`;
  on($('#dlPlan'), 'click', ()=>{
    const blob = new Blob([PLAN_TEXT], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='30-day-plan.txt'; a.click();
    URL.revokeObjectURL(url);
  });
  on($('#addPlanICS'), 'click', ()=>{
    // 30 days, daily reminder at 7am, 10 minutes
    const start = new Date(); start.setHours(7,0,0,0);
    const dt = (d)=> `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`;
    const end = new Date(start); end.setDate(start.getDate()+30);
    const ics = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//JLY//30 Day Plan//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@jly-plan`,`DTSTAMP:${dt(start)}`,`DTSTART:${dt(start)}`,
      'DURATION:PT10M','RRULE:FREQ=DAILY;COUNT=30',
      'SUMMARY:30-Day Starter Plan — Devotional',
      'DESCRIPTION:Follow the 30-day plan in the site (John, Philippians, 1 John).',
      'END:VEVENT','END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], {type:'text/calendar;charset=utf-8'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = '30-day-plan.ics'; a.click(); URL.revokeObjectURL(url);
  });

  // FAQ quick actions
  on($('#askPrayer'), 'click', ()=>{
    // Jump to contact section
    const contact = $('#contact');
    if (contact){
      const headerH = document.querySelector('header')?.offsetHeight || 0;
      const top = contact.getBoundingClientRect().top + window.pageYOffset - (headerH + 8);
      window.scrollTo({ top, behavior:'smooth' });
    } else {
      alert('Please use the questionnaire form in the Contact section to send a prayer request.');
    }
  });
  on($('#findBaptism'), 'click', ()=>{
    // Open search for baptism near me
    window.open('https://www.google.com/maps/search/church+baptism+near+me','_blank','noopener');
  });

  // Memory verses carousel
  const MEMS = [
    {ref:'John 3:16', text:'For God so loved the world that he gave his only Son...'},
    {ref:'John 14:6', text:'Jesus said, “I am the way, and the truth, and the life...”'},
    {ref:'Romans 10:9', text:'If you confess with your mouth that Jesus is Lord and believe in your heart...'},
    {ref:'Ephesians 2:8–9', text:'By grace you have been saved through faith... not a result of works.'},
    {ref:'Romans 8:1', text:'There is therefore now no condemnation for those who are in Christ Jesus.'},
    {ref:'Philippians 4:6–7', text:'Do not be anxious about anything, but in everything by prayer...'}
  ];
  const MEM_SAVE_KEY = 'jly:mem:saved';
  let memIdx = 0;
  function renderMem(){
    $('#memRef').textContent = MEMS[memIdx].ref;
    $('#memText').textContent = MEMS[memIdx].text;
  }
  function nextMem(){ memIdx = (memIdx + 1) % MEMS.length; renderMem(); }
  function prevMem(){ memIdx = (memIdx - 1 + MEMS.length) % MEMS.length; renderMem(); }
  on($('#memCard'), 'click', nextMem);
  on($('#memCard'), 'keydown', (e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextMem(); } });
  on($('#nextMem'), 'click', nextMem);
  on($('#prevMem'), 'click', prevMem);
  on($('#saveMem'), 'click', ()=>{
    const saved = JSON.parse(localStorage.getItem(MEM_SAVE_KEY) || '[]');
    const curr = MEMS[memIdx];
    if (!saved.find(v => v.ref === curr.ref)){
      saved.push(curr);
      localStorage.setItem(MEM_SAVE_KEY, JSON.stringify(saved));
      alert(`Saved: ${curr.ref}`);
    } else {
      alert('Already saved.');
    }
  });
  renderMem();
})();

// ---------- PWA install prompt ----------
(function initPWAInstall(){
  let deferredPrompt = null;
  const btn = $('#installBtn');
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    if (btn) btn.style.display = 'inline-flex';
  });
  on(btn, 'click', async ()=>{
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch {}
    deferredPrompt = null;
    if (btn) btn.style.display = 'none';
  });
})();

// ---------- Service Worker ----------
(function registerSW(){
  if (!('serviceWorker' in navigator)) return;
  const sw = `
self.addEventListener('install', event => {
  event.waitUntil(caches.open('jly-v1').then(c => c.addAll(['./'])));
});
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(r => r || caches.match('./'))));
});
  `.trim();
  const blob = new Blob([sw], {type:'text/javascript'}); const url  = URL.createObjectURL(blob);
  navigator.serviceWorker.register(url).catch(()=>{});
})();
