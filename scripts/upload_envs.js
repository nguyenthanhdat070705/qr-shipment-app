const { execSync, spawnSync } = require('child_process');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const lines = envContent.split('\n');

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const firstEq = trimmed.indexOf('=');
    if (firstEq > 0) {
      const key = trimmed.slice(0, firstEq).trim();
      let value = trimmed.slice(firstEq + 1).trim();
      
      if (key && !key.startsWith('#') && key.match(/^[a-zA-Z_]/)) {
        console.log(`Setting ${key}...`);
        try {
            try { execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' }); } catch (e) {}
            // Pass value as stdin to npx without a shell, avoiding cmd echo issues
            spawnSync('npx.cmd', ['vercel', 'env', 'add', key, 'production'], { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
        } catch (err) {
            console.error(`Failed to set ${key}:`, err.message);
        }
      }
    }
  }
}
