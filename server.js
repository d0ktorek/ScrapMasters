const http = require('http');
const fs = require('fs');
const path = require('path');
let WebSocket;
try {
  WebSocket = require('ws');
} catch (e) {
  console.error('\nMissing dependency "ws" for WebSocket server.');
  console.error('Install it with:');
  console.error('  cd "%s"', __dirname);
  console.error('  npm init -y');
  console.error('  npm i ws');
  console.error('\nThen run:');
  console.error('  node server.js\n');
  process.exit(1);
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;


const candidateDirs = [
  path.join(__dirname, 'public'),
  path.join(__dirname, 'dist'),
  path.join(__dirname, 'build'),
  __dirname,
];
const staticRoot = (function chooseRoot() {
  for (const dir of candidateDirs) {
    try {
      if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
    } catch {}
  }

  for (const dir of candidateDirs) {
    try { if (fs.existsSync(dir)) return dir; } catch {}
  }
  return __dirname;
})();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json; charset=utf-8',
};

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

function safeDecodeURIComponent(s, fallback = s) {
  try { return decodeURIComponent(s); } catch { return fallback; }
}

function serveFile(filePath, res, statusCode = 200) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const mime = getMime(filePath);
    const headers = { 'Content-Type': mime };

    if (/text\/html/.test(mime)) {
      headers['Cache-Control'] = 'no-cache';
    } else if (/javascript|text\/css/.test(mime)) {
      headers['Cache-Control'] = 'public, max-age=300'; 
    } else {
      headers['Cache-Control'] = 'public, max-age=86400, immutable'; 
    }
    res.writeHead(statusCode, headers);
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    });
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  // API: Player endpoints before static
  if (req.url.startsWith('/api/player')) {
    handlePlayerApi(req, res);
    return;
  }
  // API: Item Shop endpoints before static
  if (req.url.startsWith('/api/shop')) {
    handleShopApi(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const rawPath = safeDecodeURIComponent(url.pathname);

  const requested = path.normalize(rawPath).replace(/^\.+/, '');
  const hasExt = path.extname(requested) !== '';

  let filePath = path.join(staticRoot, requested);

  fs.stat(filePath, (err, stat) => {
    if (!err && stat && stat.isDirectory()) {

      const idx = path.join(filePath, 'index.html');
      if (fs.existsSync(idx)) return serveFile(idx, res);
    }
    if (!err && stat && stat.isFile()) {
      return serveFile(filePath, res);
    }

    const indexPath = path.join(staticRoot, 'index.html');
    if (!hasExt && fs.existsSync(indexPath)) {
      return serveFile(indexPath, res);
    }


    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ScrapMasters server is running. Static site not found. Connect via WebSocket for chat.');
  });
});

const wss = new WebSocket.Server({ server });

function sanitize(str) {
  if (typeof str !== 'string') return '';

  return str.trim().slice(0, 200);
}


let bannedList = [];
try {
  const p = path.join(staticRoot, 'Mute.json');
  if (fs.existsSync(p)) {
    const raw = fs.readFileSync(p, 'utf-8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) bannedList = arr.filter(x => typeof x === 'string').map(x => x.toLowerCase());
  }
} catch {}

function normalizeModeration(s) {
  try { s = s.normalize('NFD').replace(/\p{Diacritic}+/gu, ''); } catch {}
  const map = { '0':'o','1':'i','!':'i','3':'e','4':'a','@':'a','5':'s','$':'s','7':'t','9':'g' };
  s = s.toLowerCase().replace(/[0!134@579$]/g, c => map[c] || c);
  s = s.replace(/[^\p{L}\p{N}]+/gu, '');
  return s;
}
function isFlaggedServer(text) {
  if (!bannedList.length) return false;
  const norm = normalizeModeration(String(text||''));
  for (const w of bannedList) {
    const n = normalizeModeration(w);
    if (!n) continue;
    if (norm.includes(n)) return true;
  }
  return false;
}

function broadcast(obj, except) {
  const data = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      try { client.send(data); } catch {}
    }
  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });


  try { ws.send(JSON.stringify({ from: 'System', text: 'Welcome to Global Chat!', time: Date.now() })); } catch {}

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const text = sanitize(msg.text);
      if (!text) return;

      if (isFlaggedServer(text)) return;
      const payload = {
        from: sanitize(msg.from) || 'Player',
        text,
        time: Date.now(),
      };

      broadcast(payload);
    } catch (e) {
    }
  });

  ws.on('close', () => {
  });
});

const interval = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { try { ws.terminate(); } catch {} continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`ScrapMasters Chat Server listening on http://localhost:${PORT}`);
});

process.on('SIGINT', () => { clearInterval(interval); server.close(() => process.exit(0)); });
// Bro Dont Read Code Plz

// -----------------------------
// Item Shop (server-side state)
// -----------------------------

const SHOP_STATE_PATH = path.join(staticRoot, '.shop-state.json');
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

// Minimal on-server catalog mirroring items.js
const SERVER_ITEMS = [
  { id: 'low_cooldown', name: 'Low Cooldown', basePrice: 750 },
  { id: 'sunny_day', name: 'Sunny Day', basePrice: 1500 },
  { id: 'runny_day', name: 'Runny Day', basePrice: 2200 },
  { id: 'real_autoclicker', name: 'Real Auto clicker', basePrice: 4000 },
  { id: 'triple_drops', name: 'Triple Drops', basePrice: 6000 },
  { id: 'boost_master_tokens', name: 'Boost Master Tokens', basePrice: 5000 },
];

const RARITY_TABLE = [
  { key: 'Legendary', weight: 0.01 },
  { key: 'Mythic',    weight: 0.05 },
  { key: 'Rare',      weight: 0.10 },
  { key: 'Uncommon',  weight: 0.20 },
  { key: 'Common',    weight: 0.50 },
];

function rollRarityServer() {
  const total = RARITY_TABLE.reduce((s, r) => s + r.weight, 0);
  const roll = Math.random() * total;
  let acc = 0;
  for (const r of RARITY_TABLE) {
    acc += r.weight;
    if (roll <= acc) return r.key;
  }
  return 'Common';
}

// Stock sizes per item slot: first item x3, second x2, third x1
const SLOT_STOCK = [1, 1, 1];

function loadShopState() {
  try {
    if (fs.existsSync(SHOP_STATE_PATH)) {
      const raw = fs.readFileSync(SHOP_STATE_PATH, 'utf-8');
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') return obj;
    }
  } catch {}
  return null;
}

function saveShopState(state) {
  try {
    fs.writeFileSync(SHOP_STATE_PATH, JSON.stringify(state, null, 2));
  } catch {}
}

function chooseRandomItem() {
  return SERVER_ITEMS[Math.floor(Math.random() * SERVER_ITEMS.length)];
}

function restockShop(prevState) {
  const now = Date.now();
  const items = [];
  for (let i = 0; i < 3; i++) {
    // Force Common rarity for specific items
    const base = chooseRandomItem();
  const rarity = base.id === 'low_cooldown' ? 'Common'
         : base.id === 'sunny_day' ? 'Common'
         : base.id === 'runny_day' ? 'Uncommon'
         : base.id === 'real_autoclicker' ? 'Rare'
      : base.id === 'triple_drops' ? 'Rare'
      : base.id === 'boost_master_tokens' ? 'Rare'
         : rollRarityServer();
    // Price multiplier by rarity (simple placeholder)
    const mult = rarity === 'Common' ? 1 : rarity === 'Uncommon' ? 1.5 : rarity === 'Rare' ? 2 : rarity === 'Mythic' ? 3 : 5;
    items.push({
      slot: i,
      id: base.id,
      name: base.name,
      rarity,
      price: Math.round(base.basePrice * mult),
      stock: SLOT_STOCK[i],
    });
  }
  const state = {
    lastRestock: now,
    nextRestock: now + EIGHT_HOURS_MS,
    items,
    // Simple purchase log by ip (lightweight, not secure)
    buyers: {},
  };
  saveShopState(state);
  return state;
}

function getShopState() {
  let state = loadShopState();
  const now = Date.now();
  if (!state || !Array.isArray(state.items) || state.items.length !== 3 || !state.nextRestock || now >= state.nextRestock) {
    state = restockShop(state);
  }
  return state;
}

function handleShopApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/shop') {
    const state = getShopState();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify({
      items: state.items,
      nextRestock: state.nextRestock,
      serverTime: Date.now(),
    }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/shop/buy') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const { slot } = data;
        if (typeof slot !== 'number' || slot < 0 || slot > 2) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Invalid slot' }));
          return;
        }
        const state = getShopState();
        const item = state.items.find(i => i.slot === slot);
        if (!item) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Item not found' }));
          return;
        }
        if (item.stock <= 0) {
          res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Out of stock' }));
          return;
        }
        // Decrement stock (no currency check on server yet)
        item.stock -= 1;
        saveShopState(state);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, item }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/shop/restock') {
    try {
      const current = getShopState();
      const state = restockShop(current);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, nextRestock: state.nextRestock, items: state.items }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Failed to restock' }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not Found' }));
}

// -----------------------------
// Players Database API
// -----------------------------

const PLAYERS_DB_PATH = path.join(staticRoot, 'playersdatabase.json');

function loadPlayersDb() {
  try {
    if (!fs.existsSync(PLAYERS_DB_PATH)) return {};
    const s = fs.readFileSync(PLAYERS_DB_PATH, 'utf8');
    const data = JSON.parse(s || '{}');
    return (data && typeof data === 'object') ? data : {};
  } catch {
    return {};
  }
}

function savePlayersDb(db) {
  try {
    fs.writeFileSync(PLAYERS_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch {}
}

function cleanString(x, max = 64) {
  if (typeof x !== 'string') x = String(x||'');
  x = x.trim();
  if (x.length > max) x = x.slice(0, max);
  return x;
}

function handlePlayerApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  // Leaderboard fetch endpoints
  if (req.method === 'GET' && url.pathname === '/api/player/leaderboard') {
    const by = (url.searchParams.get('by') || 'rebirths').toLowerCase();
    const allowed = new Set(['rebirths','maxscrap','maxtires']);
    const key = allowed.has(by) ? by : 'rebirths';
    const db = loadPlayersDb();
    const arr = Object.values(db || {}).filter(r => r && r.username);
    const metricKey = key === 'rebirths' ? 'rebirths' : (key === 'maxscrap' ? 'maxScrap' : 'maxTires');
    arr.sort((a,b) => (Number(b[metricKey]||0) - Number(a[metricKey]||0)) || a.username.localeCompare(b.username));
    const top = arr.slice(0,50).map((r, idx) => ({ rank: idx+1, username: r.username, value: Number(r[metricKey]||0) }));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, by: key, top }));
    return;
  }
  // Claim a username for this client (creates or verifies ownership, returns inventory)
  if (req.method === 'POST' && url.pathname === '/api/player/claim') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const username = cleanString(data.username || '', 24);
        const clientId = cleanString(data.clientId || '', 48);
        if (!username || !clientId) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'Missing username or clientId' }));
          return;
        }
        const db = loadPlayersDb();
        if (!db[username]) {
          db[username] = { username, ownerId: clientId, inventory: [], updatedAt: new Date().toISOString(), rebirths: 0, maxScrap: 0, maxTires: 0 };
          savePlayersDb(db);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, status: 'claimed', inventory: [] }));
          return;
        }
        const rec = db[username];
        if (rec.ownerId && rec.ownerId !== clientId) {
          res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'name-taken' }));
          return;
        }
        // Either ownerId matches, or not set yet (bind to this client)
        if (!rec.ownerId) { rec.ownerId = clientId; savePlayersDb(db); }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, status: 'ok', inventory: Array.isArray(rec.inventory) ? rec.inventory : [], stats: { rebirths: Number(rec.rebirths||0), maxScrap: Number(rec.maxScrap||0), maxTires: Number(rec.maxTires||0) } }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Bad request' }));
      }
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/player/sync') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        let username = cleanString(data.username || '', 24);
        const clientId = cleanString(data.clientId || '', 48);
        if (!username) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'Missing username' }));
          return;
        }
  const invIn = Array.isArray(data.inventory) ? data.inventory : [];
        const inventory = [];
        for (let i = 0; i < Math.min(invIn.length, 6); i++) {
          const it = invIn[i] || {};
          const id = cleanString(it.id || '', 32);
          const name = cleanString(it.name || id || 'Item', 48);
          const rarity = cleanString(it.rarity || 'Common', 16);
          if (!id) continue;
          const price = (typeof it.price === 'number' && isFinite(it.price)) ? it.price : undefined;
          inventory.push(price !== undefined ? { id, name, rarity, price } : { id, name, rarity });
        }
        // Optional stats for leaderboard
        const statsIn = data.stats && typeof data.stats === 'object' ? data.stats : {};
        const rebirths = Math.max(0, Math.floor(Number(statsIn.rebirths || 0)));
        // values can be huge; clamp to a safe integer range
        const maxScrap = Math.max(0, Math.floor(Number(statsIn.maxScrap || 0)));
        const maxTires = Math.max(0, Math.floor(Number(statsIn.maxTires || 0)));

        const db = loadPlayersDb();
        const rec = db[username];
        if (rec && rec.ownerId && clientId && rec.ownerId !== clientId) {
          res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'name-taken' }));
          return;
        }
        const ownerId = rec && rec.ownerId ? rec.ownerId : (clientId || undefined);
        const prev = rec || {};
        db[username] = {
          username,
          ownerId,
          inventory,
          updatedAt: new Date().toISOString(),
          rebirths: Math.max(Number(prev.rebirths||0), rebirths),
          maxScrap: Math.max(Number(prev.maxScrap||0), maxScrap),
          maxTires: Math.max(Number(prev.maxTires||0), maxTires)
        };
        savePlayersDb(db);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Bad request' }));
      }
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not Found' }));
}