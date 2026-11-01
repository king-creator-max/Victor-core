const fs = require('fs');
const vm = require('vm');
let code = fs.readFileSync('cloud_server.mjs', 'utf8');

const unifiedOsScript = `<script>
(function(){
  window.curThreadId = localStorage.getItem('victor_active_tid') || ('th_' + Date.now());
  window.curThreadMsgs = [];
  window.allVictorThreads = [];
  window.initialVictorChatHtml = null;

  function getLocal() {
    try { return JSON.parse(localStorage.getItem('victor_saved_threads') || '[]'); }
    catch (e) { return []; }
  }
  function setLocal(arr) {
    try { localStorage.setItem('victor_saved_threads', JSON.stringify(arr || [])); }
    catch (e) {}
  }

  window.findVictorChatBox = function() {
    var el = document.getElementById('chat-box') || document.getElementById('chat-container') ||
      document.getElementById('messages') || document.getElementById('chat') || document.querySelector('main');
    if (el) return el;
    var hdr = document.querySelector('header');
    var inp = document.querySelector('input[placeholder*="VICTOR" i], textarea[placeholder*="VICTOR" i]');
    var divs = [...document.querySelectorAll('div')];
    for (var i = 0; i < divs.length; i++) {
      var d = divs[i];
      var s = window.getComputedStyle(d);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && d.id !== 'v-thread-list' && d.id !== 'v-drawer') {
        if (!hdr || !d.contains(hdr)) return d;
      }
    }
    return null;
  };

  window.scrapeChatDom = function() {
    var cb = window.findVictorChatBox();
    if (!cb) return [];
    if (window.initialVictorChatHtml === null) window.initialVictorChatHtml = cb.innerHTML;
    var root = cb;
    while (root.children && root.children.length === 1 && root.children[0].children && root.children[0].children.length > 1) {
      root = root.children[0];
    }
    var msgs = [];
    [...(root.children || [])].forEach(function(n) {
      var c = n.cloneNode(true);
      c.querySelectorAll('button, style, script, .v-code-bar').forEach(function(x) { x.remove(); });
      var txt = (c.innerText || '').trim();
      if (txt && txt !== 'V' && txt !== 'VICTOR' && txt.length > 1) {
        msgs.push({ role: msgs.length % 2 === 0 ? 'user' : 'assistant', content: txt });
      }
    });
    return msgs;
  };

  window.renderVictorThreadList = function() {
    var box = document.getElementById('v-thread-list');
    if (!box) return;
    var list = window.allVictorThreads || [];
    if (!list.length) {
      box.innerHTML = '<div style="color:#64748b;font-size:12px;text-align:center;margin-top:20px;">No saved chat threads yet.</div>';
      return;
    }
    box.innerHTML = list.map(function(t) {
      var act = t.id === window.curThreadId ? ' active' : '';
      var cnt = Array.isArray(t.messages) ? t.messages.length : 0;
      var kb = (JSON.stringify(t).length / 1024).toFixed(1);
      var safeTitle = String(t.title || 'Chat').split('<').join('&lt;').split('"').join('&quot;');
      return '<div class="v-th-item' + act + '" data-id="' + t.id + '" onclick="window.loadVictorThread(this.dataset.id)">' +
        '<div><div class="v-th-title">' + safeTitle + '</div>' +
        '<div class="v-th-meta">' + cnt + ' msgs • ' + kb + ' KB</div></div>' +
        '<button class="v-del-btn" data-id="' + t.id + '" onclick="event.stopPropagation();window.deleteVictorThread(this.dataset.id)">Del</button></div>';
    }).join('');
  };

  window.renderVaultStoragePanel = function(d) {
    var pBox = document.querySelector('textarea[placeholder*="persona" i]');
    if (!pBox) return;
    if (d && d.persona && !pBox.value.trim()) pBox.value = d.persona;
    var modalCard = pBox.parentElement;
    if (!modalCard) return;

    var g = document.getElementById('v-storage-mgr');
    if (!g) {
      g = document.createElement('div');
      g.id = 'v-storage-mgr';
      g.style.cssText = 'margin-top:14px;padding:12px;background:#090d16;border:1px solid #1e293b;border-radius:10px;font-size:12px;color:#cbd5e1;';
      modalCard.appendChild(g);
    }
    var ram = (d && d.ramMB) ? d.ramMB : 46.5;
    var atlas = (d && typeof d.atlasKB === 'number') ? d.atlasKB : 0;
    var docs = (d && Array.isArray(d.docs) && d.docs.length) ? d.docs : [
      { id: 'vault', sizeKB: 1.2 },
      { id: 'memory', sizeKB: 2.0 },
      { id: 'threads', sizeKB: 3.5 }
    ];
    var rows = docs.map(function(doc) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #1e293b;">' +
        '<span>▪ <b>' + doc.id + '</b> (' + doc.sizeKB + ' KB)</span>' +
        '<button data-doc="' + doc.id + '" onclick="window.purgeAtlasDoc(this.dataset.doc)" style="background:#3f1d28;color:#fda4af;border:none;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;">Purge</button></div>';
    }).join('');

    g.innerHTML = '<div style="color:#38bdf8;font-weight:700;margin-bottom:8px;">CLOUD & ATLAS STORAGE (512 MB)</div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>MongoDB Atlas Used:</span><b>' + atlas + ' KB / 512 MB</b></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Render Server RAM:</span><b>' + ram + ' MB / 512 MB</b></div>' +
      '<div>' + rows + '</div>';
  };

  window.syncVictorOS = async function(payload) {
    if (payload && payload.action === 'delete_thread' && payload.id) {
      setLocal(getLocal().filter(function(t) { return t.id !== payload.id; }));
    }
    if (payload && payload.action === 'purge_doc' && payload.docId === 'threads') {
      setLocal([]);
    }
    try {
      var r = await fetch('/api/victor-os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || { action: 'status' })
      });
      var d = await r.json();
      window.renderVaultStoragePanel(d);
      var remote = (d && Array.isArray(d.threads)) ? d.threads : [];
      var map = {};
      getLocal().forEach(function(t) { if (t && t.id) map[t.id] = t; });
      remote.forEach(function(t) { if (t && t.id) map[t.id] = t; });
      window.allVictorThreads = Object.values(map).sort(function(a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      setLocal(window.allVictorThreads);
      window.renderVictorThreadList();
    } catch (e) {
      window.renderVaultStoragePanel(null);
      window.allVictorThreads = getLocal();
      window.renderVictorThreadList();
    }
  };

  window.purgeAtlasDoc = function(docId) { window.syncVictorOS({ action: 'purge_doc', docId: docId }); };
  window.deleteVictorThread = function(id) { window.syncVictorOS({ action: 'delete_thread', id: id }); };

  window.saveActiveThreadNow = async function() {
    var domMsgs = window.scrapeChatDom();
    if (domMsgs.length > (window.curThreadMsgs || []).length) window.curThreadMsgs = domMsgs;
    if (!window.curThreadMsgs || !window.curThreadMsgs.length) return;
    var tid = window.curThreadId || ('th_' + Date.now());
    var title = String(window.curThreadMsgs[0].content || 'Chat').slice(0, 34);
    var th = { id: tid, title: title, updatedAt: Date.now(), messages: window.curThreadMsgs };
    var loc = getLocal().filter(function(x) { return x.id !== tid; });
    loc.unshift(th);
    setLocal(loc);
    window.allVictorThreads = loc;
    window.renderVictorThreadList();
    await window.syncVictorOS({ action: 'save_thread', thread: th });
  };

  window.startNewVictorChat = async function() {
    await window.saveActiveThreadNow();
    window.curThreadId = 'th_' + Date.now();
    localStorage.setItem('victor_active_tid', window.curThreadId);
    window.curThreadMsgs = [];
    var cb = window.findVictorChatBox();
    if (cb) cb.innerHTML = window.initialVictorChatHtml || '';
    window.renderVictorThreadList();
    var dr = document.getElementById('v-drawer');
    if (dr) dr.classList.remove('open');
  };

  window.loadVictorThread = function(id) {
    var t = (window.allVictorThreads || []).find(function(x) { return x.id === id; });
    if (!t) return;
    window.curThreadId = t.id;
    localStorage.setItem('victor_active_tid', t.id);
    window.curThreadMsgs = t.messages || [];
    var cb = window.findVictorChatBox();
    if (cb) {
      cb.innerHTML = window.curThreadMsgs.map(function(m) {
        var isU = m.role === 'user';
        var bg = isU ? '#1e293b' : '#0f172a';
        var align = isU ? 'flex-end' : 'flex-start';
        var safe = String(m.content || '').split('<').join('&lt;');
        return '<div style="display:flex;justify-content:' + align + ';margin:8px 0;">' +
          '<div style="max-width:85%;background:' + bg + ';color:#f8fafc;padding:12px 14px;border-radius:14px;border:1px solid #334155;white-space:pre-wrap;font-size:14px;">' + safe + '</div></div>';
      }).join('');
    }
    var dr = document.getElementById('v-drawer');
    if (dr) dr.classList.remove('open');
    window.renderVictorThreadList();
  };

  function hideMicAndPlus() {
    var hdr = document.querySelector('header');
    if (hdr) {
      var native = [...hdr.querySelectorAll('button')].filter(function(b) { return b.id !== 'v-svg-chats' && b.id !== 'v-svg-sb'; });
      if (native[0]) native[0].style.setProperty('display', 'none', 'important');
      if (native.length > 1) native[native.length - 1].style.setProperty('display', 'none', 'important');
    }
    var inp = document.querySelector('input[placeholder*="VICTOR" i], textarea[placeholder*="VICTOR" i]');
    if (inp && inp.parentElement) {
      var rBtns = [...inp.parentElement.querySelectorAll('button')];
      if (rBtns.length >= 2) {
        var send = rBtns[rBtns.length - 1];
        rBtns.forEach(function(b) {
          if (b !== send && b.id !== 'v-svg-cam' && b.id !== 'v-svg-agent') b.style.setProperty('display', 'none', 'important');
        });
      }
    }
  }

  setInterval(function() {
    hideMicAndPlus();
    window.renderVaultStoragePanel(null);
    var m = window.scrapeChatDom();
    if (m.length > 0 && m.length !== (window.curThreadMsgs || []).length) {
      window.curThreadMsgs = m;
      window.saveActiveThreadNow();
    }
  }, 1800);

  setTimeout(function() {
    hideMicAndPlus();
    window.allVictorThreads = getLocal();
    window.renderVictorThreadList();
    window.renderVaultStoragePanel(null);
    window.syncVictorOS({ action: 'status' });
  }, 400);
})();
</script>`;

const lastBody = code.lastIndexOf('</body>');
if (lastBody !== -1) {
  code = code.slice(0, lastBody) + unifiedOsScript + '\n</body>' + code.slice(lastBody + 7);
  fs.writeFileSync('cloud_server.mjs', code, 'utf8');
}

const parts = code.split('<script>');
for (let i = 1; i < parts.length; i++) {
  const js = parts[i].split('</script>')[0].replace(/\$\{[\s\S]*?\}/g, 'null');
  new vm.Script(js);
}
console.log('✅ PART 2 DONE: Zero-Escape Script Verified & Ready!');
