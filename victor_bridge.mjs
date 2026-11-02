#!/usr/bin/env node
import fs from 'fs';
import os from 'os';
import path from 'path';

const cfgFile = path.join(os.homedir(), '.victor_cloud_config.json');
function getCloudUrl() {
  try {
    if (fs.existsSync(cfgFile)) {
      const c = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
      if (c.url) return c.url.replace(/\/+$/, '');
    }
  } catch (e) {}
  return process.env.VICTOR_CLOUD_URL || 'https://victor-core.onrender.com';
}

function setCloudUrl(url) {
  const clean = String(url || '').trim().replace(/\/+$/, '');
  fs.writeFileSync(cfgFile, JSON.stringify({ url: clean }, null, 2), 'utf8');
  console.log('\x1b[36m[VICTOR BRIDGE]\x1b[0m Cloud URL locked to: ' + clean);
}

export async function handleVictorCliBridge(args) {
  const cloudUrl = getCloudUrl();
  const cmd = args[0] || '';

  if (cmd === '--url' && args[1]) {
    setCloudUrl(args[1]);
    return true;
  }

  if (cmd === '--status') {
    console.log('\x1b[36m[VICTOR CLOUD TELEMETRY]\x1b[0m Connecting to ' + cloudUrl + '...');
    const r = await fetch(cloudUrl + '/api/cli-bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' })
    });
    const d = await r.json();
    console.log('--------------------------------------------');
    console.log('⚡ Render Server RAM : ' + (d.ramMB || 0) + ' MB / 512 MB');
    console.log('▪ MongoDB Atlas Used : ' + (d.atlasKB || 0) + ' KB / 512 MB');
    console.log('▪ Saved Chat Threads : ' + (d.threadCount || 0) + ' threads');
    console.log('--------------------------------------------');
    return true;
  }

  if (cmd === '--chats') {
    const r = await fetch(cloudUrl + '/api/cli-bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' })
    });
    const d = await r.json();
    const list = d.threads || [];
    console.log('\x1b[36m=== VICTOR ATLAS SAVED CHATS (' + list.length + ') ===\x1b[0m');
    list.forEach((t, i) => {
      const count = Array.isArray(t.messages) ? t.messages.length : 0;
      console.log((i + 1) + '. ' + t.title + ' (' + count + ' msgs) [id: ' + t.id + ']');
    });
    return true;
  }

  if (cmd === '--protocol' && args.length > 1) {
    const goal = args.slice(1).join(' ');
    console.log('\x1b[36m[JARVIS PROTOCOL]\x1b[0m Running 4-stage cloud recon on: ' + goal);
    const r = await fetch(cloudUrl + '/api/jarvis-protocol', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal })
    });
    const pd = await r.json();
    const ask = await fetch(cloudUrl + '/api/cli-bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cli_ask', prompt: goal + '\n\n' + (pd.directive || '') })
    });
    const ans = await ask.json();
    console.log('\n\x1b[32mVICTOR:\x1b[0m\n' + (ans.reply || 'Mission complete, Sir.'));
    if (pd.imageUrl) console.log('\n\x1b[36m[8K ASSET URL]:\x1b[0m ' + pd.imageUrl);
    return true;
  }

  if (cmd === '--cloud' && args.length > 1) {
    const prompt = args.slice(1).join(' ');
    console.log('\x1b[36m[VICTOR CLOUD SYNC]\x1b[0m Dispatching to Web Core...');
    const r = await fetch(cloudUrl + '/api/cli-bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cli_ask', prompt })
    });
    const d = await r.json();
    console.log('\n\x1b[32mVICTOR:\x1b[0m ' + (d.reply || 'No response') + '\n');
    console.log('\x1b[90m(Synced to Web UI Chat Drawer: ' + d.threadId + ')\x1b[0m');
    return true;
  }

  return false;
}

// Run standalone if invoked directly
if (import.meta.url === 'file://' + process.argv[1] || process.argv[1].endsWith('/victor')) {
  const args = process.argv.slice(2);
  handleVictorCliBridge(args).then(handled => {
    if (!handled && args.length > 0) {
      handleVictorCliBridge(['--cloud', ...args]);
    } else if (!handled) {
      console.log('VICTOR CLI <-> Web Bridge Commands:');
      console.log('  victor --status              Check Render RAM & 512MB Atlas Storage');
      console.log('  victor --chats               List saved Web UI chat threads');
      console.log('  victor --cloud "<prompt>"    Ask Cloud VICTOR & save to Web UI Drawer');
      console.log('  victor --protocol "<goal>"   Execute 4-stage Jarvis Protocol from CLI');
      console.log('  victor --url <render-url>    Set custom Render Web URL');
    }
  });
}
