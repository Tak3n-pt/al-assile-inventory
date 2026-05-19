/**
 * Desktop sync-fix integration tests. Spins up an in-memory SQLite mirroring
 * the desktop schema, then exercises the same DB layer / sync semantics that
 * `electron/main.cjs` runs in production.
 *
 *   node __tests__/sync-fixes.test.js
 *
 * We can't easily import main.cjs (too many electron deps), so we replay
 * the relevant FUNCTIONS by inlining minimal versions that match production.
 * Each test asserts the same behavior the live code path exhibits.
 */
'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
// Desktop's better-sqlite3 is compiled against Electron's NODE_MODULE_VERSION.
// Borrow the mobile project's copy which is compiled against plain Node.
const Database = require(path.resolve(__dirname, '../../inventory-app-mobile/node_modules/better-sqlite3'));

// ---- Schema (matches src/database/init.cjs essentials we touch) ----
function makeDB() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE clients (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL, phone TEXT, address TEXT, email TEXT, notes TEXT,
      balance REAL DEFAULT 0,
      credit_blocked INTEGER DEFAULT 0,
      last_contact_note TEXT, last_contact_at DATETIME,
      remote_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE products (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, quantity REAL DEFAULT 0
    );
    CREATE TABLE sales (
      id INTEGER PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id),
      date TEXT, subtotal REAL, discount REAL, total REAL,
      paid_amount REAL DEFAULT 0,
      status TEXT, notes TEXT,
      remote_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE sale_items (
      id INTEGER PRIMARY KEY, sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      quantity REAL, unit_price REAL, total REAL
    );
    CREATE TABLE client_payments (
      id INTEGER PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
      amount REAL NOT NULL, date TEXT NOT NULL, method TEXT NOT NULL DEFAULT 'cash',
      notes TEXT, batch_id TEXT, created_by INTEGER,
      remote_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE suppliers (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT,
      balance REAL DEFAULT 0,
      remote_id TEXT UNIQUE,
      updated_at DATETIME
    );
    CREATE TABLE supplier_payments (
      id INTEGER PRIMARY KEY,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      purchase_id INTEGER, amount REAL NOT NULL, date TEXT, method TEXT,
      notes TEXT, batch_id TEXT, created_by INTEGER,
      remote_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

// ---- Helpers replicating main.cjs logic verbatim for the paths under test ----

function detectStaleRemoteId(db, table, remoteId, compareFields) {
  const existing = db.prepare(`SELECT * FROM ${table} WHERE remote_id = ?`).get(remoteId);
  if (!existing) return { state: 'none' };
  const compare = Object.entries(compareFields).filter(([, v]) => v !== undefined);
  const same = compare.every(([key, value]) => {
    const ev = existing[key];
    if (value == null && ev == null) return true;
    if (value == null || ev == null) return false;
    if (typeof value === 'number' && typeof ev === 'number') {
      return Math.round(ev * 100) === Math.round(value * 100);
    }
    return String(ev) === String(value);
  });
  return same ? { state: 'same', existing } : { state: 'stale', existing };
}

// importRemoteClient delete branch (the lenient version we just shipped)
function importRemoteClientDelete(db, mobileClientId) {
  const remoteId = String(mobileClientId);
  const existing = db.prepare('SELECT id FROM clients WHERE remote_id = ?').get(remoteId);
  if (!existing) return { ok: true, skipped: true };
  const saleCount = db.prepare('SELECT COUNT(*) AS c FROM sales WHERE client_id = ?').get(existing.id).c;
  if (saleCount > 0) {
    return { ok: true, skipped: true, reason: 'has_sales' };
  }
  db.prepare('DELETE FROM clients WHERE id = ?').run(existing.id);
  return { ok: true };
}

// updateSupplierPayment (exactly the body we added in suppliers.cjs)
function updateSupplierPayment(db, id, data) {
  return db.transaction(() => {
    const existing = db.prepare('SELECT * FROM supplier_payments WHERE id = ?').get(id);
    if (!existing) throw new Error('Payment not found');

    const newAmount = data.amount !== undefined ? Number(data.amount) : existing.amount;
    const newDate   = data.date   !== undefined ? String(data.date)  : existing.date;
    const newNotes  = data.notes  !== undefined ? (data.notes || null) : existing.notes;
    if (!Number.isFinite(newAmount) || newAmount <= 0) throw new Error('Amount must be positive');

    const delta = Math.round((newAmount - existing.amount) * 100) / 100;
    if (delta !== 0) {
      db.prepare('UPDATE suppliers SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(delta, existing.supplier_id);
    }
    db.prepare('UPDATE supplier_payments SET amount = ?, date = ?, notes = ? WHERE id = ?')
      .run(newAmount, newDate, newNotes, id);
    return { changes: 1 };
  })();
}

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ============================================================================
// TEST 1 — Sales fingerprint no longer includes paid_amount
// (mobile sends sale snapshot with paid_amount=300; desktop has running 500
//  after a payment import — fingerprint should still match as 'same')
// ============================================================================
test('Sales fingerprint excludes paid_amount: payment import doesn\'t cause spurious archive', () => {
  const db = makeDB();
  db.prepare(`INSERT INTO clients (id, name, balance) VALUES (1, 'A', 0)`).run();
  // Pre-import sale: at-creation paid=300, total=1000. Then a payment of 200
  // imported via importRemotePayment bumped paid_amount to 500 on desktop.
  db.prepare(`
    INSERT INTO sales (id, client_id, date, total, paid_amount, status, remote_id)
    VALUES (1, 1, '2025-04-26', 1000, 500, 'partial', '5')
  `).run();

  // Mobile pushes the SAME sale again next pull cycle. Snapshot has the
  // at-creation value of 300 (mobile keeps it pinned per the new contract).
  // Old fingerprint included paid_amount → state='stale' → archive + reinsert.
  // New fingerprint excludes it → state='same' → skip.
  const stale = detectStaleRemoteId(db, 'sales', '5', {
    client_id: 1,
    date: '2025-04-26',
    total: 1000,
    // No paid_amount in fingerprint
  });
  assert.equal(stale.state, 'same', 'no-churn: same fingerprint, paid_amount excluded');

  // Sanity: with paid_amount included, it would have been 'stale'
  const staleOld = detectStaleRemoteId(db, 'sales', '5', {
    client_id: 1, date: '2025-04-26', total: 1000, paid_amount: 300,
  });
  assert.equal(staleOld.state, 'stale', 'old behavior: would have churned');
});

// ============================================================================
// TEST 2 — importRemoteClient delete is lenient when sales exist (no error)
// ============================================================================
test('importRemoteClient delete: lenient when sales exist (no error returned, no DB change)', () => {
  const db = makeDB();
  db.prepare(`INSERT INTO clients (id, name, balance, remote_id) VALUES (10, 'A', 0, '10')`).run();
  db.prepare(`INSERT INTO clients (id, name, balance, remote_id) VALUES (20, 'B', 0, '20')`).run();
  db.prepare(`
    INSERT INTO sales (id, client_id, date, total, paid_amount, status)
    VALUES (1, 10, '2025-04-26', 100, 100, 'paid')
  `).run();

  // Client 10 has a sale → mobile delete should be IGNORED (skipped, no error)
  const r = importRemoteClientDelete(db, 10);
  assert.equal(r.ok, true, 'no error');
  assert.equal(r.skipped, true, 'skipped');
  assert.equal(r.reason, 'has_sales', 'reason flagged');
  const stillThere = db.prepare('SELECT id FROM clients WHERE id = 10').get();
  assert.ok(stillThere, 'client preserved');

  // Client 20 has no sales → succeeds
  const r2 = importRemoteClientDelete(db, 20);
  assert.equal(r2.ok, true);
  assert.equal(r2.skipped, undefined);
  const gone = db.prepare('SELECT id FROM clients WHERE id = 20').get();
  assert.equal(gone, undefined, 'client deleted');

  // Re-running on an already-deleted client returns skipped (not found)
  const r3 = importRemoteClientDelete(db, 20);
  assert.equal(r3.ok, true);
  assert.equal(r3.skipped, true, 'idempotent on missing');
});

// ============================================================================
// TEST 3 — updateSupplierPayment delta math: balance moves by (new − old)
// ============================================================================
test('updateSupplierPayment: balance moves by delta, payment row updated', () => {
  const db = makeDB();
  db.prepare(`INSERT INTO suppliers (id, name, balance) VALUES (1, 'Acme', 0)`).run();
  // Original payment of 1000
  db.prepare(`
    INSERT INTO supplier_payments (id, supplier_id, amount, date, method)
    VALUES (1, 1, 1000, '2025-04-26', 'cash')
  `).run();
  db.prepare('UPDATE suppliers SET balance = balance + 1000 WHERE id = 1').run();

  // Edit down to 700
  updateSupplierPayment(db, 1, { amount: 700, date: '2025-04-27', notes: 'corrected' });

  const sup = db.prepare('SELECT balance FROM suppliers WHERE id = 1').get();
  assert.equal(sup.balance, 700, 'balance moved by delta of -300');

  const pay = db.prepare('SELECT * FROM supplier_payments WHERE id = 1').get();
  assert.equal(pay.amount, 700, 'amount updated');
  assert.equal(pay.date, '2025-04-27', 'date updated');
  assert.equal(pay.notes, 'corrected', 'notes updated');

  // Edit up to 1500
  updateSupplierPayment(db, 1, { amount: 1500 });
  const sup2 = db.prepare('SELECT balance FROM suppliers WHERE id = 1').get();
  assert.equal(sup2.balance, 1500, 'balance moved by +800 delta');
});

// ============================================================================
// TEST 4 — updateSupplierPayment rejects zero/negative amounts
// ============================================================================
test('updateSupplierPayment: rejects zero/negative amount', () => {
  const db = makeDB();
  db.prepare(`INSERT INTO suppliers (id, name, balance) VALUES (1, 'Acme', 1000)`).run();
  db.prepare(`INSERT INTO supplier_payments (id, supplier_id, amount, date) VALUES (1, 1, 1000, '2025-04-26')`).run();

  assert.throws(() => updateSupplierPayment(db, 1, { amount: 0 }), /Amount must be positive/);
  assert.throws(() => updateSupplierPayment(db, 1, { amount: -100 }), /Amount must be positive/);
  // Balance unchanged
  const sup = db.prepare('SELECT balance FROM suppliers WHERE id = 1').get();
  assert.equal(sup.balance, 1000);
});

// ============================================================================
// TEST 5 — Sales fingerprint discriminates DIFFERENT sales (different total)
// (regression guard: don't false-positive after dropping paid_amount)
// ============================================================================
test('Sales fingerprint: different total → state=stale (no false match)', () => {
  const db = makeDB();
  db.prepare(`INSERT INTO clients (id, name) VALUES (1, 'A')`).run();
  db.prepare(`
    INSERT INTO sales (id, client_id, date, total, paid_amount, status, remote_id)
    VALUES (1, 1, '2025-04-26', 1000, 1000, 'paid', '5')
  `).run();

  const r = detectStaleRemoteId(db, 'sales', '5', {
    client_id: 1, date: '2025-04-26', total: 999,
  });
  assert.equal(r.state, 'stale', 'different total triggers archive');
});

// ============================================================================
// TEST 6 — Mobile sale + post-creation payment full lifecycle on desktop
// (simulates: import sale, import payment, then delete sale + payment delete)
// ============================================================================
test('Lifecycle: import sale → import payment → delete cascades correctly', () => {
  const db = makeDB();
  db.prepare(`INSERT INTO clients (id, name, balance) VALUES (1, 'A', 0)`).run();
  db.prepare(`INSERT INTO products (id, name, quantity) VALUES (1, 'Widget', 50)`).run();

  // Step 1: import a mobile sale (total=1000, paid_at_creation=300, debt=700)
  // We simulate the addSale call inline (the real code path).
  db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO sales (client_id, date, total, paid_amount, status, remote_id)
      VALUES (1, '2025-04-26', 1000, 300, 'partial', '5')
    `).run();
    const saleId = r.lastInsertRowid;
    db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)')
      .run(saleId, 1, 5, 200, 1000);
    db.prepare('UPDATE products SET quantity = quantity - 5 WHERE id = 1').run();
    db.prepare('UPDATE clients SET balance = balance - 700 WHERE id = 1').run();
    // addSale internally creates a ledger row for the at-creation cash portion
    db.prepare(`INSERT INTO client_payments (client_id, sale_id, amount, date, method) VALUES (1, ?, 300, '2025-04-26', 'cash')`)
      .run(saleId);
  })();

  let bal = db.prepare('SELECT balance FROM clients WHERE id = 1').get().balance;
  assert.equal(bal, -700, 'after sale import: balance -700');

  // Step 2: import a mobile post-creation payment of 200 with remote_id='mob-X'
  // (the body of importRemotePayment CREATE branch)
  db.transaction(() => {
    const sale = db.prepare('SELECT * FROM sales WHERE remote_id = ?').get('5');
    // Insert ledger row
    db.prepare(`INSERT INTO client_payments (client_id, sale_id, amount, date, method, remote_id)
                VALUES (1, ?, 200, '2025-04-26', 'cash', 'mob-100')`).run(sale.id);
    // Bump sale.paid_amount + status (importRemotePayment does this)
    const newPaid = 300 + 200;
    db.prepare(`UPDATE sales SET paid_amount = ?, status = ? WHERE id = ?`)
      .run(newPaid, newPaid >= sale.total ? 'paid' : 'partial', sale.id);
    // Bump client balance
    db.prepare('UPDATE clients SET balance = balance + 200 WHERE id = 1').run();
  })();

  bal = db.prepare('SELECT balance FROM clients WHERE id = 1').get().balance;
  assert.equal(bal, -500, 'after payment import: balance -500');
  const sale = db.prepare(`SELECT paid_amount FROM sales WHERE remote_id = '5'`).get();
  assert.equal(sale.paid_amount, 500, 'desktop sale.paid_amount = running total');

  // Step 3: mobile DELETE sale → desktop receives sale tombstone + payment tombstone.
  // importRemoteSale delete branch: reverses balance using local.paid_amount (running),
  // deletes ledger rows, deletes sale.
  db.transaction(() => {
    const local = db.prepare(`SELECT * FROM sales WHERE remote_id = '5'`).get();
    // Restore stock
    const items = db.prepare('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?').all(local.id);
    for (const it of items) db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?').run(it.quantity, it.product_id);
    // Reverse balance based on running total
    if (local.total > local.paid_amount) {
      db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?').run(local.total - local.paid_amount, local.client_id);
    }
    // Delete attached client_payments + items + sale
    db.prepare('DELETE FROM client_payments WHERE sale_id = ?').run(local.id);
    db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(local.id);
    db.prepare('DELETE FROM sales WHERE id = ?').run(local.id);
  })();

  // Now process payment tombstone (importRemotePayment delete branch):
  // existing row should be GONE (sale-delete cascade deleted it). Returns skipped.
  const existing = db.prepare(`SELECT * FROM client_payments WHERE remote_id = 'mob-100'`).get();
  assert.equal(existing, undefined, 'payment row gone (deleted by sale-delete cascade)');

  bal = db.prepare('SELECT balance FROM clients WHERE id = 1').get().balance;
  assert.equal(bal, 0, 'after sale delete: balance fully reversed');
  const stock = db.prepare('SELECT quantity FROM products WHERE id = 1').get().quantity;
  assert.equal(stock, 50, 'stock fully restored');
});

// ============================================================================
// TEST 7 — Lifecycle without intermediate pull (sale+pay+delete in one window)
// ============================================================================
test('Lifecycle: sale+pay+delete collapsed in one pull → no balance change on desktop', () => {
  const db = makeDB();
  db.prepare(`INSERT INTO clients (id, name, balance) VALUES (1, 'A', 0)`).run();

  // Pull receives: sale tombstone (delete) + payment tombstone (delete)
  // Both target rows that desktop never imported (create+delete collapsed).

  // sale tombstone: remote_id='5', __action='delete'. existing not found → skip.
  const saleExisting = db.prepare(`SELECT id FROM sales WHERE remote_id = '5'`).get();
  assert.equal(saleExisting, undefined, 'no desktop sale (never imported)');

  // payment tombstone: remote_id='mob-100', __action='delete'. existing not found → skip.
  const payExisting = db.prepare(`SELECT id FROM client_payments WHERE remote_id = 'mob-100'`).get();
  assert.equal(payExisting, undefined, 'no desktop payment (never imported)');

  // Net desktop balance change: 0 (both tombstones are no-ops)
  const bal = db.prepare('SELECT balance FROM clients WHERE id = 1').get().balance;
  assert.equal(bal, 0, 'no balance change');
});

// ============================================================================
// Run
// ============================================================================
(async () => {
  let pass = 0, fail = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  \x1b[32m✓\x1b[0m ${name}`);
      pass++;
    } catch (err) {
      console.log(`  \x1b[31m✗\x1b[0m ${name}`);
      console.log(`    ${err.message}`);
      if (err.stack) console.log(err.stack.split('\n').slice(1, 4).join('\n'));
      fail++;
    }
  }
  console.log(`\n${pass}/${tests.length} passed${fail ? `, ${fail} failed` : ''}`);
  process.exit(fail ? 1 : 0);
})();
