const fs = require('fs');
const vm = require('vm');
let code = fs.readFileSync('cloud_server.mjs', 'utf8');

// 1. Fix the broken isResearch line and add 'inspect' + '@handle' detection directly
code = code.replace(
  /const\s+isResearch\s*=[^\n;]+;/g,
  "const isResearch = currentMode === 'research' || /^(inspect|research|search|scrape|look up)\\b/i.test(lower) || lower.includes('http://') || lower.includes('https://') || /@[a-z0-9_.-]+/i.test(lower);"
);

// 2. Also fix any other double-escaped http regex inside the HTML template string
code = code.replace(/\/https\?:\\\\\/\\\\\/\/gi, "/https?:\\/\\//g");
code = code.replace(/\/https\?:\\\\\/\\\\\/i/g, "/https?:\\/\\//i");

fs.writeFileSync('cloud_server.mjs', code, 'utf8');

// 3. Verify all browser <script> blocks cleanly (handling template string escapes)
const scripts = [...code.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
scripts.forEach((m, i) => {
  const simulatedBrowserJs = m[1]
    .replace(/\$\{[\s\S]*?\}/g, 'null')
    .replace(/\\`/g, '`')
    .replace(/\\\$/g, '$')
    .replace(/\\\\/g, '\\');
  new vm.Script(simulatedBrowserJs);
  console.log('✅ Browser Script #' + (i + 1) + ' 100% Syntax Verified!');
});
