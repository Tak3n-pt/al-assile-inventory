#!/usr/bin/env node
// Local diagnostic: compares dev DB vs installed DB sync state
const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const candidates = [
  ['DEV (project root)',     path.join(__dirname, '..', 'inventory.db')],
  ['INSTALLED (%APPDATA%)',  path.join(process.env.APPDATA, 'inventory-app', 'inventory.db')],
];

for (const [label, p] of candidates) {
  let db;
  if (!fs.existsSync(p)) { console.log(`=== ${label} ===\n  (file missing: ${p})\n`); continue; }
  try { db = sqlite3(p, { readonly: true, fileMustExist: true }); }
  catch (e) { console.log(`=== ${label} ===\n  (open failed: ${e.message})\n`); continue; }
  const settings = Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map(r => [r.key, r.value]));
  const counts = {
    products:        db.prepare('SELECT COUNT(*) AS n FROM products').get().n,
    clients:         db.prepare('SELECT COUNT(*) AS n FROM clients').get().n,
    sales:           db.prepare('SELECT COUNT(*) AS n FROM sales').get().n,
    sale_items:      db.prepare('SELECT COUNT(*) AS n FROM sale_items').get().n,
    client_payments: db.prepare('SELECT COUNT(*) AS n FROM client_payments').get().n,
  };
  const latest = db.prepare('SELECT id, name, updated_at FROM products ORDER BY updated_at DESC LIMIT 3').all();
  console.log(`=== ${label} ===`);
  console.log(`  path             : ${p}`);
  console.log(`  cloud_server_url : ${settings.cloud_server_url || '(unset)'}`);
  console.log(`  cloud_sync_key   : ${settings.cloud_sync_key   || '(unset)'}`);
  console.log(`  last_sync_push   : ${settings.last_sync_push   || '(never)'}`);
  console.log(`  last_sync_pull   : ${settings.last_sync_pull   || '(never)'}`);
  console.log(`  counts           : ${JSON.stringify(counts)}`);
  console.log(`  latest products  : ${JSON.stringify(latest)}`);
  console.log();
  db.close();
}
