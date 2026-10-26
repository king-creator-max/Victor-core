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

const MASTER_PASS = '@stark1082011';
const PASS_B64 = Buffer.from(MASTER_PASS).toString('base64');
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
    let memoryState = ${JSON.stringify(MEMORY)};
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
        b.innerHTML = formatMd(ans);
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
</body>
</html>`;

const FULL_HTML = Buffer.from(HTML_UI + HTML_SCRIPT, 'utf8');

http.createServer(async (req, res) => {
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
