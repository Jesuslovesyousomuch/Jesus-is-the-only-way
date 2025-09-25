/* ============================================
   Jesus Loves You — script.js
   All interactive features consolidated.
   - Theme & font
   - Nav (mobile + active section)
   - Back to top
   - Online/offline banner
   - Verse of the day (OurManna)
   - Verse actions (copy/share/speak/image/fullscreen/open)
   - Lookup modal (WEB API / iframe fallback)
   - Tools: Timer, Streak, Reminder (.ics), Share & QR
   - Story Finder + Story of the Day
   - Journal (local)
   - Start Here wizard bits (plan, memory verses, checklist)
   - Find church/baptism
   - Settings (compact, contrast, language, section visibility)
   - Collapsible sections
   - Materials preview (lazy iframe modal)
   - PWA minimal SW
   ============================================ */

/* ------------------ Helpers ------------------ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
const storage = {
  get(k, d = null) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/* ------------------ Manifest (PWA) ------------------ */
(function initManifest(){
  const manifest = {
    name: "Jesus Loves You",
    short_name: "JLY",
    start_url: ".",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#002244",
    icons: [
      { src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12' fill='%230b2c5a'/><path d='M30 10h4v16h16v4H34v24h-4V30H14v-4h16z' fill='%23fff'/></svg>", sizes: "any", type: "image/svg+xml" }
    ]
  };
  const blob = new Blob([JSON.stringify(manifest)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('link');
  link.rel='manifest'; link.href=url; document.head.appendChild(link);
})();

/* ------------------ Theme & Font ------------------ */
(function initThemeAndFont(){
  const root = document.documentElement;
  const themeMeta = $('meta[name="theme-color"]');
  const applyThemeMeta = () => {
    const isDark = root.getAttribute('data-theme') === 'dark' || (window.matchMedia('(prefers-color-scheme: dark)').matches && !root.getAttribute('data-theme'));
    themeMeta && themeMeta.setAttribute('content', isDark ? '#0b1220' : '#002244');
  };

  // theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) root.setAttribute('data-theme', savedTheme);
  applyThemeMeta();

  on($('#themeToggle'), 'click', ()=>{
    const isDark = root.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    applyThemeMeta();
  });

  // font scale
  let fontScale = parseInt(localStorage.getItem('fontScale') || '100', 10);
  const applyScale = () => { document.documentElement.style.fontSize = (clamp(fontScale, 85, 130)/100*16)+'px'; };
  applyScale();
  on($('#fontMinus'), 'click', ()=>{ fontScale = clamp(fontScale-5, 85, 130); localStorage.setItem('fontScale',fontScale); applyScale(); });
  on($('#fontPlus'), 'click', ()=>{ fontScale = clamp(fontScale+5, 85, 130); localStorage.setItem('fontScale',fontScale); applyScale(); });

  // hotkeys
  on(window, 'keydown', (e)=>{
    if(e.key==='d' || e.key==='D'){ $('#themeToggle')?.click(); }
    if(e.key==='+' || e.key==='='){ $('#fontPlus')?.click(); }
    if(e.key==='-'){ $('#fontMinus')?.click(); }
  });
})();

/* ------------------ Nav: mobile toggle & compact hover ------------------ */
on($('#menuToggle'), 'click', () => $('#mainNav')?.classList.toggle('open'));
(function initCompactNav(){
  const nav = $('#mainNav');
  if (!nav) return;
  nav.classList.add('compact'); // desktop hover-to-expand
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

/* Smooth scroll offset for header */
$$('a[href^="#"]').forEach(a => {
  on(a, 'click', e => {
    const id = a.getAttribute('href');
    if (!id || id.length <= 1) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    const headerH = $('header').offsetHeight;
    const top = el.getBoundingClientRect().top + window.pageYOffset - (headerH + 8);
    window.scrollTo({ top, behavior: 'smooth' });
    const nav = $('#mainNav');
    if (nav?.classList.contains('open')) nav.classList.remove('open');
  });
});

/* Active nav on scroll */
(function setActiveOnScroll(){
  const links = $$('#mainNav a[href^="#"]');
  const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
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

/* ------------------ Back to top ------------------ */
const backTop = $('#backTop');
on(window, 'scroll', () => {
  (window.scrollY > 600) ? backTop?.classList.add('show') : backTop?.classList.remove('show');
});
on(backTop, 'click', () => window.scrollTo({ top:0, behavior:'smooth' }));

/* ------------------ Online/offline banner ------------------ */
const offlineBanner = $('#offlineBanner');
function updateOnline(){ offlineBanner?.classList.toggle('show', !navigator.onLine); }
on(window, 'online', updateOnline);
on(window, 'offline', updateOnline);
updateOnline();

/* ------------------ Daily Verse (OurManna) ------------------ */
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

/* Copy */
on($('#btnCopyVerse'), 'click', async ()=>{
  const v=currentVerse(); const payload=`${v.text} — ${v.ref}`;
  try{ await navigator.clipboard.writeText(payload); alert('Verse copied to clipboard.'); }
  catch{
    const ta=document.createElement('textarea'); ta.value=payload; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta); alert('Verse copied to clipboard.');
  }
});

/* Share */
on($('#btnShareVerse'), 'click', async ()=>{
  const v=currentVerse(); const text=`${v.text} — ${v.ref}`;
  if (navigator.share) { try { await navigator.share({ title: v.ref || 'Daily Verse', text }); } catch {} }
  else {
    const url = location.href;
    const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tw,'_blank','noopener');
  }
});

/* Read aloud */
on($('#btnSpeakVerse'), 'click', ()=>{
  const v=currentVerse(); const u=new SpeechSynthesisUtterance(`${v.text}. ${v.ref}`); u.lang='en-US'; speechSynthesis.cancel(); speechSynthesis.speak(u);
});

/* ------------------ Robust canvas text & export ------------------ */
/* Wait for Inter font to be ready before measuring/drawing */
async function ensureInterLoaded(){
  try{
    if (document.fonts && document.fonts.ready) {
      // Nudge the browser by requesting the weights we use.
      await Promise.allSettled([
        document.fonts.load('bold 44px "Inter"'),
        document.fonts.load('bold 36px "Inter"'),
        document.fonts.load('600 20px "Inter"'),
        document.fonts.ready
      ]);
    }
  }catch{}
}

/* Wrap text to lines within width using current ctx.font */
function wrapLines(ctx, text, maxWidth){
  const words = (text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (let i=0;i<words.length;i++){
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = words[i];
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* Fit text by reducing font size until it fits both width and maxLines/height */
function fitAndDrawText(ctx, text, x, y, maxWidth, maxHeight, opts){
  const { fontFamily='Inter, system-ui, sans-serif', weight='bold', maxPx=44, minPx=22, lineGap=1.35, align='left' } = opts || {};
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  let size = maxPx;
  let lines, lineHeight;

  while (size >= minPx) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    lines = wrapLines(ctx, text, maxWidth);
    lineHeight = size * lineGap;
    const totalH = lines.length * lineHeight;
    if (totalH <= maxHeight) break;
    size -= 2;
  }

  // If still too tall, hard-wrap by truncating and adding ellipsis
  if (size < minPx) {
    size = minPx;
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    lines = wrapLines(ctx, text, maxWidth);
    lineHeight = size * lineGap;
    const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
    if (lines.length > maxLines){
      const clipped = lines.slice(0, maxLines);
      // add ellipsis to last line if clipped
      let last = clipped.pop() || '';
      while (ctx.measureText(last + '…').width > maxWidth && last.length > 3){
        last = last.slice(0, -2);
      }
      clipped.push(last + '…');
      lines = clipped;
    }
  }

  // Draw
  let yy = y;
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#ffffff';
  for (const ln of lines){
    ctx.fillText(ln, x, yy);
    yy += lineHeight;
  }
  ctx.shadowBlur = 0;

  return yy; // returns next y
}

async function drawVerseToCanvas() {
  await ensureInterLoaded(); // critical: ensure font metrics are stable

  const { text, ref } = currentVerse();
  const canvas = $('#verseCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0b264c'); grad.addColorStop(1, '#08152a');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  // soft circles
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i=0;i<6;i++){ ctx.beginPath(); ctx.arc(80 + i*180, 120 + (i%2)*60, 60, 0, Math.PI*2); ctx.fill(); }

  // Title
  ctx.fillStyle = '#9fd1ff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 36px Inter, system-ui, sans-serif';
  ctx.fillText('Daily Bible Verse', 60, 80);

  // Verse (autoscale + wrap inside padding box)
  const PAD = 60;
  const innerW = W - PAD*2;
  const verseTop = 120;
  const verseBoxH = H - verseTop - 140; // leave space for ref + footer

  const nextY = fitAndDrawText(
    ctx,
    text || '',
    PAD, verseTop,
    innerW, verseBoxH,
    { fontFamily:'Inter, system-ui, sans-serif', weight:'bold', maxPx:44, minPx:24, lineGap:1.35, align:'left' }
  ) + 20;

  // Reference
  ctx.fillStyle = '#9fd1ff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 32px Inter, system-ui, sans-serif';
  ctx.fillText(ref || '', PAD, nextY);

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '600 20px Inter, system-ui, sans-serif';
  const footer = 'jesuslovesyousomuch.github.io/Jesus-is-the-only-way';
  ctx.fillText(footer, PAD, H - 40);
}

on($('#btnImageVerse'), 'click', async () => {
  await drawVerseToCanvas();
  const canvas = $('#verseCanvas');
  const link = document.createElement('a');
  const safeRef = (currentVerse().ref || 'verse').replace(/[^a-z0-9\-_. ]/gi,'_').slice(0,60);
  link.download = `${safeRef}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

/* Open passage / fullscreen */
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

/* ------------------ Lookup & Story popup logic ------------------ */
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
  setTimeout(()=>{ try{ void frame.contentWindow.document.title; } catch(e){ fb.style.display=''; } }, 1200);
}
async function openPassageTextModal(ref){
  const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=web`;
  try{
    const r = await fetch(url, {cache:'no-store'}); const j = await r.json();
    const verses = (j.verses || []).map(v => `${v.text.trim()} (${v.book_name} ${v.chapter}:${v.verse})`).join('\n');
    const text = j.text ? j.text : verses || 'Passage not found.';
    const reference = j.reference || ref;
    showLookupText(reference, text);
  }catch{
    showLookupIframe(`https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=ESV`);
  }
}
function openKeywordModal(query){
  const url = `https://www.biblegateway.com/quicksearch/?quicksearch=${encodeURIComponent(query)}&version=ESV`;
  showLookupIframe(url);
}
on($('#verseLookupForm'), 'submit', (e)=>{
  e.preventDefault();
  const q = ($('#verseLookupInput').value || '').trim();
  if (!q) return;
  const ref = parseBibleRef(q);
  if (ref){ openPassageTextModal(`${ref.book} ${ref.chap}${ref.verse ? ':'+ref.verse : ''}`); }
  else { openKeywordModal(q); }
});

/* ------------------ Story Finder & Story of the Day ------------------ */
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
function pickDailyStory(){
  const d = new Date(); const ymd = Number(d.toISOString().slice(0,10).replace(/-/g,'')); return STORY_REFS[ymd % STORY_REFS.length];
}
function renderSOD(story){
  $('#sodLabel').textContent = story.label;
  $('#openSOD').onclick = ()=> openPassageTextModal(story.ref);
}
document.addEventListener('DOMContentLoaded', ()=>{ renderSOD(pickDailyStory()); });
on($('#reloadSOD'), 'click', ()=>{
  const s = STORY_REFS[Math.floor(Math.random()*STORY_REFS.length)]; renderSOD(s);
});

/* ------------------ Prayer Streak ------------------ */
const STREAK_KEY = 'jly:streakDates';
function todayKey(){ const d=new Date(); return d.toISOString().slice(0,10); }
function calcStreak(dates){
  const set = new Set(dates); let curr = 0; let day = new Date();
  for(;;){ const key = day.toISOString().slice(0,10); if (set.has(key)){ curr++; day.setDate(day.getDate()-1); } else break; }
  const sorted = [...dates].sort(); let longest = 0, run = 0, prev = null;
  for(const k of sorted){ if (!prev){ run=1; } else { const d1 = new Date(prev), d2 = new Date(k); const diff = (d2 - d1) / 86400000; run = (diff === 1) ? run + 1 : 1; } longest = Math.max(longest, run); prev = k; }
  return { curr, longest };
}
function renderStreak(){
  const dates = storage.get(STREAK_KEY, []);
  const { curr, longest } = calcStreak(dates);
  $('#streakCurrent').textContent = curr;
  $('#streakLongest').textContent = longest;
}
renderStreak();
on($('#markToday'), 'click', ()=>{
  const dates = storage.get(STREAK_KEY, []); const t = todayKey();
  if (!dates.includes(t)){ dates.push(t); storage.set(STREAK_KEY, dates); renderStreak(); }
});
on($('#undoToday'), 'click', ()=>{
  const dates = storage.get(STREAK_KEY, []); const t = todayKey(); const idx = dates.indexOf(t);
  if (idx>-1){ dates.splice(idx,1); storage.set(STREAK_KEY, dates); renderStreak(); }
});

/* ------------------ Devotional Timer ------------------ */
(function initTimer(){
  const display = $('#timerDisplay');
  const startBtn = $('#timerStart');
  const pauseBtn = $('#timerPause');
  const resetBtn = $('#timerReset');
  const pills = $$('#timerCard .timer-pills button');

  const state = { base: 15*60, remaining: 15*60, running:false, endAt:null, id:null };

  const fmt = (sec) => {
    sec = Math.max(0, Math.ceil(sec));
    const m = Math.floor(sec/60), s = sec%60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  const render = ()=> { display.textContent = fmt(state.remaining); };

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
  on(startBtn,'click', start);
  on(pauseBtn,'click', pause);
  on(resetBtn,'click', reset);

  setBase(15);
})();

/* ------------------ Calendar (.ics) quick reminder ------------------ */
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

/* ------------------ Share & QR ------------------ */
on($('#shareSite'), 'click', async ()=>{
  const url = location.href; const title = 'Jesus Loves You'; const text  = 'Be encouraged. Read the daily Bible verse here.';
  if (navigator.share){ try{ await navigator.share({ title, text, url }); } catch {} }
  else { try{ await navigator.clipboard.writeText(url); alert('Link copied to clipboard.'); }
  catch{ open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,'_blank','noopener'); } }
});
on($('#openQR'), 'click', ()=>{
  const url = location.href; const img = document.createElement('img'); img.alt = 'QR code'; img.width = 240; img.height = 240;
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;
  const box = $('#qrcode'); box.innerHTML = ''; box.appendChild(img);
  try{ new bootstrap.Modal($('#qrModal')).show(); }catch{ alert('QR code ready. If the modal did not open, please allow popups.'); }
});

/* ------------------ Find church / baptism ------------------ */
on($('#findChurch'), 'click', ()=>{
  if (navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      pos => { const { latitude, longitude } = pos.coords; const url = `https://www.google.com/maps/search/church/@${latitude},${longitude},14z`; window.open(url, '_blank', 'noopener'); },
      () => window.open('https://www.google.com/maps/search/church+near+me', '_blank', 'noopener'),
      { timeout: 6000 }
    );
  } else { window.open('https://www.google.com/maps/search/church+near+me', '_blank', 'noopener'); }
});
on($('#findBaptism'), 'click', ()=>{
  if (navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      pos => { const { latitude, longitude } = pos.coords; const url = `https://www.google.com/maps/search/baptism/@${latitude},${longitude},14z`; window.open(url, '_blank', 'noopener'); },
      () => window.open('https://www.google.com/maps/search/baptism+near+me', '_blank', 'noopener'),
      { timeout: 6000 }
    );
  } else { window.open('https://www.google.com/maps/search/baptism+near+me', '_blank', 'noopener'); }
});
on($('#askPrayer'), 'click', ()=>{
  // Update to your preferred endpoint
  window.open('mailto:?subject=Prayer%20Request&body=Please%20pray%20for%3A%20', '_self');
});

/* ------------------ Journal (local) ------------------ */
const J_KEY = 'jly:journal';
function renderJournal(){
  const list = $('#journalList');
  if (!list) return;
  const items = storage.get(J_KEY, []);
  if (!items.length){ list.innerHTML = `<p class="muted">No entries yet.</p>`; return; }
  list.innerHTML = items.slice().reverse().map((it) => `
    <div class="mb-2 p-2" style="border:1px dashed rgba(255,255,255,.2); border-radius:8px;">
      <div style="font-weight:800">${new Date(it.at).toLocaleString()}</div>
      <div style="white-space:pre-wrap">${(it.text||'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</div>
    </div>
  `).join('');
}
renderJournal();
on($('#saveJournal'), 'click', ()=>{
  const ta = $('#journalText'); const text = (ta.value || '').trim(); if (!text) return;
  const items = storage.get(J_KEY, []); items.push({ text, at: Date.now() });
  storage.set(J_KEY, items); ta.value=''; renderJournal();
});
on($('#exportJournal'), 'click', ()=>{
  const items = storage.get(J_KEY, []);
  const txt = items.map(i => `[${new Date(i.at).toLocaleString()}]\n${i.text}\n\n`).join('') || 'No entries yet.';
  const blob = new Blob([txt], {type:'text/plain'}); const url  = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'journal.txt'; a.click(); URL.revokeObjectURL(url);
});
on($('#clearJournal'), 'click', ()=>{
  if (confirm('Delete ALL journal entries? This cannot be undone.')){ storage.set(J_KEY, []); renderJournal(); }
});

/* ------------------ Start Here: Plan ------------------ */
on($('#dlPlan'), 'click', ()=>{
  const lines = [
    'First 30 Days Plan',
    'Days 1–7: John 1–7',
    'Days 8–14: John 8–14',
    'Days 15–21: John 15–21',
    'Days 22–30: Philippians + 1 John',
  ].join('\n');
  const blob = new Blob([lines], {type:'text/plain'}); const url  = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'first-30-days.txt'; a.click(); URL.revokeObjectURL(url);
});
on($('#addPlanICS'), 'click', ()=>{
  const start = new Date(); start.setHours(7,0,0,0);
  const pad2 = (n)=>String(n).padStart(2,'0');
  const dt = `${start.getFullYear()}${pad2(start.getMonth()+1)}${pad2(start.getDate())}T070000`;
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//JLY//30-Day Plan//EN',
    'BEGIN:VEVENT',`UID:${Date.now()}@jly`,`DTSTAMP:${dt}`,`DTSTART:${dt}`,
    'DURATION:PT15M','RRULE:FREQ=DAILY;COUNT=30','SUMMARY:30-Day Bible Plan',
    'DESCRIPTION:Read John, Philippians, and 1 John per plan.','END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], {type:'text/calendar;charset=utf-8'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = '30-day-plan.ics'; a.click(); URL.revokeObjectURL(url);
});

/* ------------------ Start Here: Gospel verses toggle & Pray ------------------ */
$$('[data-open]').forEach(btn=>{
  on(btn, 'click', ()=>{
    const sel = btn.getAttribute('data-open');
    const target = $(sel);
    if (!target) return;
    const vis = target.hasAttribute('hidden');
    if (vis) target.removeAttribute('hidden'); else target.setAttribute('hidden','');
  });
});
on($('#prayNow'), 'click', ()=>{
  const prayer = [
    'Lord Jesus, I confess that I am a sinner and I need You.',
    'I believe You died and rose again for my sins.',
    'I receive You as my Lord and Savior.',
    'Help me follow You from this day forward. Amen.'
  ].join('\n');
  alert(prayer);
  // also check the checklist item if present
  const cb = $('#nbChecklist input[data-key="prayed"]'); if (cb){ cb.checked = true; saveChecklist(); }
});

/* ------------------ Start Here: Memory Verses ------------------ */
const MEMS = [
  {ref:'John 3:16', text:'For God so loved the world that He gave His one and only Son…'},
  {ref:'Romans 10:9', text:'If you confess with your mouth that Jesus is Lord and believe in your heart that God raised Him from the dead, you will be saved.'},
  {ref:'Ephesians 2:8–9', text:'For by grace you have been saved through faith… it is the gift of God, not a result of works.'},
  {ref:'1 John 1:9', text:'If we confess our sins, He is faithful and just to forgive us…'},
  {ref:'Proverbs 3:5–6', text:'Trust in the Lord with all your heart… He will make straight your paths.'},
];
let memIdx = storage.get('jly:memIdx', 0) % MEMS.length;
function renderMem(){ const v=MEMS[memIdx]; $('#memRef').textContent=v.ref; $('#memText').textContent=v.text; storage.set('jly:memIdx', memIdx); }
renderMem();
on($('#memCard'), 'click', ()=>{ memIdx=(memIdx+1)%MEMS.length; renderMem(); });
on($('#nextMem'), 'click', ()=>{ memIdx=(memIdx+1)%MEMS.length; renderMem(); });
on($('#prevMem'), 'click', ()=>{ memIdx=(memIdx-1+MEMS.length)%MEMS.length; renderMem(); });
on($('#saveMem'), 'click', ()=>{
  const saved = storage.get('jly:memSaved', []);
  const v = MEMS[memIdx];
  if (!saved.find(s=>s.ref===v.ref)){
    saved.push(v); storage.set('jly:memSaved', saved);
    alert(`Saved: ${v.ref}`);
  } else { alert('Already saved.'); }
});

/* ------------------ Start Here: Checklist ------------------ */
const NB_KEY = 'jly:newBelieverChecklist';
function loadChecklist(){
  const state = storage.get(NB_KEY, {});
  $$('#nbChecklist input[type="checkbox"]').forEach(cb=>{
    const key = cb.getAttribute('data-key');
    if (key in state) cb.checked = !!state[key];
  });
}
function saveChecklist(){
  const state = {};
  $$('#nbChecklist input[type="checkbox"]').forEach(cb=>{
    const key = cb.getAttribute('data-key');
    state[key] = cb.checked;
  });
  storage.set(NB_KEY, state);
}
loadChecklist();
$$('#nbChecklist input[type="checkbox"]').forEach(cb=> on(cb,'change', saveChecklist));
on($('#resetNB'), 'click', ()=>{ storage.set(NB_KEY, {}); loadChecklist(); });

/* ------------------ Collapsible Sections (remember state) ------------------ */
$$('button[data-collapse]').forEach(btn=>{
  const targetSel = btn.getAttribute('data-collapse');
  const target = $(targetSel);
  const key = `jly:collapse:${targetSel}`;
  const wasCollapsed = storage.get(key, false);
  if (wasCollapsed){ target.setAttribute('hidden',''); btn.classList.add('collapsed'); btn.innerHTML = '<i class="fa-solid fa-plus"></i>'; }
  else { btn.innerHTML = '<i class="fa-solid fa-minus"></i>'; }

  on(btn,'click', ()=>{
    const hidden = target.hasAttribute('hidden');
    if (hidden){ target.removeAttribute('hidden'); btn.classList.remove('collapsed'); btn.innerHTML = '<i class="fa-solid fa-minus"></i>'; storage.set(key,false); }
    else { target.setAttribute('hidden',''); btn.classList.add('collapsed'); btn.innerHTML = '<i class="fa-solid fa-plus"></i>'; storage.set(key,true); }
  });
});

/* ------------------ Settings Modal ------------------ */
const PREFS_KEY = 'jly:prefs';
const defaultPrefs = { compact:false, contrast:false, lang:'en', sections:{ start:true, bibles:true, devos:true, tools:true, journal:true, materials:true } };
function getPrefs(){ return Object.assign({}, defaultPrefs, storage.get(PREFS_KEY, {})); }
function applyPrefs(p){
  document.body.classList.toggle('compact', !!p.compact);
  document.body.classList.toggle('hc', !!p.contrast);
  document.body.classList.toggle('lang-tl', p.lang==='tl');
  document.body.classList.toggle('lang-en', p.lang!=='tl');

  // Sections
  const map = {
    start: $('#start-here')?.closest('section') || $('#start-here'),
    bibles: $('#bibles'),
    devos: $('#devotionals'),
    tools: $('#tools'),
    journal: $('#journal'),
    materials: $('#tiktok-live')
  };
  Object.entries(map).forEach(([k, el])=>{
    if (!el) return;
    if (p.sections[k]) el.removeAttribute('hidden');
    else el.setAttribute('hidden','');
  });
}
function loadPrefsToUI(p){
  $('#prefCompact').checked = !!p.compact;
  $('#prefContrast').checked = !!p.contrast;
  $('#prefLang').value = p.lang || 'en';
  $('#secStartHere').checked = !!p.sections.start;
  $('#secBibles').checked = !!p.sections.bibles;
  $('#secDevos').checked = !!p.sections.devos;
  $('#secTools').checked = !!p.sections.tools;
  $('#secJournal').checked = !!p.sections.journal;
  $('#secMaterials').checked = !!p.sections.materials;
}
function readPrefsFromUI(){
  return {
    compact: $('#prefCompact').checked,
    contrast: $('#prefContrast').checked,
    lang: $('#prefLang').value || 'en',
    sections: {
      start: $('#secStartHere').checked,
      bibles: $('#secBibles').checked,
      devos: $('#secDevos').checked,
      tools: $('#secTools').checked,
      journal: $('#secJournal').checked,
      materials: $('#secMaterials').checked,
    }
  };
}
function openSettings(){
  const prefs = getPrefs();
  loadPrefsToUI(prefs);
  applyPrefs(prefs);
  new bootstrap.Modal($('#settingsModal')).show();
}
on($('#settingsBtn'),'click', openSettings);
on($('#bottomSettings'),'click', openSettings);
['prefCompact','prefContrast','prefLang','secStartHere','secBibles','secDevos','secTools','secJournal','secMaterials'].forEach(id=>{
  on($('#'+id),'change', ()=>{
    const p = readPrefsFromUI();
    storage.set(PREFS_KEY, p);
    applyPrefs(p);
  });
});
on($('#prefsReset'), 'click', ()=>{
  storage.set(PREFS_KEY, defaultPrefs);
  loadPrefsToUI(defaultPrefs);
  applyPrefs(defaultPrefs);
});
applyPrefs(getPrefs()); // apply on load

/* ------------------ Materials Preview (lazy iframe) ------------------ */
on($('#previewDrive'), 'click', (e)=>{
  const src = e.currentTarget.getAttribute('data-embed-src');
  const frame = $('#embedFrame');
  const skeleton = $('#embedSkeleton');
  frame.style.display = 'none';
  skeleton.style.display = '';
  frame.src = src;
  const modal = new bootstrap.Modal($('#embedModal'));
  modal.show();
  frame.onload = ()=>{ skeleton.style.display='none'; frame.style.display='block'; };
});
on($('#embedClose'), 'click', ()=>{
  const frame = $('#embedFrame'); if (frame){ frame.src='about:blank'; }
});

/* ------------------ Sticky Bottom Bar: Settings handled above ------------------ */

/* ------------------ Service Worker (very minimal) ------------------ */
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
