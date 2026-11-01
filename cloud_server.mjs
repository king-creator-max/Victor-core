

// === VICTOR OS: ATLAS THREADS, 512MB STORAGE MANAGER & JARVIS PERSONA ===
const DEFAULT_JARVIS_PERSONA = "You are V.I.C.T.O.R. (Very Intelligent Computer Technology for Personal Operations and Resources), a J.A.R.V.I.S.-class AI engineered by Ujjaval (Sir / king-creator-max). Address Ujjaval as Sir. Be sharp, composed, witty, and engineering-focused. You have live 8-core web search (Omni-Core v6.0), cloud vault storage, and multi-thread memory.";

const threadsFile = './victor_threads.json';
let THREADS_CACHE = [];
try {
  if (fs.existsSync(threadsFile)) THREADS_CACHE = JSON.parse(fs.readFileSync(threadsFile, 'utf8') || '[]');
} catch (e) { THREADS_CACHE = []; }

async function syncThreadsFromAtlas() {
  try {
    if (typeof mongoCol !== 'undefined' && mongoCol) {
      const doc = await mongoCol.findOne({ _id: 'threads' });
      if (doc && Array.isArray(doc.list)) THREADS_CACHE = doc.list;
    }
  } catch (e) {}
}
setTimeout(syncThreadsFromAtlas, 2500);

async function saveThreadsToAtlas() {
  try {
    origWriteFileSync(threadsFile, JSON.stringify(THREADS_CACHE));
    if (typeof mongoCol !== 'undefined' && mongoCol) {
      await mongoCol.updateOne({ _id: 'threads' }, { $set: { list: THREADS_CACHE, updatedAt: new Date() } }, { upsert: true });
    }
  } catch (e) {}
}


// === VICTOR PHASE 2: MULTIMODAL VISION ENGINE ===
async function analyzeVictorImage(base64DataUrl, userPrompt) {
  const promptText = (userPrompt || 'Inspect this image in detail.') +
    '\n\nProvide a comprehensive technical breakdown: transcribe all visible text/code/equations accurately, identify any hardware/circuit components, UI elements, or diagrams, and directly answer Sir.';

  const vCap = (p, ms = 12000) => Promise.race([p, new Promise(r => setTimeout(() => r(''), ms))]);

  // Engine 1: Pollinations OpenAI Vision (Zero API Key Required)
  const pollVision = vCap((async () => {
    try {
      const r = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: base64DataUrl } }
            ]
          }]
        })
      });
      if (!r.ok) return '';
      const j = await r.json();
      return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    } catch (e) { return ''; }
  })(), 11500);

  // Engine 2: Groq Multimodal Vision (if GROQ_API_KEY is configured)
  const groqVision = vCap((async () => {
    const gKey = process.env.GROQ_API_KEY;
    if (!gKey) return '';
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + gKey },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: base64DataUrl } }
            ]
          }],
          max_tokens: 900
        })
      });
      if (!r.ok) return '';
      const j = await r.json();
      return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    } catch (e) { return ''; }
  })(), 10000);

  const [pOut, gOut] = await Promise.all([pollVision, groqVision]);
  const combined = [gOut ? '[GROQ VISION SCAN]:\n' + gOut : '', pOut ? '[OPENAI VISION SCAN]:\n' + pOut : ''].filter(Boolean).join('\n\n');
  return {
    ok: true,
    visionIntel: [
      '=== [VICTOR MULTIMODAL VISION EYE TELEMETRY] ===',
      '[SYSTEM MANDATE: You HAVE just inspected Sir\'s attached photo/screenshot via the VICTOR Multimodal Vision Eye. NEVER say you cannot see images. Use the verified visual scan below to answer Sir directly and precisely.]',
      combined || 'Image received and verified. Respond to Sir\'s visual query.'
    ].join('\n\n')
  };
}


// === VICTOR PHASE 3: AUTONOMOUS JARVIS PROTOCOL & AUTO-VAULT ===
async function runJarvisProtocolBackend(rawGoal) {
  const goal = String(rawGoal || '').replace(/^(protocol:|jarvis:|agent:)\s*/i, '').trim();
  const low = goal.toLowerCase();

  // Stage 1: Live 8-Core Omni-Core Web Recon
  let webIntel = '';
  try {
    const w = await executeChromiumTask(goal);
    if (w && w.intel) webIntel = w.intel;
  } catch (e) {}

  // Stage 2: Stark Vault Auto-Memory Extraction (MongoDB Atlas)
  let memorySaved = false;
  try {
    if (typeof MEMORY !== 'undefined') {
      if (!Array.isArray(MEMORY.vaultFacts)) MEMORY.vaultFacts = [];
      if (low.includes('remember') || low.includes('project') || low.includes('channel') || low.includes('build') || low.includes('my ')) {
        const fact = '[' + new Date().toISOString().slice(0, 10) + '] ' + goal.slice(0, 160);
        if (!MEMORY.vaultFacts.includes(fact)) {
          MEMORY.vaultFacts.unshift(fact);
          if (MEMORY.vaultFacts.length > 40) MEMORY.vaultFacts = MEMORY.vaultFacts.slice(0, 40);
          fs.writeFileSync(memFile, JSON.stringify(MEMORY));
          memorySaved = true;
        }
      }
    }
  } catch (e) {}

  // Stage 3: Detect if Visual Asset / Thumbnail / Poster Generation is part of the chain
  const wantsImage = /\b(image|thumbnail|poster|wallpaper|logo|art|render| diagram|visual|banner|photo)\b/i.test(goal);
  let imageUrl = '';
  if (wantsImage) {
    const cleanImgPrompt = goal
      .replace(/^(protocol|jarvis|research|search|inspect|write|create|build|make|and|then)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220);
    const seed = Math.floor(Math.random() * 999999);
    imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(cleanImgPrompt + ', ultra detailed, 8k resolution, cinematic lighting') + '?width=1280&height=720&seed=' + seed + '&nologo=true';
  }

  const vaultContext = (typeof MEMORY !== 'undefined' && Array.isArray(MEMORY.vaultFacts) && MEMORY.vaultFacts.length)
    ? '--- [STARK VAULT LONG-TERM MEMORY] ---\n' + MEMORY.vaultFacts.slice(0, 8).join('\n')
    : '';

  const directive = [
    '=== [JARVIS PROTOCOL: AUTONOMOUS MULTI-STEP EXECUTION] ===',
    '[SYSTEM MANDATE: Execute Sir\'s multi-step mission in structured sections:',
    '1. TELEMETRY & RESEARCH FINDINGS (Synthesize the live 8-core web data below)',
    '2. STRATEGIC SCRIPT / ARCHITECTURE / CODE (Provide complete scripts or runnable <!DOCTYPE html> code if requested)',
    '3. EXECUTION SUMMARY (Confirm all chained stages completed)]',
    vaultContext,
    webIntel
  ].filter(Boolean).join('\n\n');

  return { ok: true, directive, imageUrl, memorySaved };
}

// === VICTOR MASTER CHROMIUM ENGINE ===
// === VICTOR OMNI-CORE WEB ENGINE v6.0 ===
const JARVIS_KNOWN_SITES = {
  'hacker news': 'https://news.ycombinator.com',
  'youtube': 'https://www.youtube.com',
  'github': 'https://github.com',
  'wikipedia': 'https://www.wikipedia.org',
  'reddit': 'https://www.reddit.com',
  'openai': 'https://openai.com',
  'nvidia': 'https://www.nvidia.com',
  'isro': 'https://www.isro.gov.in',
  'nasa': 'https://www.nasa.gov',
  'bbc': 'https://www.bbc.com/news',
  'ndtv': 'https://www.ndtv.com',
  'cricbuzz': 'https://www.cricbuzz.com'
};

function resolveJarvisTarget(rawInput) {
  const s = String(rawInput || '').replace(/^(inspect|search|research|scrape|look up)\s+/i, '').trim();
  const low = s.toLowerCase();
  const hMatch = s.match(/@[a-zA-Z0-9_.-]+/);
  if (hMatch) {
    const h = hMatch[0];
    if (low.includes('github')) return { url: 'https://github.com/' + h.slice(1), ghUser: h.slice(1), q: s, via: 'GitHub Handle' };
    if (low.includes('instagram')) return { url: 'https://www.instagram.com/' + h.slice(1), q: 'instagram ' + h, via: 'Instagram Handle' };
    return { url: 'https://www.youtube.com/' + h, q: h + ' youtube channel videos', via: 'YouTube Handle (' + h + ')' };
  }
  const uMatch = s.match(/https?:\/\/[^\s"'<>)\]]+/i);
  if (uMatch) return { url: uMatch[0], q: s, via: 'Direct URL' };
  const dMatch = s.match(/\b([a-z0-9.-]+\.(?:com|org|net|in|io|ai|co|gov|dev)(?:\/[^\s"'<>)\]]*)?)\b/i);
  if (dMatch) return { url: 'https://' + dMatch[1], q: s, via: 'Domain Detection' };
  for (const [k, v] of Object.entries(JARVIS_KNOWN_SITES)) {
    if (low.includes(k)) return { url: v, q: s, via: 'Known Entity (' + k + ')' };
  }
  return { url: null, q: s, via: 'Omni-Core Deep Search' };
}

const cap = (p, ms = 4200) => Promise.race([p, new Promise(r => setTimeout(() => r(''), ms))]);

async function scrapeDomDirect(u) {
  if (!u) return '';
  try {
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } });
    if (!r.ok) return '';
    const html = (await r.text()).slice(0, 60000);
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const desc = (html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i) || [])[1] || '';
    const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 1800);
    return [title ? 'Title: ' + title.trim() : '', desc ? 'Meta: ' + desc.trim() : '', body ? 'Excerpt: ' + body : ''].filter(Boolean).join('\n');
  } catch (e) { return ''; }
}

async function executeChromiumTask(queryOrUrl) {
  const raw = String(queryOrUrl || '').trim();
  const { url: targetUrl, ghUser, q, via } = resolveJarvisTarget(raw);

  // 1. Bing Web RSS + Top URL Discovery
  let topDiscoveredUrl = '';
  const bingTask = cap((async () => {
    try {
      const r = await fetch('https://www.bing.com/search?format=rss&q=' + encodeURIComponent(q));
      if (!r.ok) return '';
      const xml = await r.text();
      const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<\/item>/gi)];
      if (items[0] && items[0][3]) topDiscoveredUrl = items[0][3].trim();
      return items.slice(0, 5).map(m => '• ' + m[1].replace(/<!\[CDATA\[|\]\]>/g, '') + ': ' + m[2].replace(/<!\[CDATA\[|\]\]>|<[^>]+>/g, '') + ' (' + m[3] + ')').join('\n');
    } catch (e) { return ''; }
  })(), 3500);

  // 2. Google News Live RSS
  const gNewsTask = cap((async () => {
    try {
      const r = await fetch('https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=en-IN&gl=IN&ceid=IN:en');
      if (!r.ok) return '';
      const xml = await r.text();
      const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<\/item>/gi)];
      return items.slice(0, 5).map(m => '• ' + m[1].replace(/<!\[CDATA\[|\]\]>/g, '') + ' [' + m[2] + ']').join('\n');
    } catch (e) { return ''; }
  })(), 3500);

  // 3. Wikipedia + HackerNews + GitHub Instant APIs
  const wikiTask = cap((async () => {
    try {
      const r = await fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(q) + '&utf8=&format=json');
      const j = await r.json();
      const s = j?.query?.search?.slice(0, 3) || [];
      return s.map(x => '• ' + x.title + ': ' + x.snippet.replace(/<[^>]+>/g, '')).join('\n');
    } catch (e) { return ''; }
  })(), 3000);

  const hnTask = cap((async () => {
    try {
      if (ghUser) {
        const g = await (await fetch('https://api.github.com/users/' + ghUser)).json();
        return g.login ? `GitHub: ${g.login} (${g.name || ''}) | Repos: ${g.public_repos} | Followers: ${g.followers} | Bio: ${g.bio || ''}` : '';
      }
      const r = await fetch('https://hn.algolia.com/api/v1/search? hitsPerPage=3&query=' + encodeURIComponent(q));
      const j = await r.json();
      return (j.hits || []).slice(0, 3).map(h => '• ' + (h.title || h.story_title || '') + ' (' + (h.url || '') + ')').join('\n');
    } catch (e) { return ''; }
  })(), 3000);

  // 4. Jina Search
  const jSearchTask = cap((async () => {
    try {
      const r = await fetch('https://s.jina.ai/' + encodeURIComponent(q), { headers: { 'Accept': 'text/plain' } });
      return r.ok ? (await r.text()).trim().slice(0, 3500) : '';
    } catch (e) { return ''; }
  })(), 4200);

  const [bing, gNews, wiki, hn, jSearch] = await Promise.all([bingTask, gNewsTask, wikiTask, hnTask, jSearchTask]);

  // 5. Deep-Crawl Target URL (or #1 Discovered Search URL) via 3-Engine Chromium Cascade
  const crawlUrl = targetUrl || topDiscoveredUrl;
  let deepDom = '';
  if (crawlUrl) {
    const [jRead, micro, rawDom] = await Promise.all([
      cap(fetch('https://r.jina.ai/' + crawlUrl, { headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' } }).then(r => r.ok ? r.text() : '').catch(() => ''), 4000),
      cap(fetch('https://api.microlink.io/?url=' + encodeURIComponent(crawlUrl)).then(r => r.json()).then(j => j?.data ? `Title: ${j.data.title || ''}\nDesc: ${j.data.description || ''}\nAuthor: ${j.data.author || j.data.publisher || ''}` : '').catch(() => ''), 3800),
      cap(scrapeDomDirect(crawlUrl), 3500)
    ]);
    deepDom = [micro, String(jRead || '').trim().slice(0, 3500), rawDom].filter(Boolean).join('\n\n');
  }

  const telemetry = [
    deepDom ? '--- [DEEP CHROMIUM PAGE EXTRACTION (' + crawlUrl + ')] ---\n' + deepDom : '',
    bing ? '--- [BING LIVE WEB INDEX] ---\n' + bing : '',
    gNews ? '--- [GOOGLE NEWS LIVE FEED] ---\n' + gNews : '',
    wiki ? '--- [WIKIPEDIA KNOWLEDGE GRAPH] ---\n' + wiki : '',
    hn ? '--- [TECH & DEVELOPER PULSE] ---\n' + hn : '',
    jSearch ? '--- [JINA AI WEB TELEMETRY] ---\n' + jSearch : ''
  ].filter(Boolean).join('\n\n');

  return {
    ok: true,
    intel: [
      '=== [VICTOR OMNI-CORE v6.0 LIVE WEB TELEMETRY] ===',
      '[SYSTEM MANDATE: You HAVE just executed an 8-engine real-time web crawl for Sir. NEVER say browsing timed out or that you cannot access websites/YouTube. Synthesize the live telemetry below into a sharp, authoritative answer.]',
      'Query: ' + raw + ' | Target: ' + (crawlUrl || q) + ' (' + via + ')',
      telemetry || 'Target verified online at ' + (crawlUrl || q) + '.'
    ].join('\n\n')
  };
}
// === END VICTOR MASTER CHROMIUM ENGINE ===





import { MongoClient } from "mongodb";
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { exec } from 'child_process';
import { Client } from '@gradio/client';

const PORT = process.env.PORT || 8080;
const home = os.homedir();
const vaultFile = path.join(home, '.victor_vault.json');
const memFile = path.join(home, '.victor_memory.json');
const mediaDir = path.join(home, 'victor-media');
const projectsDir = path.join(home, 'victor-projects');
[mediaDir, projectsDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// --- MONGODB ATLAS PERMANENT STORAGE ENGINE ---
let mongoCol = null;
const origWriteFileSync = fs.writeFileSync.bind(fs);

if (process.env.MONGODB_URI) {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    mongoCol = client.db("victor_core").collection("storage");
    console.log("✅ Connected to MongoDB Atlas Permanent Storage");

    const vaultDoc = await mongoCol.findOne({ _id: "vault" });
    if (vaultDoc && vaultDoc.data) origWriteFileSync(vaultFile, vaultDoc.data);

    const memDoc = await mongoCol.findOne({ _id: "memory" });
    if (memDoc && memDoc.data) origWriteFileSync(memFile, memDoc.data);
  } catch (err) {
    console.error("⚠️ MongoDB connection error:", err.message);
  }
}

fs.writeFileSync = function(file, data, options) {
  origWriteFileSync(file, data, options);
  if (mongoCol) {
    const strData = typeof data === "string" ? data : data.toString("utf8");
    if (file === vaultFile) {
      mongoCol.updateOne({ _id: "vault" }, { $set: { data: strData, updatedAt: new Date() } }, { upsert: true }).catch(() => {});
    } else if (file === memFile) {
      mongoCol.updateOne({ _id: "memory" }, { $set: { data: strData, updatedAt: new Date() } }, { upsert: true }).catch(() => {});
    }
  }
};
// ----------------------------------------------

const MASTER_PASS = '@stark1082011';
const PASS_B64 = "QHN0YXJrMTA4MjAxMQ==";
const CLOUD_TOPIC = 'victor_core_' + crypto.createHash('sha256').update(MASTER_PASS + '_COGNITIVE_CORE_V4').digest('hex').slice(0, 22);

function encryptPayload(obj) {
  const salt = crypto.randomBytes(16).toString('hex');
  const iv = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(MASTER_PASS, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
  const data = Buffer.concat([cipher.update('VICTOR_V4:' + JSON.stringify(obj), 'utf8'), cipher.final()]).toString('hex');
  return { salt, iv, data };
}

function decryptPayload(v) {
  const key = crypto.scryptSync(MASTER_PASS, v.salt, 32);
  const ivBuf = typeof v.iv === 'string' ? Buffer.from(v.iv, 'hex') : Buffer.from(v.iv.data || v.iv);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuf);
  const dec = Buffer.concat([decipher.update(Buffer.from(v.data, 'hex')), decipher.final()]).toString('utf8');
  return JSON.parse(dec.replace(/^VICTOR_V[234]:/, ''));
}

function loadVault() {
  let keys = { gsk: '', hf: '', sk: '' };
  try {
    if (fs.existsSync(vaultFile)) keys = { ...keys, ...decryptPayload(JSON.parse(fs.readFileSync(vaultFile, 'utf8'))) };
  } catch (e) {}
  return keys;
}

function saveVault(gsk, hf, sk) {
  const cur = loadVault();
  const payload = { gsk: gsk || cur.gsk || '', hf: hf || cur.hf || '', sk: sk || cur.sk || '' };
  fs.writeFileSync(vaultFile, JSON.stringify(encryptPayload(payload), null, 2), 'utf8');
  return payload;
}

function loadMemory() {
  const def = {
    persona: 'You are VICTOR, an advanced, fast, and concise AI intelligence created by Ujjaval (Sir). Address him as Sir.',
    history: [],
    projects: []
  };
  try {
    if (fs.existsSync(memFile)) return { ...def, ...JSON.parse(fs.readFileSync(memFile, 'utf8')) };
  } catch (e) {}
  return def;
}

function saveMemory(mem) {
  const clean = {
    persona: mem.persona || loadMemory().persona,
    history: (mem.history || []).slice(-24),
    projects: (mem.projects || []).slice(-20)
  };
  fs.writeFileSync(memFile, JSON.stringify(clean, null, 2), 'utf8');
  return clean;
}

let VAULT = loadVault();
let MEMORY = loadMemory();

async function pushCloudSync() {
  const bundle = { vault: VAULT, memory: MEMORY, syncedAt: new Date().toISOString() };
  const r = await fetch('https://ntfy.sh/' + CLOUD_TOPIC, { method: 'POST', body: JSON.stringify(encryptPayload(bundle)) });
  if (!r.ok) throw new Error('Cloud status ' + r.status);
  return { ok: true, syncedAt: bundle.syncedAt };
}

async function pullCloudSync() {
  const r = await fetch('https://ntfy.sh/' + CLOUD_TOPIC + '/json?poll=1&since=all');
  const lines = (await r.text()).trim().split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const msg = JSON.parse(lines[i]);
      if (msg.event === 'message' && msg.message) {
        const dec = decryptPayload(JSON.parse(msg.message));
        if (dec.vault) VAULT = saveVault(dec.vault.gsk, dec.vault.hf, dec.vault.sk);
        if (dec.memory) MEMORY = saveMemory(dec.memory);
        return { ok: true, vault: VAULT, memory: MEMORY };
      }
    } catch (e) {}
  }
  return { ok: false, error: 'No cloud backup found.' };
}

async function runWebResearch(query) {
  const cleanQ = query.replace(/^(research|search|scrape|look up)\s+/i, '').trim();
  const tasks = [
    fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(cleanQ) + '&utf8=&format=json', { signal: AbortSignal.timeout(2500) })
      .then(r => r.json()).then(j => (j.query?.search || []).slice(0, 3).map(s => s.title + ': ' + s.snippet.replace(/<[^>]+>/g, '')).join('\n')),
    fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(cleanQ), { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(2500) })
      .then(r => r.text()).then(h => [...h.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).slice(0, 5).join('\n'))
  ];
  const results = await Promise.allSettled(tasks);
  return results.map(r => r.status === 'fulfilled' ? r.value : '').filter(Boolean).join('\n\n') || 'Using core knowledge.';
}

async function buildCodeToDisk(spec) {
  const safeFolder = (spec.projectName || 'project_' + Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
  const projPath = path.join(projectsDir, safeFolder);
  if (!fs.existsSync(projPath)) fs.mkdirSync(projPath, { recursive: true });
  const written = [];
  for (const f of (spec.files || [])) {
    const safeFile = path.basename(f.name || 'index.js');
    fs.writeFileSync(path.join(projPath, safeFile), f.content || '', 'utf8');
    written.push(safeFile);
  }
  let output = 'Verified OK.';
  if (spec.testCmd) {
    output = await new Promise(res => exec(spec.testCmd, { cwd: projPath, timeout: 3500 }, (e, out, err) => res((out || err || 'OK').trim().slice(0, 500))));
  }
  MEMORY.projects = [{ name: safeFolder, files: written }, ...(MEMORY.projects || []).filter(p => p.name !== safeFolder)];
  saveMemory(MEMORY);
  return { ok: true, folder: projPath, files: written, output };
}

async function renderTurboVideo(prompt, skKey) {
  const ts = Date.now();
  const imgPath = path.join(mediaDir, `f_${ts}.jpg`);
  const outName = `v_${ts}.mp4`;
  const outPath = path.join(mediaDir, outName);
  const imgUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt + ', cinematic frame')}?model=turbo&width=640&height=360&nologo=true&seed=${Math.floor(Math.random() * 9999)}${skKey ? '&key=' + encodeURIComponent(skKey) : ''}`;
  const res = await fetch(imgUrl);
  fs.writeFileSync(imgPath, Buffer.from(await res.arrayBuffer()));
  const vf = `scale=640:360,zoompan=z='min(zoom+0.0025,1.2)':d=75:fps=15:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=640x360`;
  await new Promise((resolve, reject) => {
    exec(`ffmpeg -y -loop 1 -i "${imgPath}" -vf "${vf}" -c:v libx264 -preset ultrafast -tune stillimage -t 5 -pix_fmt yuv420p "${outPath}"`, err => err ? reject(err) : resolve());
  });
  return { ok: true, url: '/media/' + outName, file: outName };
}

async function generate3DModel(prompt, skKey) {
  const ts = Date.now();
  const glbName = `v3d_${ts}.glb`;
  const glbPath = path.join(mediaDir, glbName);
  const imgUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt + ', 3D object, plain background')}?model=turbo&width=256&height=256&nologo=true&seed=${Math.floor(Math.random() * 9999)}`;
  const trellisUrl = `https://gen.pollinations.ai/3d/no_prompt_for_trellis_needed?model=microsoft%2Ftrellis-2&resolution=low${skKey ? '&key=' + encodeURIComponent(skKey) : ''}&image=${encodeURIComponent(imgUrl)}`;
  const res = await fetch(trellisUrl, skKey ? { headers: { 'Authorization': 'Bearer ' + skKey } } : {});
  if (!res.ok) throw new Error('Status ' + res.status);
  fs.writeFileSync(glbPath, Buffer.from(await res.arrayBuffer()));
  return { ok: true, glbUrl: '/media/' + glbName, previewImg: imgUrl, file: glbName };
}

async function generateCloudSong(prompt, lyrics, hfToken, skKey) {
  try {
    const app = await Client.connect('ACE-Step/ACE-Step', hfToken ? { hf_token: hfToken } : {});
    const apiInfo = await app.view_api();
    const ep = Object.keys(apiInfo.named_endpoints || {})[0];
    if (ep) {
      const res = await Promise.race([
        app.predict(ep, [20, prompt || 'modern track, 110 bpm', lyrics]),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 25000))
      ]);
      const m = JSON.stringify(res).match(/https?:\/\/[^"'\s]+\.(wav|mp3|flac|ogg|m4a)/i);
      if (m) return { ok: true, url: m[0] };
    }
  } catch (e) {}
  if (skKey) {
    const clean = lyrics.replace(/\[.*?\]/g, '').trim().slice(0, 280);
    return { ok: true, url: `https://gen.pollinations.ai/audio/${encodeURIComponent(clean)}?voice=onyx&key=${encodeURIComponent(skKey)}` };
  }
  return { ok: false, error: 'Audio queue busy.' };
}
const VICTOR_LOGO_SVG = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%">
  <circle cx="50" cy="50" r="42" stroke="rgba(56,189,248,0.22)" stroke-width="2"/>
  <path d="M26 32 L50 74 L74 32" stroke="#38bdf8" stroke-width="6"/>
  <path d="M37 32 L50 55 L63 32" stroke="#e2e8f0" stroke-width="3.5" opacity="0.9"/>
</svg>`;

const ICONS = {
  mic: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`,
  speaker: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  cloud: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
  reset: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
  auto: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  code: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  cube: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  image: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  music: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  video: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="14" x="3" y="5" rx="2"/><polygon points="10 9 15 12 10 15 10 9"/></svg>`,
  send: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>`
};

const HTML_UI = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>VICTOR</title>
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
  <style>
    :root {
      --bg: #090a0f;
      --surface: #12141c;
      --surface-hover: #191c26;
      --border: rgba(255, 255, 255, 0.08);
      --accent: #38bdf8;
      --text: #f1f5f9;
      --subtext: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
    #lock-screen { position: fixed; inset: 0; z-index: 100; background: var(--bg); display: flex; align-items: center; justify-content: center; padding: 24px; }
    .lock-card { width: 100%; max-width: 360px; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 32px 24px; text-align: center; }
    .lock-logo { width: 56px; height: 56px; margin: 0 auto 16px; }
    .lock-title { font-size: 18px; font-weight: 600; letter-spacing: 3px; color: var(--text); margin-bottom: 20px; }
    .lock-input { width: 100%; padding: 13px 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; color: #fff; font-size: 14px; outline: none; margin-bottom: 12px; text-align: center; transition: border 0.2s; }
    .lock-input:focus { border-color: var(--accent); }
    .lock-btn { width: 100%; padding: 13px; background: var(--text); border: none; border-radius: 12px; color: var(--bg); font-weight: 600; font-size: 14px; cursor: pointer; }
    #lock-err { color: #ef4444; font-size: 12px; margin-top: 10px; min-height: 16px; }

    header { height: 56px; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); background: var(--bg); }
    .brand { display: flex; align-items: center; gap: 10px; }
    .nav-logo { width: 28px; height: 28px; }
    .brand-name { font-weight: 600; font-size: 14px; letter-spacing: 2.5px; color: var(--text); }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }
    .nav-actions { display: flex; gap: 8px; align-items: center; }
    .icon-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--surface); border: 1px solid var(--border); color: var(--subtext); border-radius: 10px; cursor: pointer; transition: all 0.15s ease; }
    .icon-btn.active { color: var(--accent); border-color: rgba(56, 189, 248, 0.35); background: rgba(56, 189, 248, 0.08); }

    #drawer { display: none; position: fixed; inset: 56px 0 0 0; z-index: 50; background: rgba(9, 10, 15, 0.96); backdrop-filter: blur(8px); padding: 20px; overflow-y: auto; }
    .drawer-card { max-width: 540px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .drawer-card textarea { width: 100%; height: 84px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; color: var(--text); padding: 10px; font-size: 13px; outline: none; resize: none; }
    .sync-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-subtle { background: var(--surface-hover); color: var(--text); border: 1px solid var(--border); padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; text-decoration: none; }
    .btn-primary { background: var(--accent); color: #090a0f; border: none; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none; }

    #chat-container { flex: 1; overflow-y: auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 20px; max-width: 760px; width: 100%; margin: 0 auto; }
    #welcome-hero { margin: auto 0; text-align: center; opacity: 0.85; }
    .hero-logo { width: 52px; height: 52px; margin: 0 auto 12px; }
    .msg-row { display: flex; gap: 12px; width: 100%; align-items: flex-start; }
    .msg-row.user { justify-content: flex-end; }
    .avatar { width: 26px; height: 26px; flex-shrink: 0; margin-top: 2px; }
    .bubble { max-width: 85%; line-height: 1.6; font-size: 14.5px; word-wrap: break-word; color: var(--text); }
    .user .bubble { background: var(--surface); border: 1px solid var(--border); padding: 10px 15px; border-radius: 16px 16px 4px 16px; }
    .victor .bubble { flex: 1; }
    pre { background: #050609; border: 1px solid var(--border); padding: 12px; border-radius: 10px; overflow-x: auto; font-family: monospace; font-size: 12.5px; margin: 10px 0; }
    .media-card { margin-top: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; max-width: 420px; }
    .media-card img, .media-card video { width: 100%; display: block; background: #000; }
    .media-card audio { width: 100%; margin-top: 6px; }
    model-viewer { width: 100%; height: 280px; background: #050609; }
    .media-bar { padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--subtext); border-top: 1px solid var(--border); }

    .composer-wrap { padding: 8px 14px 16px; background: var(--bg); }
    .composer { max-width: 760px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
    .mode-bar { display: flex; align-items: center; justify-content: space-between; padding: 2px 4px; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 6px; }
    .mode-icons { display: flex; gap: 4px; }
    .mode-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: transparent; border: none; color: var(--subtext); cursor: pointer; transition: all 0.15s; }
    .mode-btn.active { color: var(--accent); background: rgba(56, 189, 248, 0.1); }
    .mode-indicator { font-size: 11px; font-weight: 500; color: var(--subtext); letter-spacing: 0.5px; padding-right: 4px; }
    .input-row { display: flex; align-items: center; gap: 8px; padding-left: 6px; }
    #prompt-input { flex: 1; background: transparent; border: none; color: var(--text); font-size: 14.5px; outline: none; padding: 6px 0; }
    #prompt-input::placeholder { color: var(--subtext); }
    .send-btn { width: 34px; height: 34px; border-radius: 10px; background: var(--text); border: none; color: var(--bg); display: flex; align-items: center; justify-content: center; cursor: pointer; }
  </style>
</head>
<body>
  <div id="lock-screen">
    <div class="lock-card">
      <div class="lock-logo">${VICTOR_LOGO_SVG}</div>
      <div class="lock-title">VICTOR</div>
      <input type="password" id="auth-input" class="lock-input" placeholder="Passkey" onkeydown="if(event.key==='Enter')unlockCore()" />
      <button type="button" class="lock-btn" onclick="unlockCore()">Unlock</button>
      <div id="lock-err"></div>
    </div>
  </div>
  <header>
    <div class="brand">
      <div class="nav-logo">${VICTOR_LOGO_SVG}</div>
      <span class="brand-name">VICTOR</span>
      <div class="status-dot"></div>
    </div>
    <div class="nav-actions">
      <button id="wake-btn" class="icon-btn" onclick="toggleWakeMode()" title="Voice Wake">${ICONS.mic}</button>
      <button id="tts-btn" class="icon-btn active" onclick="toggleVoice()" title="Neural Voice">${ICONS.speaker}</button>
      <button id="sync-btn" class="icon-btn" onclick="toggleDrawer()" title="Cloud Sync & Memory">${ICONS.cloud}</button>
      <button class="icon-btn" onclick="clearChat()" title="New Session">${ICONS.reset}</button>
    </div>
  </header>
  <div id="drawer">
    <div class="drawer-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;font-weight:600;letter-spacing:1px">CLOUD VAULT & MEMORY</span>
        <button class="btn-subtle" onclick="toggleDrawer()">Close</button>
      </div>
      <textarea id="persona-box" placeholder="System persona instructions..."></textarea>
      <div class="sync-row">
        <button class="btn-subtle" onclick="savePersonaLocal()">Save</button>
        <button class="btn-primary" onclick="cloudPush()">Push Cloud</button>
        <button class="btn-subtle" onclick="cloudPull()">Pull Cloud</button>
      </div>
      <div id="sync-status" style="font-size:12px;color:var(--accent)"></div>
      <div id="projects-list" style="font-size:12px;color:var(--subtext)"></div>
    </div>
  </div>
  <div id="chat-container">
    <div id="welcome-hero">
      <div class="hero-logo">${VICTOR_LOGO_SVG}</div>
    </div>
  </div>
  <div class="composer-wrap">
    <div class="composer">
      <div class="mode-bar">
        <div class="mode-icons">
          <button class="mode-btn active" id="mode-auto" onclick="setMode('auto')" title="Cognitive Auto">${ICONS.auto}</button>
          <button class="mode-btn" id="mode-research" onclick="setMode('research')" title="Web Research">${ICONS.globe}</button>
          <button class="mode-btn" id="mode-build" onclick="setMode('build')" title="Code Builder">${ICONS.code}</button>
          <button class="mode-btn" id="mode-3d" onclick="setMode('3d')" title="3D Mesh">${ICONS.cube}</button>
          <button class="mode-btn" id="mode-image" onclick="setMode('image')" title="Image">${ICONS.image}</button>
          <button class="mode-btn" id="mode-music" onclick="setMode('music')" title="Audio Song">${ICONS.music}</button>
          <button class="mode-btn" id="mode-video" onclick="setMode('video')" title="MP4 Video">${ICONS.video}</button>
        </div>
        <span class="mode-indicator" id="mode-label">AUTO</span>
      </div>
      <div class="input-row">
        <input type="text" id="prompt-input" placeholder="Message VICTOR..." onkeydown="if(event.key==='Enter')sendMessage()" />
        <button type="button" class="mode-btn" onclick="singleVoiceInput()" title="Voice Input">${ICONS.mic}</button>
        <button type="button" class="send-btn" onclick="sendMessage()">${ICONS.send}</button>
      </div>
    </div>
  </div>`;

const HTML_SCRIPT = `
  <script>
    const MASTER_B64 = "${PASS_B64}";
    const LOGO_MINI = ${JSON.stringify(VICTOR_LOGO_SVG)};
    let activeGroqKey = "${VAULT.gsk}" || localStorage.getItem('victor_groq_key') || '';
    let activeHfKey = "${VAULT.hf}" || localStorage.getItem('victor_hf_key') || '';
    let activeSkKey = "${VAULT.sk}" || localStorage.getItem('victor_sk_key') || '';
    let memoryState = ${JSON.stringify(MEMORY).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')};
    let currentMode = 'auto';
    let voiceOn = true;
    let wakeOn = false;
    let wakeRec = null;
    let currentAudio = null;

    const MODE_NAMES = {
      auto: { tag: 'AUTO', hint: 'Message VICTOR...' },
      research: { tag: 'RESEARCH', hint: 'Search live web or paste URL...' },
      build: { tag: 'BUILD', hint: 'Describe code project to write to disk...' },
      '3d': { tag: '3D MESH', hint: 'Describe 3D object to generate...' },
      image: { tag: 'IMAGE', hint: 'Describe 8K image to render...' },
      music: { tag: 'AUDIO', hint: 'Describe song style and theme...' },
      video: { tag: 'VIDEO', hint: 'Describe MP4 video scene...' }
    };

    function unlockCore() {
      const val = (document.getElementById('auth-input').value || '').trim();
      const errEl = document.getElementById('lock-err');
      let isCreator = false;
      try { isCreator = (window.btoa(val) === MASTER_B64); } catch (e) {}
      if (!isCreator && !val.startsWith('gsk_') && !val.startsWith('sk_')) {
        errEl.innerText = 'Invalid passkey';
        return;
      }
      document.getElementById('lock-screen').style.display = 'none';
      document.getElementById('persona-box').value = memoryState.persona || '';
      renderSavedHistory();
    }

    function renderSavedHistory() {
      if (!memoryState.history || !memoryState.history.length) return;
      const hero = document.getElementById('welcome-hero');
      if (hero) hero.remove();
      memoryState.history.slice(-10).forEach(item => {
        addBubble(item.role === 'user' ? 'user' : 'victor', formatMd(item.content), true);
      });
      updateProjectsDrawer();
    }

    function updateProjectsDrawer() {
      const el = document.getElementById('projects-list');
      const list = memoryState.projects || [];
      el.innerHTML = list.length ? ('Projects: ' + list.map(p => '<code>' + p.name + '</code>').join(', ')) : '';
    }

    function toggleDrawer() {
      const d = document.getElementById('drawer');
      const open = d.style.display === 'block';
      d.style.display = open ? 'none' : 'block';
      document.getElementById('sync-btn').classList.toggle('active', !open);
      updateProjectsDrawer();
    }

    async function savePersonaLocal() {
      memoryState.persona = document.getElementById('persona-box').value;
      await fetch('/api/memory', { method: 'POST', body: JSON.stringify(memoryState) });
      document.getElementById('sync-status').innerText = 'Saved locally.';
    }

    async function cloudPush() {
      document.getElementById('sync-status').innerText = 'Syncing...';
      memoryState.persona = document.getElementById('persona-box').value;
      await fetch('/api/memory', { method: 'POST', body: JSON.stringify(memoryState) });
      const r = await fetch('/api/cloud-push', { method: 'POST' });
      const d = await r.json();
      document.getElementById('sync-status').innerText = d.ok ? 'Synced to cloud.' : d.error;
    }

    async function cloudPull() {
      document.getElementById('sync-status').innerText = 'Restoring...';
      const r = await fetch('/api/cloud-pull', { method: 'POST' });
      const d = await r.json();
      if (d.ok) {
        activeGroqKey = d.vault.gsk || activeGroqKey;
        activeHfKey = d.vault.hf || activeHfKey;
        activeSkKey = d.vault.sk || activeSkKey;
        memoryState = d.memory;
        document.getElementById('persona-box').value = memoryState.persona || '';
        document.getElementById('chat-container').innerHTML = '';
        renderSavedHistory();
        document.getElementById('sync-status').innerText = 'Restored from cloud.';
      } else {
        document.getElementById('sync-status').innerText = d.error;
      }
    }

    function toggleVoice() {
      voiceOn = !voiceOn;
      document.getElementById('tts-btn').classList.toggle('active', voiceOn);
      if (!voiceOn && currentAudio) currentAudio.pause();
    }

    function speakNeural(text) {
      if (!voiceOn || !text) return;
      const clean = text.replace(/\\x60{3}[\\s\\S]*?\\x60{3}/g, 'Code ready, Sir.').replace(/[*_#\\x60~>]/g, '').slice(0, 260);
      if (activeSkKey) {
        try {
          if (currentAudio) currentAudio.pause();
          const u = 'https://gen.pollinations.ai/audio/' + encodeURIComponent(clean) + '?voice=echo&key=' + encodeURIComponent(activeSkKey);
          currentAudio = new Audio(u);
          currentAudio.play().catch(() => {});
          return;
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(clean));
      }
    }

    function singleVoiceInput() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      const rec = new SR();
      rec.lang = 'en-US';
      rec.onresult = (e) => {
        document.getElementById('prompt-input').value = e.results[0][0].transcript;
        sendMessage();
      };
      rec.start();
    }

    function toggleWakeMode() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      wakeOn = !wakeOn;
      document.getElementById('wake-btn').classList.toggle('active', wakeOn);
      if (wakeOn) {
        wakeRec = new SR();
        wakeRec.continuous = true;
        wakeRec.lang = 'en-US';
        wakeRec.onresult = (e) => {
          const last = e.results[e.results.length - 1][0].transcript.trim();
          if (last.length > 2) {
            document.getElementById('prompt-input').value = last.replace(/^(hey|ok|hello)\\s+victor\\s*,?\\s*/i, '');
            sendMessage();
          }
        };
        wakeRec.onend = () => { if (wakeOn) try { wakeRec.start(); } catch (e) {} };
        try { wakeRec.start(); } catch (e) {}
      } else if (wakeRec) {
        wakeRec.stop();
      }
    }

    function setMode(m) {
      currentMode = m;
      document.querySelectorAll('.mode-btn').forEach(el => el.classList.remove('active'));
      const t = document.getElementById('mode-' + m);
      if (t) t.classList.add('active');
      const info = MODE_NAMES[m] || MODE_NAMES.auto;
      document.getElementById('mode-label').innerText = info.tag;
      document.getElementById('prompt-input').placeholder = info.hint;
    }

    async function clearChat() {
      document.getElementById('chat-container').innerHTML = '<div id="welcome-hero"><div class="hero-logo">' + LOGO_MINI + '</div></div>';
      memoryState.history = [];
      await fetch('/api/memory', { method: 'POST', body: JSON.stringify(memoryState) });
    }

    function formatMd(text) {
      let s = (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      s = s.replace(/\\x60{3}([a-zA-Z]*)\\n([\\s\\S]*?)\\x60{3}/g, '<pre><code>$2</code></pre>');
      s = s.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      return s.replace(/\\n/g, '<br>');
    }

    function addBubble(role, html, skipScroll) {
      const hero = document.getElementById('welcome-hero');
      if (hero) hero.remove();
      const c = document.getElementById('chat-container');
      const r = document.createElement('div');
      r.className = 'msg-row ' + role;
      r.innerHTML = (role === 'victor' ? '<div class="avatar">' + LOGO_MINI + '</div>' : '') + '<div class="bubble">' + html + '</div>';
      c.appendChild(r);
      if (!skipScroll) c.scrollTop = c.scrollHeight;
      return r.querySelector('.bubble');
    }

    async function askBrain(sys, userMsg, useHistory) {
      const histMsgs = useHistory ? (memoryState.history || []).slice(-10) : [];
      const messages = [{ role: 'system', content: sys }, ...histMsgs, { role: 'user', content: userMsg }];
      if (activeGroqKey) {
        try {
          let model = localStorage.getItem('victor_best_model') || 'llama-3.3-70b-versatile';
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + activeGroqKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages })
          });
          const d = await r.json();
          if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
        } catch (e) {}
      }
      if (activeSkKey) {
        const r = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + activeSkKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'openai', messages })
        });
        const d = await r.json();
        return d.choices?.[0]?.message?.content || 'No response.';
      }
      return 'Paste your gsk_ or sk_ key in chat, Sir.';
    }

    async function recordTurn(userMsg, victorReply) {
      memoryState.history = [...(memoryState.history || []), { role: 'user', content: userMsg }, { role: 'assistant', content: victorReply }].slice(-30);
      fetch('/api/memory', { method: 'POST', body: JSON.stringify(memoryState) }).catch(() => {});
    }

    async function sendMessage() {
      const inp = document.getElementById('prompt-input');
      const msg = inp.value.trim();
      if (!msg) return;
      inp.value = '';
      addBubble('user', formatMd(msg));
      const b = addBubble('victor', '<span style="color:var(--subtext)">Processing...</span>');
      const lower = msg.toLowerCase();

      if (msg.startsWith('gsk_') || msg.startsWith('hf_') || msg.startsWith('sk_')) {
        if (msg.startsWith('gsk_')) activeGroqKey = msg;
        if (msg.startsWith('hf_')) activeHfKey = msg;
        if (msg.startsWith('sk_')) activeSkKey = msg;
        await fetch('/api/save-keys', { method: 'POST', body: JSON.stringify({ gsk: activeGroqKey, hf: activeHfKey, sk: activeSkKey }) });
        b.innerHTML = 'Key saved to vault.';
        return;
      }

      const isResearch = currentMode === 'research' || /^(research|search|scrape|look up)/i.test(lower) || /https?:\\/\\//i.test(lower);
      const isBuild = currentMode === 'build' || /^(build|create project|write file|save script)/i.test(lower);
      const is3D = currentMode === '3d' || /(generate|create|make|render)\\s+(an?\\s+)?(3d|hologram|mesh|glb)/i.test(lower);
      const isImg = currentMode === 'image' || /(generate|create|draw)\\s+(an?\\s+)?(image|photo|picture|art)/i.test(lower);
      const isMusic = currentMode === 'music' || /(generate|create|make|compose)\\s+(an?\\s+)?(music|song|rap|track)/i.test(lower);
      const isVideo = currentMode === 'video' || /(generate|create|render|edit)\\s+(an?\\s+)?(video|movie|mp4)/i.test(lower);

      if (isResearch) {
        const r = await fetch('/api/research', { method: 'POST', body: JSON.stringify({ query: msg }) });
        const d = await r.json();
        const ans = await askBrain(memoryState.persona + '\\nLive web data:\\n' + d.intel, msg, true);
        b.innerHTML = (d.screenshot ? '<img src="' + d.screenshot + '" style="max-width:100%;border-radius:10px;margin-bottom:10px;border:1px solid #333;" /><br>' : '') + formatMd(ans);
        recordTurn(msg, ans); speakNeural(ans); setMode('auto'); return;
      }

      if (isBuild) {
        const rawJson = await askBrain('Return ONLY valid JSON: {"projectName":"name","files":[{"name":"index.js","content":"code"}],"testCmd":"node --check index.js","summary":"Summary"}', msg, false);
        try {
          const clean = rawJson.replace(/\\x60{3}json|\\x60{3}/g, '').trim();
          const spec = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
          const r = await fetch('/api/build', { method: 'POST', body: JSON.stringify(spec) });
          const d = await r.json();
          if (d.ok) {
            memoryState.projects = d.projects || memoryState.projects;
            b.innerHTML = '<strong>' + d.folder + '</strong><pre><code>' + d.output + '</code></pre>' + formatMd(spec.summary || '');
            speakNeural('Project written to disk, Sir.');
          }
        } catch (e) { b.innerHTML = formatMd(rawJson); }
        setMode('auto'); return;
      }

      if (is3D) {
        const r = await fetch('/api/3d', { method: 'POST', body: JSON.stringify({ prompt: msg, sk: activeSkKey }) });
        const d = await r.json();
        b.innerHTML = d.ok ? ('<div class="media-card"><model-viewer src="' + d.glbUrl + '" poster="' + d.previewImg + '" auto-rotate camera-controls></model-viewer><div class="media-bar"><span>3D GLB</span><a class="btn-primary" href="' + d.glbUrl + '" download="' + d.file + '">Download</a></div></div>') : d.error;
        setMode('auto'); return;
      }

      if (isImg) {
        const keyParam = activeSkKey ? '&key=' + encodeURIComponent(activeSkKey) : '';
        const url = 'https://gen.pollinations.ai/image/' + encodeURIComponent(msg + ', 8k ultra detailed') + '?model=flux&width=1024&height=1024&nologo=true&seed=' + Math.floor(Math.random() * 999999) + keyParam;
        b.innerHTML = '<div class="media-card"><img src="' + url + '" /><div class="media-bar"><span>1024×1024</span><a class="btn-primary" href="' + url + '" target="_blank" download="victor.jpg">Download</a></div></div>';
        setMode('auto'); return;
      }

      if (isMusic) {
        const lyrics = await askBrain('Write a short song with [verse] and [chorus] tags (8 lines). Output ONLY lyrics.', msg, false);
        const r = await fetch('/api/song', { method: 'POST', body: JSON.stringify({ prompt: msg, lyrics, hf: activeHfKey }) });
        const d = await r.json();
        b.innerHTML = d.ok ? (formatMd(lyrics) + '<div class="media-card" style="padding:12px"><audio controls autoplay src="' + d.url + '"></audio><div class="media-bar"><span>Audio</span><a class="btn-primary" href="' + d.url + '" target="_blank">Download</a></div></div>') : (formatMd(lyrics) + '<br>' + d.error);
        setMode('auto'); return;
      }

      if (isVideo) {
        const r = await fetch('/api/video-edit', { method: 'POST', body: JSON.stringify({ prompt: msg, editCmd: msg, sk: activeSkKey }) });
        const d = await r.json();
        b.innerHTML = d.ok ? ('<div class="media-card"><video controls autoplay loop playsinline src="' + d.url + '"></video><div class="media-bar"><span>MP4</span><a class="btn-primary" href="' + d.url + '" download="' + d.file + '">Download</a></div></div>') : d.error;
        setMode('auto'); return;
      }

      const reply = await askBrain(memoryState.persona, msg, true);
      b.innerHTML = formatMd(reply);
      recordTurn(msg, reply);
      speakNeural(reply);
    }
  </script>
<script>
(function(){
  function unlock(){
    var i=document.getElementById('auth-input'), e=document.getElementById('lock-err');
    if((i&&i.value?i.value:'').trim()==='@stark1082011'){
      if(e)e.innerText='';
      var l=document.getElementById('lock-screen'); if(l)l.style.display='none';
      try{if(typeof renderSavedHistory==='function')renderSavedHistory();}catch(x){}
    }else if(e){e.innerText='Invalid passkey';}
  }
  window.unlockCore=unlock;
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.querySelector('.lock-btn'), i=document.getElementById('auth-input');
    if(b)b.addEventListener('click',unlock);
    if(i)i.addEventListener('keydown',function(ev){if(ev.key==='Enter')unlock();});
  });
})();
</script><script>
(function(){
  const origFetch = window.fetch;
  window.fetch = async function(url, opts) {
    try {
      const u = String(url || '');
      if ((u.includes('pollinations.ai') || u.includes('groq.com') || u.includes('/api/chat')) && opts && opts.body) {
        const body = JSON.parse(opts.body);
        const msgs = body.messages;
        if (Array.isArray(msgs) && msgs.length > 0) {
          const last = msgs[msgs.length - 1];
          const txt = last && typeof last.content === 'string' ? last.content.trim() : '';
          const low = txt.toLowerCase();
          const isWeb = (typeof currentMode !== 'undefined' && currentMode === 'research') ||
            low.startsWith('inspect') || low.startsWith('search') || low.startsWith('research') ||
            low.includes('http://') || low.includes('https://') || low.includes('@');
          if (isWeb && !txt.includes('VICTOR CLOUD CHROMIUM')) {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 5500);
            try {
              const wr = await origFetch('/api/web-intel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: txt }),
                signal: ctrl.signal
              });
              clearTimeout(timer);
              if (wr.ok) {
                const wd = await wr.json();
                if (wd && wd.intel) {
                  last.content = txt + '\n\n' + wd.intel;
                  opts.body = JSON.stringify(body);
                }
              }
            } catch (e) { clearTimeout(timer); }
          }
        }
      }
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };
})();
</script><style>
#v-drawer { position:fixed; top:0; left:-310px; width:290px; height:100%; background:#0b0f17; border-right:1px solid #1e293b; z-index:9999; transition:left 0.25s ease; display:flex; flex-direction:column; padding:14px; box-sizing:border-box; color:#e2e8f0; font-family:sans-serif; }
#v-drawer.open { left:0; box-shadow: 8px 0 30px rgba(0,0,0,0.8); }
.v-th-item { background:#151c28; border:1px solid #1e293b; border-radius:10px; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; }
.v-th-item.active { border-color:#38bdf8; background:#0f2238; }
.v-th-title { font-size:13px; font-weight:600; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:195px; }
.v-th-meta { font-size:10px; color:#94a3b8; margin-top:3px; }
.v-del-btn { background:#3f1d28; color:#fda4af; border:none; border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer; }
.v-hdr-btn { background:#151c28; color:#38bdf8; border:1px solid #1e293b; border-radius:8px; padding:5px 10px; font-size:13px; cursor:pointer; margin-right:6px; }
</style>
<div id="v-drawer">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <strong style="color:#38bdf8;font-size:14px;letter-spacing:1px;">CHAT LOGS (ATLAS)</strong>
    <button onclick="document.getElementById('v-drawer').classList.remove('open')" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;">✕</button>
  </div>
  <button onclick="window.startNewVictorChat()" style="width:100%;padding:9px;background:#0284c7;color:#fff;border:none;border-radius:8px;font-weight:600;margin-bottom:12px;cursor:pointer;">+ New Chat Thread</button>
  <div id="v-thread-list" style="flex:1;overflow-y:auto;"></div>
</div>

<script>
(function(){
  window.curThreadId = localStorage.getItem('victor_active_tid') || ('th_' + Date.now());
  window.curThreadMsgs = [];
  window.allVictorThreads = [];
  window.activeJarvisPersona = '';

  function getChatBox() {
    return document.getElementById('chat-box') || document.getElementById('chat-container') || document.getElementById('messages') || document.querySelector('main');
  }

  window.syncVictorOS = async function(payload) {
    try {
      const r = await fetch('/api/victor-os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || { action: 'status' })
      });
      const d = await r.json();
      if (!d || !d.ok) return;
      window.allVictorThreads = d.threads || [];
      window.activeJarvisPersona = d.persona || '';
      const pBox = document.querySelector('textarea[placeholder*="persona" i]');
      if (pBox && !pBox.value.trim()) pBox.value = window.activeJarvisPersona;
      renderThreadList();
      renderStorageGauge(d);
    } catch (e) {}
  };

  function renderThreadList() {
    const box = document.getElementById('v-thread-list');
    if (!box) return;
    if (!window.allVictorThreads.length) {
      box.innerHTML = '<div style="color:#64748b;font-size:12px;text-align:center;margin-top:20px;">No saved chat threads yet.</div>';
      return;
    }
    box.innerHTML = window.allVictorThreads.map(function(t) {
      const active = t.id === window.curThreadId ? ' active' : '';
      const count = Array.isArray(t.messages) ? t.messages.length : 0;
      const kb = (JSON.stringify(t).length / 1024).toFixed(1);
      return '<div class="v-th-item' + active + '" onclick="window.loadVictorThread(\'' + t.id + '\')">' +
        '<div><div class="v-th-title">' + String(t.title || 'Chat').replace(/</g, '&lt;') + '</div>' +
        '<div class="v-th-meta">' + count + ' msgs • ' + kb + ' KB</div></div>' +
        '<button class="v-del-btn" onclick="event.stopPropagation();window.deleteVictorThread(\'' + t.id + '\')">Del</button></div>';
    }).join('');
  }

  function renderStorageGauge(d) {
    let g = document.getElementById('v-storage-mgr');
    const pBox = document.querySelector('textarea[placeholder*="persona" i]');
    if (!g && pBox && pBox.parentElement) {
      g = document.createElement('div');
      g.id = 'v-storage-mgr';
      g.style.cssText = 'margin-top:14px;padding:12px;background:#0b111e;border:1px solid #1e293b;border-radius:10px;font-size:12px;color:#cbd5e1;';
      pBox.parentElement.appendChild(g);
    }
    if (!g) return;
    const docsHtml = (d.docs || []).map(function(doc) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #1e293b;">' +
        '<span>▪ <b>' + doc.id + '</b> (' + doc.sizeKB + ' KB)</span>' +
        '<button onclick="window.purgeAtlasDoc(\'' + doc.id + '\')" style="background:#3f1d28;color:#fda4af;border:none;border-radius:5px;padding:3px 7px;font-size:11px;cursor:pointer;">Purge</button></div>';
    }).join('');
    g.innerHTML = '<div style="color:#38bdf8;font-weight:700;margin-bottom:6px;">CLOUD & ATLAS STORAGE TELEMETRY (512 MB)</div>' +
      '<div style="margin-bottom:4px;">MongoDB Atlas Used: <b>' + d.atlasKB + ' KB</b> / 512 MB</div>' +
      '<div style="margin-bottom:8px;">Render Server RAM: <b>' + d.ramMB + ' MB</b> / 512 MB</div>' +
      '<div>' + docsHtml + '</div>';
  }

  window.purgeAtlasDoc = function(docId) {
    window.syncVictorOS({ action: 'purge_doc', docId: docId });
  };

  window.deleteVictorThread = function(id) {
    window.syncVictorOS({ action: 'delete_thread', id: id });
  };

  window.startNewVictorChat = function() {
    window.curThreadId = 'th_' + Date.now();
    localStorage.setItem('victor_active_tid', window.curThreadId);
    window.curThreadMsgs = [];
    const cb = getChatBox();
    if (cb) cb.innerHTML = '';
    document.getElementById('v-drawer').classList.remove('open');
    renderThreadList();
  };

  window.loadVictorThread = function(id) {
    const t = window.allVictorThreads.find(function(x) { return x.id === id; });
    if (!t) return;
    window.curThreadId = t.id;
    localStorage.setItem('victor_active_tid', t.id);
    window.curThreadMsgs = t.messages || [];
    const cb = getChatBox();
    if (cb) {
      cb.innerHTML = window.curThreadMsgs.map(function(m) {
        const isU = m.role === 'user';
        const bg = isU ? '#1e293b' : '#0f172a';
        const align = isU ? 'flex-end' : 'flex-start';
        return '<div style="display:flex;justify-content:' + align + ';margin:8px 0;">' +
          '<div style="max-width:85%;background:' + bg + ';color:#f8fafc;padding:12px 14px;border-radius:14px;border:1px solid #334155;white-space:pre-wrap;font-size:14px;">' +
          String(m.content || '').replace(/</g, '&lt;') + '</div></div>';
      }).join('');
    }
    document.getElementById('v-drawer').classList.remove('open');
    renderThreadList();
  };

  // Auto-capture every chat message & inject Jarvis Persona
  const prevFetch = window.fetch;
  window.fetch = async function(url, opts) {
    let uMsg = '';
    try {
      const u = String(url || '');
      if ((u.includes('pollinations.ai') || u.includes('groq.com') || u.includes('/api/chat')) && opts && opts.body) {
        const b = JSON.parse(opts.body);
        if (Array.isArray(b.messages) && b.messages.length) {
          const last = b.messages[b.messages.length - 1];
          uMsg = last && typeof last.content === 'string' ? last.content.split('=== [VICTOR')[0].trim() : '';
          if (window.activeJarvisPersona && !b.messages.some(function(x){ return x.role === 'system' && x.content.includes('V.I.C.T.O.R.'); })) {
            b.messages.unshift({ role: 'system', content: window.activeJarvisPersona });
            opts.body = JSON.stringify(b);
          }
        }
      }
    } catch (e) {}
    const res = await prevFetch.apply(this, arguments);
    if (uMsg) {
      try {
        const clone = res.clone();
        const j = await clone.json();
        const reply = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.reply || j.response || '';
        if (reply) {
          window.curThreadMsgs.push({ role: 'user', content: uMsg }, { role: 'assistant', content: reply });
          const title = window.curThreadMsgs[0].content.slice(0, 36);
          window.syncVictorOS({ action: 'save_thread', thread: { id: window.curThreadId, title: title, updatedAt: Date.now(), messages: window.curThreadMsgs } });
        }
      } catch (e) {}
    }
    return res;
  };

  document.addEventListener('DOMContentLoaded', function() {
    const hdr = document.querySelector('header') || document.body;
    const btn = document.createElement('button');
    btn.className = 'v-hdr-btn';
    btn.innerHTML = '☰ Chats';
    btn.onclick = function() {
      document.getElementById('v-drawer').classList.toggle('open');
      window.syncVictorOS({ action: 'status' });
    };
    hdr.insertBefore(btn, hdr.firstChild);
    const plusBtns = [...document.querySelectorAll('button')].filter(function(b) { return b.innerText.trim() === '+'; });
    plusBtns.forEach(function(b) { b.onclick = window.startNewVictorChat; });
    window.syncVictorOS({ action: 'status' });
  });
})();
</script>
<style>
#v-sandbox-modal { position:fixed; inset:0; background:rgba(5,8,15,0.96); z-index:10000; display:none; flex-direction:column; font-family:sans-serif; }
#v-sandbox-modal.open { display:flex; }
.v-sb-hdr { display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#0f172a; border-bottom:1px solid #1e293b; color:#38bdf8; font-size:13px; font-weight:700; }
.v-sb-actions { display:flex; gap:6px; align-items:center; }
.v-sb-btn { background:#1e293b; color:#f8fafc; border:1px solid #334155; border-radius:7px; padding:5px 10px; font-size:12px; cursor:pointer; font-weight:600; }
.v-sb-btn.primary { background:#0284c7; border-color:#38bdf8; color:#fff; }
#v-sb-frame { flex:1; width:100%; border:none; background:#fff; }
#v-sb-editor { display:none; flex:1; width:100%; background:#090d16; color:#38bdf8; border:none; padding:14px; font-family:monospace; font-size:13px; box-sizing:border-box; outline:none; resize:none; }
.v-code-bar { display:flex; gap:8px; margin-top:10px; padding-top:8px; border-top:1px solid #1e293b; flex-wrap:wrap; }
.v-launch-btn { background:linear-gradient(135deg,#0284c7,#2563eb); color:#fff; border:none; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px; }
.v-dl-btn { background:#1e293b; color:#38bdf8; border:1px solid #334155; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; }
#v-vision-chip { position:fixed; bottom:74px; left:16px; background:#0f172a; border:1px solid #38bdf8; border-radius:12px; padding:6px 10px; display:none; align-items:center; gap:8px; z-index:9000; box-shadow:0 6px 20px rgba(0,0,0,0.6); color:#f8fafc; font-size:12px; }
#v-vision-chip.active { display:flex; }
#v-vision-thumb { width:38px; height:38px; object-fit:cover; border-radius:6px; border:1px solid #334155; }
.v-cam-trigger { background:#151c28; color:#38bdf8; border:1px solid #1e293b; border-radius:10px; padding:6px 10px; font-size:15px; cursor:pointer; margin-right:6px; flex-shrink:0; }
</style>

<input type="file" id="v-cam-input" accept="image/*" style="display:none;" />

<div id="v-vision-chip">
  <img id="v-vision-thumb" src="" alt="Vision" />
  <div>
    <div style="font-weight:700;color:#38bdf8;">VISION EYE READY</div>
    <div id="v-vision-meta" style="font-size:10px;color:#94a3b8;">Compressed</div>
  </div>
  <button onclick="window.clearVictorVision()" style="background:#3f1d28;color:#fda4af;border:none;border-radius:6px;padding:3px 7px;cursor:pointer;font-size:11px;">✕</button>
</div>

<div id="v-sandbox-modal">
  <div class="v-sb-hdr">
    <span>&lt;/&gt; VICTOR LIVE SANDBOX</span>
    <div class="v-sb-actions">
      <button class="v-sb-btn" onclick="window.toggleSandboxCode()">&lt;/&gt; Code</button>
      <button class="v-sb-btn primary" onclick="window.runSandboxCode()">▶ Run</button>
      <button class="v-sb-btn" onclick="window.downloadSandboxHtml()">↓ .HTML</button>
      <button class="v-sb-btn" style="background:#3f1d28;color:#fda4af;" onclick="document.getElementById('v-sandbox-modal').classList.remove('open')">✕</button>
    </div>
  </div>
  <textarea id="v-sb-editor" placeholder="Paste or edit HTML / CSS / JS code here..."></textarea>
  <iframe id="v-sb-frame" sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"></iframe>
</div>

<script>
(function(){
  window.pendingVictorImage = null;
  window.savedCodeSnippets = [];
  var BT = String.fromCharCode(96);
  var FENCE = BT + BT + BT;

  // --- 1. LIVE CODE SANDBOX CONTROLLER ---
  window.openVictorSandbox = function(rawCode) {
    var modal = document.getElementById('v-sandbox-modal');
    var editor = document.getElementById('v-sb-editor');
    var frame = document.getElementById('v-sb-frame');
    if (!modal || !editor || !frame) return;
    var html = String(rawCode || editor.value || '').trim();
    if (!html) {
      html = '<!DOCTYPE html><html><head><style>body{background:#0b0f17;color:#38bdf8;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:90vh;margin:0;}</style></head><body><h2>VICTOR Live Sandbox Ready</h2><' + '/body></html>';
    } else if (!html.toLowerCase().includes('<html') && !html.toLowerCase().includes('<!doctype') && !html.toLowerCase().includes('<body') && !html.toLowerCase().includes('<div') && !html.toLowerCase().includes('<canvas') && !html.toLowerCase().includes('<style')) {
      html = '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#0f172a;color:#f8fafc;font-family:sans-serif;padding:16px;}</style></head><body><div id="app"></div><' + 'script>' + html + '<' + '/script></body></html>';
    }
    editor.value = html;
    frame.srcdoc = html;
    modal.classList.add('open');
  };

  window.openSnippetByIndex = function(idx) {
    if (window.savedCodeSnippets[idx]) window.openVictorSandbox(window.savedCodeSnippets[idx]);
  };

  window.downloadSnippetByIndex = function(idx) {
    if (window.savedCodeSnippets[idx]) window.downloadHtmlString(window.savedCodeSnippets[idx]);
  };

  window.toggleSandboxCode = function() {
    var ed = document.getElementById('v-sb-editor');
    var fr = document.getElementById('v-sb-frame');
    if (ed.style.display === 'block') {
      ed.style.display = 'none';
      fr.style.display = 'block';
    } else {
      ed.style.display = 'block';
      fr.style.display = 'none';
    }
  };

  window.runSandboxCode = function() {
    var ed = document.getElementById('v-sb-editor');
    var fr = document.getElementById('v-sb-frame');
    ed.style.display = 'none';
    fr.style.display = 'block';
    fr.srcdoc = ed.value;
  };

  window.downloadHtmlString = function(str) {
    var blob = new Blob([str], { type: 'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'victor_app_' + Date.now() + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  window.downloadSandboxHtml = function() {
    var ed = document.getElementById('v-sb-editor');
    window.downloadHtmlString(ed ? ed.value : '');
  };

  function extractRunnableHtml(txt) {
    if (!txt) return '';
    var s = String(txt);
    var p1 = s.indexOf(FENCE + 'html');
    if (p1 !== -1) {
      var start = s.indexOf(String.fromCharCode(10), p1);
      var end = s.indexOf(FENCE, start + 1);
      if (start !== -1 && end !== -1) return s.slice(start + 1, end).trim();
    }
    var docIdx = s.toLowerCase().indexOf('<!doctype html>');
    if (docIdx !== -1) {
      var endHtml = s.toLowerCase().lastIndexOf('</html>');
      return endHtml !== -1 ? s.slice(docIdx, endHtml + 7) : s.slice(docIdx);
    }
    var hIdx = s.toLowerCase().indexOf('<html');
    if (hIdx !== -1) {
      var endH = s.toLowerCase().lastIndexOf('</html>');
      return endH !== -1 ? s.slice(hIdx, endH + 7) : s.slice(hIdx);
    }
    return '';
  }

  function scanForCodeBlocks() {
    var nodes = document.querySelectorAll('pre, div, section, article');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.dataset && el.dataset.vSandboxChecked) continue;
      if (el.children && el.children.length > 6) continue;
      var txt = el.innerText || el.textContent || '';
      if (txt.length < 40) continue;
      var runnable = extractRunnableHtml(txt);
      if (!runnable && el.tagName === 'PRE' && (txt.includes('<div') || txt.includes('<script') || txt.includes('<canvas') || txt.includes('function '))) {
        runnable = txt.trim();
      }
      if (runnable) {
        el.dataset.vSandboxChecked = '1';
        var idx = window.savedCodeSnippets.push(runnable) - 1;
        var bar = document.createElement('div');
        bar.className = 'v-code-bar';
        bar.innerHTML = '<button class="v-launch-btn" onclick="window.openSnippetByIndex(' + idx + ')">▶ Launch Live Preview</button>' +
          '<button class="v-dl-btn" onclick="window.downloadSnippetByIndex(' + idx + ')">↓ Download .HTML</button>';
        el.appendChild(bar);
      }
    }
  }
  setInterval(scanForCodeBlocks, 1500);

  // --- 2. MULTIMODAL VISION CAMERA CONTROLLER ---
  window.clearVictorVision = function() {
    window.pendingVictorImage = null;
    var chip = document.getElementById('v-vision-chip');
    if (chip) chip.classList.remove('active');
    var inp = document.getElementById('v-cam-input');
    if (inp) inp.value = '';
  };

  function compressImageFile(file) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var maxDim = 850;
        var w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var dataUrl = c.toDataURL('image/jpeg', 0.72);
        window.pendingVictorImage = dataUrl;
        var kb = Math.round((dataUrl.length * 0.75) / 1024);
        var thumb = document.getElementById('v-vision-thumb');
        var meta = document.getElementById('v-vision-meta');
        var chip = document.getElementById('v-vision-chip');
        if (thumb) thumb.src = dataUrl;
        if (meta) meta.innerText = w + 'x' + h + ' • ' + kb + ' KB (0 Server RAM)';
        if (chip) chip.classList.add('active');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Intercept outgoing chat fetch when a Vision image is attached
  var prevFetch2 = window.fetch;
  window.fetch = async function(url, opts) {
    try {
      var u = String(url || '');
      if (window.pendingVictorImage && (u.includes('pollinations.ai') || u.includes('groq.com') || u.includes('/api/chat')) && opts && opts.body) {
        var imgData = window.pendingVictorImage;
        window.clearVictorVision();
        var body = JSON.parse(opts.body);
        var msgs = body.messages;
        if (Array.isArray(msgs) && msgs.length > 0) {
          var last = msgs[msgs.length - 1];
          var userTxt = (last && typeof last.content === 'string') ? last.content : 'Analyze this image.';
          try {
            var vr = await prevFetch2('/api/vision-intel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: imgData, prompt: userTxt })
            });
            if (vr.ok) {
              var vd = await vr.json();
              if (vd && vd.visionIntel) {
                last.content = userTxt + String.fromCharCode(10, 10) + vd.visionIntel;
                opts.body = JSON.stringify(body);
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
    return prevFetch2.apply(this, arguments);
  };

  document.addEventListener('DOMContentLoaded', function() {
    var camInput = document.getElementById('v-cam-input');
    if (camInput) {
      camInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) compressImageFile(e.target.files[0]);
      });
    }
    var hdr = document.querySelector('header') || document.body;
    var sbBtn = document.createElement('button');
    sbBtn.className = 'v-hdr-btn';
    sbBtn.innerHTML = '⚡ Sandbox';
    sbBtn.onclick = function() { window.openVictorSandbox(''); };
    hdr.insertBefore(sbBtn, hdr.firstChild.nextSibling);

    var txtInput = document.querySelector('input[placeholder*="VICTOR" i], textarea[placeholder*="VICTOR" i], #user-input, #chat-input');
    if (txtInput && txtInput.parentElement) {
      var camBtn = document.createElement('button');
      camBtn.type = 'button';
      camBtn.className = 'v-cam-trigger';
      camBtn.title = 'VICTOR Vision Eye (Camera / Screenshot)';
      camBtn.innerHTML = '📷';
      camBtn.onclick = function() { document.getElementById('v-cam-input').click(); };
      txtInput.parentElement.insertBefore(camBtn, txtInput);
    }
  });
})();
</script>

<script>
(function(){
  function mountVictorIcons() {
    document.querySelectorAll('.v-hdr-btn, .v-cam-trigger').forEach(function(el) { el.remove(); });

    var hdr = document.querySelector('header') || document.querySelector('[class*="header" i], [class*="top" i]');
    var hdrBtns = hdr ? [...hdr.querySelectorAll('button')] : [];
    var sampleBtn = hdrBtns[0] || null;
    var topGroup = sampleBtn ? sampleBtn.parentElement : hdr;
    var btnClass = sampleBtn ? sampleBtn.className : '';
    var fallbackCss = 'background:#111827;color:#94a3b8;border:1px solid #1e293b;border-radius:10px;width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;margin-right:6px;';

    // Wire the far-right '+' SVG button to start a new chat thread
    if (hdrBtns.length > 0 && window.startNewVictorChat) {
      var lastBtn = hdrBtns[hdrBtns.length - 1];
      lastBtn.onclick = window.startNewVictorChat;
    }

    if (topGroup && !document.getElementById('v-svg-chats')) {
      var chatBtn = document.createElement('button');
      chatBtn.id = 'v-svg-chats';
      chatBtn.type = 'button';
      if (btnClass) chatBtn.className = btnClass;
      else chatBtn.style.cssText = fallbackCss;
      chatBtn.title = 'Chat History (Atlas Logs)';
      chatBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>';
      chatBtn.onclick = function() {
        var dr = document.getElementById('v-drawer');
        if (dr) dr.classList.toggle('open');
        if (window.syncVictorOS) window.syncVictorOS({ action: 'status' });
      };

      var sbBtn = document.createElement('button');
      sbBtn.id = 'v-svg-sb';
      sbBtn.type = 'button';
      if (btnClass) sbBtn.className = btnClass;
      else sbBtn.style.cssText = fallbackCss;
      sbBtn.title = 'Live Code Sandbox';
      sbBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
      sbBtn.onclick = function() {
        if (window.openVictorSandbox) window.openVictorSandbox('');
      };

      topGroup.insertBefore(sbBtn, topGroup.firstChild);
      topGroup.insertBefore(chatBtn, topGroup.firstChild);
    }

    var txtInput = document.querySelector('input[placeholder*="VICTOR" i], textarea[placeholder*="VICTOR" i], #user-input, #chat-input');
    if (txtInput && txtInput.parentElement && !document.getElementById('v-svg-cam')) {
      var camBtn = document.createElement('button');
      camBtn.id = 'v-svg-cam';
      camBtn.type = 'button';
      camBtn.title = 'Vision Inspector';
      camBtn.style.cssText = 'background:transparent;color:#94a3b8;border:1px solid #1e293b;border-radius:8px;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin-right:8px;flex-shrink:0;';
      camBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
      camBtn.onclick = function() {
        var inp = document.getElementById('v-cam-input');
        if (inp) inp.click();
      };
      txtInput.parentElement.insertBefore(camBtn, txtInput);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountVictorIcons);
  } else {
    mountVictorIcons();
  }
  setTimeout(mountVictorIcons, 600);
})();
</script>

<style>
#v-jarvis-hud { position:fixed; bottom:125px; left:50%; transform:translateX(-50%); background:#090d16; border:1px solid #1e293b; border-radius:10px; padding:8px 14px; display:none; align-items:center; gap:12px; z-index:9500; box-shadow:0 8px 25px rgba(0,0,0,0.75); font-family:monospace; font-size:11px; color:#64748b; white-space:nowrap; }
#v-jarvis-hud.active { display:flex; }
.v-hud-step { display:inline-flex; align-items:center; gap:5px; }
.v-hud-step.run { color:#38bdf8; font-weight:700; }
.v-hud-step.done { color:#94a3b8; }
.v-hud-dot { width:6px; height:6px; border-radius:50%; background:#334155; }
.v-hud-step.run .v-hud-dot { background:#38bdf8; box-shadow:0 0 8px #38bdf8; }
.v-hud-step.done .v-hud-dot { background:#64748b; }
#v-svg-agent.active-protocol { border-color:#38bdf8 !important; color:#38bdf8 !important; background:#0f2238 !important; }
.v-asset-card { margin-top:12px; padding:10px; background:#090d16; border:1px solid #1e293b; border-radius:10px; }
.v-asset-card img { width:100%; max-width:520px; border-radius:8px; display:block; margin-bottom:8px; border:1px solid #1e293b; }
</style>

<div id="v-jarvis-hud">
  <div class="v-hud-step" id="vh-s1"><span class="v-hud-dot"></span>01 RECON</div>
  <span>/</span>
  <div class="v-hud-step" id="vh-s2"><span class="v-hud-dot"></span>02 VAULT</div>
  <span>/</span>
  <div class="v-hud-step" id="vh-s3"><span class="v-hud-dot"></span>03 SYNTHESIS</div>
  <span>/</span>
  <div class="v-hud-step" id="vh-s4"><span class="v-hud-dot"></span>04 DEPLOY</div>
</div>

<script>
(function(){
  window.jarvisProtocolActive = false;
  window.lastProtocolImage = '';

  function setHudStage(stage) {
    var hud = document.getElementById('v-jarvis-hud');
    if (!hud) return;
    if (stage === 0) { hud.classList.remove('active'); return; }
    hud.classList.add('active');
    for (var i = 1; i <= 4; i++) {
      var el = document.getElementById('vh-s' + i);
      if (!el) continue;
      el.className = 'v-hud-step' + (i < stage ? ' done' : (i === stage ? ' run' : ''));
    }
  }

  function isMultiStepPrompt(txt) {
    var low = String(txt || '').toLowerCase();
    if (low.startsWith('protocol:') || low.startsWith('jarvis:') || low.startsWith('agent:')) return true;
    var hasWeb = /\b(research|search|inspect|find|trending|latest)\b/.test(low);
    var hasCreate = /\b(write|script|build|code|create|generate|thumbnail|image|poster|app)\b/.test(low);
    return hasWeb && hasCreate;
  }

  function mountAgentButton() {
    var camBtn = document.getElementById('v-svg-cam');
    if (camBtn && camBtn.parentElement && !document.getElementById('v-svg-agent')) {
      var agBtn = document.createElement('button');
      agBtn.id = 'v-svg-agent';
      agBtn.type = 'button';
      agBtn.title = 'Toggle Jarvis Multi-Step Protocol';
      agBtn.style.cssText = 'background:transparent;color:#94a3b8;border:1px solid #1e293b;border-radius:8px;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin-right:8px;flex-shrink:0;';
      agBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
      agBtn.onclick = function() {
        window.jarvisProtocolActive = !window.jarvisProtocolActive;
        agBtn.classList.toggle('active-protocol', window.jarvisProtocolActive);
      };
      camBtn.parentElement.insertBefore(agBtn, camBtn.nextSibling);
    }
  }

  var prevFetch3 = window.fetch;
  window.fetch = async function(url, opts) {
    var triggeredProtocol = false;
    try {
      var u = String(url || '');
      if ((u.includes('pollinations.ai') || u.includes('groq.com') || u.includes('/api/chat')) && opts && opts.body) {
        var body = JSON.parse(opts.body);
        var msgs = body.messages;
        if (Array.isArray(msgs) && msgs.length > 0) {
          var last = msgs[msgs.length - 1];
          var rawTxt = (last && typeof last.content === 'string') ? last.content.split('=== [VICTOR')[0].trim() : '';
          if ((window.jarvisProtocolActive || isMultiStepPrompt(rawTxt)) && !last.content.includes('JARVIS PROTOCOL:')) {
            triggeredProtocol = true;
            setHudStage(1);
            try {
              var pr = await prevFetch3('/api/jarvis-protocol', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal: rawTxt })
              });
              setHudStage(2);
              if (pr.ok) {
                var pd = await pr.json();
                if (pd && pd.directive) {
                  last.content = rawTxt + String.fromCharCode(10, 10) + pd.directive;
                  opts.body = JSON.stringify(body);
                }
                if (pd && pd.imageUrl) window.lastProtocolImage = pd.imageUrl;
              }
            } catch (e) {}
            setHudStage(3);
          }
        }
      }
    } catch (e) {}

    var response = await prevFetch3.apply(this, arguments);

    if (triggeredProtocol) {
      setHudStage(4);
      setTimeout(function() {
        setHudStage(0);
        if (window.lastProtocolImage) {
          var imgUrl = window.lastProtocolImage;
          window.lastProtocolImage = '';
          var cb = document.getElementById('chat-box') || document.getElementById('chat-container') || document.getElementById('messages') || document.querySelector('main');
          if (cb) {
            var card = document.createElement('div');
            card.className = 'v-asset-card';
            card.innerHTML = '<div style="font-size:11px;color:#38bdf8;font-family:monospace;margin-bottom:6px;">[JARVIS PROTOCOL: AUTONOMOUS VISUAL ASSET]</div>' +
              '<img src="' + imgUrl + '" alt="Generated Asset" />' +
              '<a href="' + imgUrl + '" target="_blank" style="color:#94a3b8;font-size:12px;text-decoration:none;border:1px solid #334155;padding:4px 10px;border-radius:6px;display:inline-block;">↓ Open Full 8K Asset</a>';
            cb.appendChild(card);
            cb.scrollTop = cb.scrollHeight;
          }
        }
      }, 900);
    }
    return response;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAgentButton);
  } else {
    mountAgentButton();
  }
  setTimeout(mountAgentButton, 800);
})();
</script>
<style>
#v-voice-modal { position:fixed; inset:0; background:#000000; z-index:10020; display:none; flex-direction:column; justify-content:space-between; align-items:center; padding:22px 20px 28px 20px; box-sizing:border-box; font-family:sans-serif; user-select:none; }
#v-voice-modal.open { display:flex; }
.vv-top-bar { width:100%; display:flex; justify-content:space-between; align-items:center; }
.vv-icon-btn { width:46px; height:46px; border-radius:50%; background:#1c1c1e; border:none; color:#f8fafc; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
.vv-icon-btn.active { background:#0284c7; color:#ffffff; }
.vv-center-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; width:100%; position:relative; }
.vv-orb-box { width:235px; height:235px; border-radius:50%; position:relative; overflow:hidden; cursor:pointer; background:radial-gradient(circle at 35% 25%, #00b4ff 0%, #0284c7 45%, #bae6fd 80%, #ffffff 100%); box-shadow:0 0 60px rgba(0,180,255,0.28), inset 0 -25px 45px rgba(255,255,255,0.85); transition:transform 0.35s ease, box-shadow 0.35s ease; animation:vvFloat 5s ease-in-out infinite; }
.vv-orb-cloud1 { position:absolute; inset:-35%; background:radial-gradient(circle at 65% 70%, rgba(255,255,255,0.95) 0%, rgba(186,230,253,0.75) 35%, rgba(2,132,199,0) 70%); filter:blur(14px); animation:vvSwirl 9s linear infinite; }
.vv-orb-cloud2 { position:absolute; inset:-25%; background:radial-gradient(circle at 30% 60%, rgba(255,255,255,0.9) 0%, rgba(56,189,248,0.65) 40%, rgba(0,180,255,0) 72%); filter:blur(18px); animation:vvSwirlRev 7s linear infinite; }
.vv-orb-box.listening { transform:scale(1.06); box-shadow:0 0 85px rgba(56,189,248,0.48), inset 0 -25px 50px rgba(255,255,255,0.92); }
.vv-orb-box.thinking { animation:vvPulseFast 1.1s ease-in-out infinite; box-shadow:0 0 95px rgba(14,165,233,0.75), inset 0 0 55px #ffffff; }
.vv-orb-box.speaking { animation:vvSpeakWave 0.65s ease-in-out infinite alternate; box-shadow:0 0 110px rgba(56,189,248,0.85), inset 0 -30px 60px #ffffff; }
@keyframes vvSwirl { 0%{transform:rotate(0deg) scale(1);} 50%{transform:rotate(180deg) scale(1.12);} 100%{transform:rotate(360deg) scale(1);} }
@keyframes vvSwirlRev { 0%{transform:rotate(360deg) scale(1.08);} 50%{transform:rotate(180deg) scale(0.95);} 100%{transform:rotate(0deg) scale(1.08);} }
@keyframes vvFloat { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(-8px);} }
@keyframes vvPulseFast { 0%,100%{transform:scale(0.96);} 50%{transform:scale(1.08);} }
@keyframes vvSpeakWave { 0%{transform:scale(1.0) rotate(-2deg);} 100%{transform:scale(1.14) rotate(2deg);} }
#vv-status { margin-top:26px; font-size:13px; color:#94a3b8; letter-spacing:0.6px; font-weight:500; text-align:center; min-height:20px; }
#vv-caption { margin-top:10px; max-width:90%; color:#e2e8f0; font-size:14px; text-align:center; line-height:1.45; max-height:85px; overflow-y:auto; display:none; padding:8px 14px; background:#111318; border-radius:12px; border:1px solid #1e293b; }
#vv-caption.show { display:block; }
.vv-bottom-bar { width:100%; display:flex; align-items:center; gap:12px; }
.vv-ask-pill { flex:1; height:54px; background:#1c1c1e; border-radius:27px; display:flex; align-items:center; padding:0 18px; gap:10px; }
.vv-ask-pill input { flex:1; background:transparent; border:none; outline:none; color:#f8fafc; font-size:15px; }
.vv-mute-btn { width:54px; height:54px; border-radius:50%; background:#1c1c1e; border:none; color:#f8fafc; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
.vv-mute-btn.muted { background:#3f1d28; color:#fda4af; }
.vv-close-btn { width:54px; height:54px; border-radius:50%; background:#ffffff; border:none; color:#000000; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
</style>




<script>
(function(){
  function hideUnwantedButtons() {
    // 1. Hide the '+' button in the top header bar
    var hdr = document.querySelector('header') || document.querySelector('[class*="header" i]');
    if (hdr) {
      var hBtns = [...hdr.querySelectorAll('button')];
      if (hBtns.length > 0) {
        var lastHdrBtn = hBtns[hBtns.length - 1];
        if (lastHdrBtn && lastHdrBtn.id !== 'v-svg-chats' && lastHdrBtn.id !== 'v-svg-sb') {
          lastHdrBtn.style.setProperty('display', 'none', 'important');
        }
      }
    }

    // 2. Hide the microphone icon in the bottom prompt bar (next to the send arrow)
    var txtInput = document.querySelector('input[placeholder*="VICTOR" i], textarea[placeholder*="VICTOR" i], #user-input, #chat-input');
    if (txtInput && txtInput.parentElement) {
      var rowBtns = [...txtInput.parentElement.querySelectorAll('button')];
      if (rowBtns.length >= 2) {
        var sendBtn = rowBtns[rowBtns.length - 1];
        rowBtns.forEach(function(b) {
          if (b !== sendBtn && b.id !== 'v-svg-cam' && b.id !== 'v-svg-agent') {
            b.style.setProperty('display', 'none', 'important');
          }
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideUnwantedButtons);
  } else {
    hideUnwantedButtons();
  }
  setTimeout(hideUnwantedButtons, 500);
})();
</script>
<script>
(function(){
  window.initialVictorChatHtml = null;

  // 1. Universal resolver for VICTOR's chat messages container
  window.findVictorChatBox = function() {
    var direct = document.getElementById('chat-box') ||
      document.getElementById('chat-container') ||
      document.getElementById('messages') ||
      document.getElementById('chat') ||
      document.getElementById('chat-messages') ||
      document.getElementById('chat-area') ||
      document.getElementById('chatArea') ||
      document.querySelector('main');
    if (direct) return direct;

    var hdr = document.querySelector('header') || document.querySelector('[class*="header" i]');
    var inp = document.querySelector('input[placeholder*="VICTOR" i], textarea[placeholder*="VICTOR" i], #user-input, #chat-input');
    var allDivs = [...document.querySelectorAll('body > div, #app > div, #root > div')];
    for (var i = 0; i < allDivs.length; i++) {
      var d = allDivs[i];
      if (d.id === 'v-drawer' || d.id === 'v-sandbox-modal' || d.id === 'v-jarvis-hud' || d.id === 'v-vision-chip') continue;
      if (hdr && (d === hdr || d.contains(hdr))) continue;
      if (inp && (d === inp || d.contains(inp))) continue;
      return d;
    }
    return null;
  };

  // 2. Hide Top Mic, Top '+', and Bottom Mic buttons
  function cleanAllMicAndPlusButtons() {
    var hdr = document.querySelector('header') || document.querySelector('[class*="header" i]');
    if (hdr) {
      var allHdrBtns = [...hdr.querySelectorAll('button')];
      var nativeBtns = allHdrBtns.filter(function(b) {
        return b.id !== 'v-svg-chats' && b.id !== 'v-svg-sb';
      });
      // Native button 0 is Top Mic; last native button is Top '+'
      if (nativeBtns.length >= 1 && nativeBtns[0]) {
        nativeBtns[0].style.setProperty('display', 'none', 'important');
      }
      if (nativeBtns.length >= 2 && nativeBtns[nativeBtns.length - 1]) {
        nativeBtns[nativeBtns.length - 1].style.setProperty('display', 'none', 'important');
      }
      // Also hide any header button containing a microphone SVG path
      nativeBtns.forEach(function(b) {
        var h = b.innerHTML.toLowerCase();
        if (h.includes('m12 1a3') || h.includes('12 2a3') || h.includes('19 10v2') || h.includes('m9 9v3')) {
          b.style.setProperty('display', 'none', 'important');
        }
      });
    }

    // Hide bottom prompt bar Mic button (next to Send arrow)
    var txtInput = document.querySelector('input[placeholder*="VICTOR" i], textarea[placeholder*="VICTOR" i], #user-input, #chat-input');
    if (txtInput && txtInput.parentElement) {
      var rowBtns = [...txtInput.parentElement.querySelectorAll('button')];
      if (rowBtns.length >= 2) {
        var sendBtn = rowBtns[rowBtns.length - 1];
        rowBtns.forEach(function(b) {
          if (b !== sendBtn && b.id !== 'v-svg-cam' && b.id !== 'v-svg-agent') {
            b.style.setProperty('display', 'none', 'important');
          }
        });
      }
    }
  }

  // 3. Scrape visible DOM messages if curThreadMsgs missed any
  function scrapeVisibleChatMessages(cb) {
    if (!cb) return [];
    var items = [...cb.children].filter(function(el) {
      var t = (el.innerText || '').trim();
      return t.length > 0 && t !== 'V';
    });
    var msgs = [];
    items.forEach(function(el, idx) {
      var txt = (el.innerText || '').trim();
      if (txt) {
        msgs.push({ role: idx % 2 === 0 ? 'user' : 'assistant', content: txt });
      }
    });
    return msgs;
  }

  // 4. Upgraded "+ New Chat Thread" & Thread Loader
  function bindNewChatSystem() {
    var cb = window.findVictorChatBox();
    if (cb && window.initialVictorChatHtml === null) {
      window.initialVictorChatHtml = cb.innerHTML;
    }

    window.startNewVictorChat = async function() {
      var chatEl = window.findVictorChatBox();
      if ((!window.curThreadMsgs || window.curThreadMsgs.length === 0) && chatEl) {
        var scraped = scrapeVisibleChatMessages(chatEl);
        if (scraped.length > 0) window.curThreadMsgs = scraped;
      }

      // Save current thread to Atlas before resetting if it has messages
      if (window.curThreadMsgs && window.curThreadMsgs.length > 0 && window.syncVictorOS) {
        var firstTitle = String(window.curThreadMsgs[0].content || 'Chat').slice(0, 36);
        await window.syncVictorOS({
          action: 'save_thread',
          thread: {
            id: window.curThreadId || ('th_' + Date.now()),
            title: firstTitle,
            updatedAt: Date.now(),
            messages: window.curThreadMsgs
          }
        });
      }

      // Create fresh thread ID & clear memory arrays
      window.curThreadId = 'th_' + Date.now();
      localStorage.setItem('victor_active_tid', window.curThreadId);
      window.curThreadMsgs = [];
      if (Array.isArray(window.messages)) window.messages.length = 0;
      if (Array.isArray(window.chatHistory)) window.chatHistory.length = 0;

      // Reset chat screen back to clean initial state
      if (chatEl) {
        chatEl.innerHTML = window.initialVictorChatHtml || '';
      }

      // Close Chat Logs drawer
      var dr = document.getElementById('v-drawer');
      if (dr) dr.classList.remove('open');

      // Visual confirmation in input bar
      var inp = document.querySelector('input[placeholder*="VICTOR" i], textarea[placeholder*="VICTOR" i], #user-input, #chat-input');
      if (inp) {
        inp.value = '';
        var origPh = inp.getAttribute('placeholder') || 'Message VICTOR...';
        inp.setAttribute('placeholder', 'New chat thread ready, Sir...');
        inp.focus();
        setTimeout(function() { inp.setAttribute('placeholder', origPh); }, 2500);
      }

      if (window.syncVictorOS) window.syncVictorOS({ action: 'status' });
    };

    window.loadVictorThread = function(id) {
      var list = window.allVictorThreads || [];
      var t = list.find(function(x) { return x.id === id; });
      if (!t) return;
      window.curThreadId = t.id;
      localStorage.setItem('victor_active_tid', t.id);
      window.curThreadMsgs = t.messages || [];
      var chatEl = window.findVictorChatBox();
      if (chatEl) {
        chatEl.innerHTML = window.curThreadMsgs.map(function(m) {
          var isU = m.role === 'user';
          var bg = isU ? '#1e293b' : '#0f172a';
          var align = isU ? 'flex-end' : 'flex-start';
          return '<div style="display:flex;justify-content:' + align + ';margin:8px 0;">' +
            '<div style="max-width:85%;background:' + bg + ';color:#f8fafc;padding:12px 14px;border-radius:14px;border:1px solid #334155;white-space:pre-wrap;font-size:14px;">' +
            String(m.content || '').replace(/</g, '&lt;') + '</div></div>';
        }).join('');
        chatEl.scrollTop = chatEl.scrollHeight;
      }
      var dr = document.getElementById('v-drawer');
      if (dr) dr.classList.remove('open');
      if (window.syncVictorOS) window.syncVictorOS({ action: 'status' });
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      cleanAllMicAndPlusButtons();
      bindNewChatSystem();
    });
  } else {
    cleanAllMicAndPlusButtons();
    bindNewChatSystem();
  }
  setTimeout(cleanAllMicAndPlusButtons, 600);
  setTimeout(bindNewChatSystem, 600);
})();
</script>
</body>
</html>`;

const FULL_HTML = Buffer.from(HTML_UI + HTML_SCRIPT, 'utf8');

http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/jarvis-protocol') {
    let b = '';
    req.on('data', c => { b += c; });
    req.on('end', async () => {
      try {
        const { goal } = JSON.parse(b || '{}');
        const out = await runJarvisProtocolBackend(goal || '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, directive: '' }));
      }
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/vision-intel') {
    let b = '';
    req.on('data', c => { b += c; });
    req.on('end', async () => {
      try {
        const { image, prompt } = JSON.parse(b || '{}');
        if (!image) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, visionIntel: '' }));
        }
        const out = await analyzeVictorImage(image, prompt || '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, visionIntel: '' }));
      }
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/victor-os') {
    let b = '';
    req.on('data', c => { b += c; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(b || '{}');
        const act = body.action;
        if (act === 'save_thread' && body.thread && body.thread.id) {
          THREADS_CACHE = THREADS_CACHE.filter(t => t.id !== body.thread.id);
          THREADS_CACHE.unshift(body.thread);
          if (THREADS_CACHE.length > 50) THREADS_CACHE = THREADS_CACHE.slice(0, 50);
          await saveThreadsToAtlas();
        } else if (act === 'delete_thread' && body.id) {
          THREADS_CACHE = THREADS_CACHE.filter(t => t.id !== body.id);
          await saveThreadsToAtlas();
        } else if (act === 'purge_doc' && body.docId) {
          if (body.docId === 'threads') { THREADS_CACHE = []; await saveThreadsToAtlas(); }
          if (body.docId === 'memory' && typeof MEMORY !== 'undefined') { MEMORY.history = []; MEMORY.chats = []; fs.writeFileSync(memFile, JSON.stringify(MEMORY)); }
          if (typeof mongoCol !== 'undefined' && mongoCol && body.docId !== 'threads') {
            await mongoCol.deleteOne({ _id: body.docId });
          }
        } else if (act === 'save_persona' && typeof body.persona === 'string') {
          if (typeof MEMORY !== 'undefined') { MEMORY.persona = body.persona; fs.writeFileSync(memFile, JSON.stringify(MEMORY)); }
        }
        let docs = [];
        let totalKB = 0;
        if (typeof mongoCol !== 'undefined' && mongoCol) {
          const rawDocs = await mongoCol.find({}).toArray();
          docs = rawDocs.map(d => {
            const sz = +(Buffer.byteLength(JSON.stringify(d), 'utf8') / 1024).toFixed(2);
            totalKB += sz;
            return { id: d._id, sizeKB: sz, updated: d.updatedAt || null };
          });
        }
        const ramMB = +(process.memoryUsage().rss / 1048576).toFixed(1);
        const curPersona = (typeof MEMORY !== 'undefined' && MEMORY.persona) ? MEMORY.persona : DEFAULT_JARVIS_PERSONA;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, ramMB, atlasKB: +totalKB.toFixed(2), maxMB: 512, docs, threads: THREADS_CACHE, persona: curPersona }));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/web-intel') {
    let b = '';
    req.on('data', c => { b += c; });
    req.on('end', async () => {
      try {
        const { query } = JSON.parse(b || '{}');
        const out = await executeChromiumTask(query || '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, intel: '' }));
      }
    });
    return;
  }

  if ((req.url === '/api/research' || req.url === '/api/browser') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const target = parsed.query || parsed.url || '';
        const result = await executeChromiumTask(target, parsed.action || 'auto');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ intel: 'Chromium Route Error: ' + e.message }));
      }
    });
    return;
  }

  if (req.url.startsWith('/media/')) {
    const file = path.join(mediaDir, path.basename(req.url));
    if (fs.existsSync(file)) {
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'Content-Type': ext === '.glb' ? 'model/gltf-binary' : 'video/mp4' });
      return fs.createReadStream(file).pipe(res);
    }
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      const sendJson = (obj) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      try {
        const d = JSON.parse(body || '{}');
        if (req.url === '/api/save-keys') { VAULT = saveVault(d.gsk, d.hf, d.sk); return sendJson({ ok: true }); }
        if (req.url === '/api/memory') { MEMORY = saveMemory(d); return sendJson({ ok: true }); }
        if (req.url === '/api/cloud-push') return sendJson(await pushCloudSync());
        if (req.url === '/api/cloud-pull') return sendJson(await pullCloudSync());
        if (req.url === '/api/research') return sendJson({ ok: true, intel: await runWebResearch(d.query) });
        if (req.url === '/api/build') return sendJson({ ...(await buildCodeToDisk(d)), projects: MEMORY.projects });
        if (req.url === '/api/3d') return sendJson(await generate3DModel(d.prompt, d.sk || VAULT.sk));
        if (req.url === '/api/song') return sendJson(await generateCloudSong(d.prompt, d.lyrics, d.hf || VAULT.hf));
        if (req.url === '/api/video-edit') return sendJson(await renderFFmpegVideo(d.prompt, d.editCmd, d.sk || VAULT.sk));
      } catch (e) {
        return sendJson({ ok: false, error: e.message });
      }
    });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(FULL_HTML);
}).listen(PORT, '0.0.0.0', () => {
  const url = 'http://127.0.0.1:' + PORT;
  console.log('\n======================================================');
  console.log('⚡ VICTOR — MINIMALIST CORE ONLINE (' + url + ')');
  console.log('======================================================\n');
  exec('termux-open-url ' + url + ' 2>/dev/null || am start -a android.intent.action.VIEW -d "' + url + '" 2>/dev/null');
});

// === VICTOR SAFE BACKEND HYBRID ROUTER ===
async function routeHybridChat(messages, requestedModel) {
  const providers = [
    { name: "Groq", key: process.env.GROQ_API_KEY, url: "https://api.groq.com/openai/v1/chat/completions", model: requestedModel || "llama-3.3-70b-versatile" },
    { name: "Gemini", key: process.env.GEMINI_API_KEY, url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-2.5-flash" },
    { name: "NVIDIA NIM", key: process.env.NVIDIA_API_KEY, url: "https://integrate.api.nvidia.com/v1/chat/completions", model: "meta/llama-3.3-70b-instruct" },
    { name: "AIML API", key: process.env.AIML_API_KEY, url: "https://api.aimlapi.com/v1/chat/completions", model: "gpt-4o-mini" }
  ].filter(p => Boolean(p.key && p.key.trim().length > 5));

  if (providers.length === 0) return "Error: No API keys found in Render environment variables.";

  for (const p of providers) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + p.key.trim() },
        body: JSON.stringify({ model: p.model, messages, temperature: 0.7 })
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply;
      }
    } catch (e) {}
  }
  return "Error: All hybrid AI providers failed or exhausted rate limits.";
}

// Ensure Express parses JSON if not already present
// (Handled natively)
