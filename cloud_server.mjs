import express from 'express';
import fetch from 'node-fetch';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('.'));

// === VICTOR MASTER CHROMIUM ENGINE (Jina Cloud Reader) ===
const JARVIS_KNOWN_SITES = {
  'hacker news': 'https://news.ycombinator.com',
  'ycombinator': 'https://news.ycombinator.com',
  'youtube': 'https://www.youtube.com',
  'google': 'https://www.google.com',
  'github': 'https://github.com',
  'wikipedia': 'https://www.wikipedia.org',
  'reddit': 'https://www.reddit.com',
  'twitter': 'https://x.com',
  'instagram': 'https://www.instagram.com',
  'linkedin': 'https://www.linkedin.com',
  'amazon': 'https://www.amazon.in',
  'flipkart': 'https://www.flipkart.com',
  'openai': 'https://openai.com',
  'nvidia': 'https://www.nvidia.com',
  'apple': 'https://www.apple.com',
  'tesla': 'https://www.tesla.com',
  'isro': 'https://www.isro.gov.in',
  'nasa': 'https://www.nasa.gov',
  'bbc': 'https://www.bbc.com/news',
  'ndtv': 'https://www.ndtv.com',
  'cricbuzz': 'https://www.cricbuzz.com',
  'stackoverflow': 'https://stackoverflow.com'
};

function cleanJarvisUrl(raw) {
  if (!raw) return null;
  try {
    let s = String(raw).trim()
      .replace(/^\[+|\)+$/g, '')
      .replace(/[.,;!?)\]}'"`>]+$/g, '');
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
  } catch (e) {
    return null;
  }
}

function resolveJarvisTarget(rawInput) {
  const unwrapped = String(rawInput || '').replace(/\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi, ' $2 ');
  const lower = unwrapped.toLowerCase();

  const handleMatch = unwrapped.match(/@[a-zA-Z0-9_.-]+/);
  if (handleMatch) {
    const h = handleMatch[0];
    if (lower.includes('instagram')) return { url: 'https://www.instagram.com/' + h.slice(1), via: 'Instagram Handle' };
    if (lower.includes('twitter') || /\bx\b/.test(lower)) return { url: 'https://x.com/' + h.slice(1), via: 'X Handle' };
    if (lower.includes('github')) return { url: 'https://github.com/' + h.slice(1), via: 'GitHub Handle' };
    return { url: 'https://www.youtube.com/' + h, via: 'YouTube Handle (' + h + ')' };
  }

  const urlMatch = unwrapped.match(/(?:https?:\/\/|www\.)[^\s\[\]()<>"'`]+/i);
  if (urlMatch) {
    const valid = cleanJarvisUrl(urlMatch[0]);
    if (valid) return { url: valid, via: 'Direct URL' };
  }

  const domainMatch = unwrapped.match(/\b([a-z0-9.-]+\.(?:com|org|net|in|io|ai|co|gov|edu|dev|app|me|tv)(?:\/[^\s\[\]()<>"'`]*)?)\b/i);
  if (domainMatch) {
    const valid = cleanJarvisUrl(domainMatch[1]);
    if (valid) return { url: valid, via: 'Domain Detection' };
  }

  for (const [name, siteUrl] of Object.entries(JARVIS_KNOWN_SITES)) {
    if (lower.includes(name)) {
      return { url: siteUrl, via: 'Jarvis Entity Map (' + name + ')' };
    }
  }

  return { url: null, via: 'Jina Cloud Search' };
}

async function executeChromiumTask(queryOrUrl) {
  const rawQuery = String(queryOrUrl || '').trim();
  const { url: targetUrl, via } = resolveJarvisTarget(rawQuery);

  const jinaHeaders = {
    'Accept': 'text/plain',
    'X-Return-Format': 'markdown',
    'X-With-Links-Summary': 'true',
    'User-Agent': 'Victor-Jarvis-Engine/3.0'
  };
  if (process.env.JINA_API_KEY) {
    jinaHeaders['Authorization'] = 'Bearer ' + process.env.JINA_API_KEY.trim();
  }

  try {
    let jinaEndpoint = targetUrl ? 'https://r.jina.ai/' + targetUrl : 'https://s.jina.ai/' + encodeURIComponent(rawQuery);

    const res = await fetch(jinaEndpoint, {
      method: 'GET',
      headers: jinaHeaders,
      signal: AbortSignal.timeout(14000)
    });

    let extractedText = '';
    if (res.ok) {
      extractedText = (await res.text()).trim().slice(0, 7500);
    }

    const intelReport = [
      `=== [JINA CLOUD CHROMIUM READER TELEMETRY — LIVE WEB DATA] ===`,
      `Resolved Target: ${targetUrl || rawQuery} (via ${via})`,
      `\n--- Live Extracted DOM Markdown ---\n${extractedText || 'No public text content returned from target page.'}`
    ].join('\n');

    return { ok: true, intel: intelReport };
  } catch (err) {
    return { ok: false, intel: `Jina Cloud Chromium Notice (${err.message}) for: ${rawQuery}` };
  }
}
// === END VICTOR MASTER CHROMIUM ENGINE ===

// === HYBRID AI ROUTER ===
async function routeHybridChat(messages, model) {
  // Groq fallback sequence
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'llama-3.3-70b-versatile',
          messages,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(12000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.choices && data.choices[0]) return data.choices[0].message.content;
      }
    } catch (e) {}
  }
  return "VICTOR Hybrid Brain operational. All primary API providers are currently busy or unconfigured.";
}
// === END HYBRID AI ROUTER ===

// Passkey verification endpoint
app.post('/api/verify', (req, res) => {
  const { passkey } = req.body;
  if (passkey === (process.env.VICTOR_PASSKEY || 'jarvis123')) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: 'Unauthorized' });
});

// Chat & Prefix Router endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1].content.trim() : '';
    const lowerMsg = lastMsg.toLowerCase();

    // Strict Prefix Routing: inspect, search, research
    const isWebTask = lowerMsg.startsWith('inspect') || lowerMsg.startsWith('search') || lowerMsg.startsWith('research');

    if (isWebTask) {
      console.log(`⚡ JARVIS Web Task Triggered via Prefix: "${lastMsg}"`);
      const browserResult = await executeChromiumTask(lastMsg);
      return res.json({ reply: browserResult.intel });
    }

    // System Mandate injection for AI brain
    if (messages && messages.length > 0) {
      const hasSystem = messages.some(m => m.role === 'system');
      if (!hasSystem) {
        messages.unshift({
          role: 'system',
          content: 'You are VICTOR, an elite autonomous J.A.R.V.I.S.-class AI assistant built for Sir. You have full capability to analyze technical projects, code, and web data.'
        });
      }
    }

    const reply = await routeHybridChat(messages || [], model);
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ VICTOR Server running on port ${PORT}`);
});
