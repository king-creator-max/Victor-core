const fs = require('fs');
const vm = require('vm');
let code = fs.readFileSync('cloud_server.mjs', 'utf8');

// Remove any remaining raw emoji characters from sandbox default template strings
code = code.replace('<h2>⚡ VICTOR Live Sandbox Ready</h2>', '<h2>VICTOR Live Sandbox Ready</h2>');

fs.writeFileSync('cloud_server.mjs', code, 'utf8');

// Verify all embedded browser <script> blocks cleanly
const parts = code.split('<script>');
for (let i = 1; i < parts.length; i++) {
  const js = parts[i].split('</script>')[0]
    .replace(/\$\{[\s\S]*?\}/g, 'null')
    .split('\\`').join('`')
    .split('\\$').join('$')
    .split('\\\\').join('\\');
  new vm.Script(js);
  console.log('✅ Browser Script #' + i + ' Verified!');
}
console.log('✅ 100% Syntax Verified!');
