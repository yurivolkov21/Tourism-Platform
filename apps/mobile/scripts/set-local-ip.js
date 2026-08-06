// Auto-detects this machine's LAN IPv4 and writes it into .env.local's
// EXPO_PUBLIC_API_BASE_URL — runs before every `pnpm start` so switching
// wifi networks never needs a manual .env edit.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function pickLanIp() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const [name, addrs] of Object.entries(nets)) {
    if (/vethernet|virtual|vmware|vbox|wsl|loopback/i.test(name)) continue;
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal)
        candidates.push(addr.address);
    }
  }
  const byPrefix = (prefix) => candidates.find((ip) => ip.startsWith(prefix));
  return (
    byPrefix('192.168.') ?? byPrefix('10.') ?? byPrefix('172.') ?? candidates[0]
  );
}

const ip = pickLanIp();
if (!ip) {
  console.warn(
    '[set-local-ip] No LAN IPv4 found — leaving .env.local untouched.',
  );
  process.exit(0);
}

const envLocalPath = path.join(__dirname, '..', '.env.local');
const line = `EXPO_PUBLIC_API_BASE_URL=http://${ip}:3000`;
const existing = fs.existsSync(envLocalPath)
  ? fs.readFileSync(envLocalPath, 'utf8')
  : '';
const lines = existing.split('\n').filter(Boolean);
const idx = lines.findIndex((l) => l.startsWith('EXPO_PUBLIC_API_BASE_URL='));
if (idx >= 0) lines[idx] = line;
else lines.unshift(line);

fs.writeFileSync(envLocalPath, lines.join('\n') + '\n');
console.log(`[set-local-ip] EXPO_PUBLIC_API_BASE_URL -> http://${ip}:3000`);
