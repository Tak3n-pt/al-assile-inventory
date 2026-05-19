// Clients and Sales database operations

const normalizeCategoryName = (name) => String(name || '').trim();

const getOrCreateClientCategory = (db, name) => {
  const normalized = normalizeCategoryName(name);
  if (!normalized) return null;

  const existing = db.prepare(`
    SELECT id FROM client_categories WHERE LOWER(name) = LOWER(?)
  `).get(normalized);

  if (existing) return existing.id;

  const result = db.prepare(`
    INSERT INTO client_categories (name) VALUES (?)
  `).run(normalized);

  return result.lastInsertRowid;
};

const resolveClientCategoryId = (db, data) => {
  if (data.new_category_name) {
    return getOrCreateClientCategory(db, data.new_category_name);
  }

  if (data.category_id === '' || data.category_id === undefined || data.category_id === null) {
    return null;
  }

  return Number(data.category_id) || null;
};

// Money helper: round to 2dp to avoid float drift on accumulation
const money = (v) => Math.round((Number(v) || 0) * 100) / 100;

// Last day of a given month/year as YYYY-MM-DD
const lastDayOfMonth = (year, month) => {
  const y = parseInt(year);
  const m = parseInt(month);
  const d = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const clientsQueries = (db) => ({
  // ============================================
  // CLIENT CATEGORIES
  // ============================================
  getClientCategories: () => {
    return db.prepare(`
      SELECT
        cc.*,
        COUNT(c.id) as client_count
      FROM client_categories cc
      LEFT JOIN clients c ON c.category_id = cc.id
      GROUP BY cc.id
      ORDER BY cc.name
    `).all();
  },

  addClientCategory: (name) => {
    const id = getOrCreateClientCategory(db, name);
    return db.prepare(`SELECT * FROM client_categories WHERE id = ?`).get(id);
  },

  // ============================================
  // CLIENTS
  // ============================================
  getAllClients: () => {
    return db.prepare(`
      SELECT
        c.*,
        cc.name as category_name,
        (SELECT COUNT(*) FROM sales WHERE client_id = c.id) as sale_count,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE client_id = c.id) as total_purchases,
        (SELECT COALESCE(SUM(total - paid_amount), 0) FROM sales WHERE client_id = c.id AND status != 'paid') as outstanding_debt
      FROM clients c
      LEFT JOIN client_categories cc ON c.category_id = cc.id
      ORDER BY c.name
    `).all();
  },

  getClientById: (id) => {
    return db.prepare(`
      SELECT
        c.*,
        cc.name as category_name,
        (SELECT COUNT(*) FROM sales WHERE client_id = c.id) as sale_count,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE client_id = c.id) as total_purchases,
        (SELECT COALESCE(SUM(total - paid_amount), 0) FROM sales WHERE client_id = c.id AND status != 'paid') as outstanding_debt
      FROM clients c
      LEFT JOIN client_categories cc ON c.category_id = cc.id
      WHERE c.id = ?
    `).get(id);
  },

  searchClients: (query) => {
    return db.prepare(`
      SELECT
        c.*,
        cc.name as category_name,
        (SELECT COUNT(*) FROM sales WHERE client_id = c.id) as sale_count,
        (SELECT COALESCE(SUM(total - paid_amount), 0) FROM sales WHERE client_id = c.id AND status != 'paid') as outstanding_debt
      FROM clients c
      LEFT JOIN client_categories cc ON c.category_id = cc.id
      WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.address LIKE ? OR cc.name LIKE ?
      ORDER BY c.name
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
  },

  getClientsWithDebt: () => {
    // Return debtor clients ranked by staleness: the oldest unpaid activity
    // surfaces at the top. "Last activity" = whichever is later between the
    // last sale and the last payment (so a client who recently paid is seen
    // as "being attended to" even if they still owe).
    return db.prepare(`
      SELECT
        c.*,
        cc.name as category_name,
        (SELECT COUNT(*) FROM sales WHERE client_id = c.id) as sale_count,
        (SELECT COALESCE(SUM(total - paid_amount), 0) FROM sales
           WHERE client_id = c.id AND status != 'paid') as outstanding_debt,
        (SELECT MAX(created_at) FROM (
            SELECT created_at FROM sales WHERE client_id = c.id
            UNION ALL
            SELECT created_at FROM client_payments WHERE client_id = c.id
         )) as last_activity_at
      FROM clients c
      LEFT JOIN client_categories cc ON c.category_id = cc.id
      WHERE c.balance < 0 OR EXISTS (
        SELECT 1 FROM sales WHERE client_id = c.id AND status != 'paid'
      )
      ORDER BY last_activity_at ASC, outstanding_debt DESC
    `).all();
  },

  addClient: (data) => {
    const categoryId = resolveClientCategoryId(db, data);
    return db.prepare(`
      INSERT INTO clients (name, category_id, phone, address, email, notes, balance, credit_blocked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      categoryId,
      data.phone || null,
      data.address || null,
      data.email || null,
      data.notes || null,
      data.balance || 0,
      data.credit_blocked ? 1 : 0
    );
  },

  // updateClient edits profile fields ONLY. Balance changes must go through the
  // ledger (recordClientPayment / adjustClientBalance) so every movement is audited.
  // Silently ignores any `balance` in the payload to prevent UI bypass.
  updateClient: (id, data) => {
    const categoryId = resolveClientCategoryId(db, data);
    return db.prepare(`
      UPDATE clients SET
        name = ?,
        category_id = ?,
        phone = ?,
        address = ?,
        email = ?,
        notes = ?,
        credit_blocked = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.name,
      categoryId,
      data.phone || null,
      data.address || null,
      data.email || null,
      data.notes || null,
      data.credit_blocked ? 1 : 0,
      id
    );
  },

  // Records a reminder contact — updates the note + stamps the time.
  // Separate mutation so the UI can PATCH just this without touching balance
  // or profile; also produces a distinct audit trail via sync_log.
  recordContact: (id, note) => {
    return db.prepare(`
      UPDATE clients SET
        last_contact_note = ?,
        last_contact_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(note == null ? null : String(note).trim() || null, id);
  },

  updateClientBalance: (id, amount) => {
    return db.prepare(`
      UPDATE clients SET balance = balance + ? WHERE id = ?
    `).run(amount, id);
  },

  deleteClient: (id) => {
    return db.transaction(() => {
      // Get all sales for this client
      const sales = db.prepare(`SELECT * FROM sales WHERE client_id = ?`).all(id);
      for (const sale of sales) {
        const items = db.prepare(`SELECT product_id, quantity FROM sale_items WHERE sale_id = ?`).all(sale.id);
        // Returns already restored stock at return-time, so don't double-restore
        if (sale.status !== 'return') {
          for (const item of items) {
            db.prepare(`UPDATE products SET quantity = quantity + ? WHERE id = ?`).run(item.quantity, item.product_id);
          }
        }
        db.prepare(`DELETE FROM sale_items WHERE sale_id = ?`).run(sale.id);
      }
      // Delete sales
      db.prepare(`DELETE FROM sales WHERE client_id = ?`).run(id);
      // Delete any documents referencing this client
      db.prepare(`DELETE FROM documents WHERE client_id = ?`).run(id);
      // Delete client
      return db.prepare(`DELETE FROM clients WHERE id = ?`).run(id);
    })();
  },

  // ============================================
  // SALES
  // ============================================
  getAllSales: () => {
    return db.prepare(`
      SELECT
        s.*,
        c.name as client_name,
        c.phone as client_phone,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      ORDER BY s.date DESC, s.created_at DESC
    `).all();
  },

  getSaleById: (id) => {
    return db.prepare(`
      SELECT
        s.*,
        c.name as client_name,
        c.phone as client_phone,
        c.address as client_address
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.id = ?
    `).get(id);
  },

  getSalesByClient: (clientId) => {
    return db.prepare(`
      SELECT
        s.*,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
      FROM sales s
      WHERE s.client_id = ?
      ORDER BY s.date DESC
    `).all(clientId);
  },

  getSalesByStatus: (status) => {
    return db.prepare(`
      SELECT
        s.*,
        c.name as client_name,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.status = ?
      ORDER BY s.date DESC
    `).all(status);
  },

  getSalesByDateRange: (startDate, endDate) => {
    return db.prepare(`
      SELECT
        s.*,
        c.name as client_name,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.date BETWEEN ? AND ?
      ORDER BY s.date DESC
    `).all(startDate, endDate);
  },

  getUnpaidSales: () => {
    return db.prepare(`
      SELECT
        s.*,
        c.name as client_name,
        c.phone as client_phone,
        (s.total - s.paid_amount) as remaining
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.status != 'paid'
      ORDER BY s.date ASC
    `).all();
  },

  // Create a sale atomically: header + items + stock adjustment + client balance
  // data: { client_id, date, subtotal?, discount?, total, paid_amount, status, notes, items:[{product_id, quantity, unit_price, total?}], remote_id? }
  // If remote_id is provided and already exists, returns the existing sale id (idempotent for sync pulls)
  addSale: (data) => {
    return db.transaction(() => {
      // Idempotency: if this remote sale already exists, short-circuit
      if (data.remote_id) {
        const existing = db.prepare('SELECT id FROM sales WHERE remote_id = ?').get(data.remote_id);
        if (existing) {
          return { lastInsertRowid: existing.id, changes: 0, skipped: true };
        }
      }

      const status = data.status || 'pending';
      const isReturn = status === 'return' || (Number(data.total) || 0) < 0;
      const total = money(data.total);
      const paidAmount = money(data.paid_amount);
      const subtotal = money(data.subtotal || data.total);
      const discount = money(data.discount || 0);

      const result = db.prepare(`
        INSERT INTO sales (client_id, date, subtotal, discount, total, paid_amount, status, notes, remote_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.client_id || null,
        data.date,
        subtotal,
        discount,
        total,
        paidAmount,
        status,
        data.notes || null,
        data.remote_id || null
      );
      const saleId = result.lastInsertRowid;

      // Insert items and adjust stock atomically in the same transaction
      const items = Array.isArray(data.items) ? data.items : [];
      const itemInsert = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?)
      `);
      const stockDeduct = db.prepare(`UPDATE products SET quantity = quantity - ? WHERE id = ?`);
      const stockRestore = db.prepare(`UPDATE products SET quantity = quantity + ? WHERE id = ?`);

      for (const item of items) {
        // Validate product exists (defense against bad sync payloads)
        const productExists = db.prepare('SELECT 1 FROM products WHERE id = ?').get(item.product_id);
        if (!productExists) {
          throw new Error(`Product ${item.product_id} does not exist locally`);
        }
        const itemQty = Number(item.quantity) || 0;
        const itemPrice = money(item.unit_price);
        const itemTotal = money(item.total != null ? item.total : itemQty * itemPrice);
        itemInsert.run(saleId, item.product_id, itemQty, itemPrice, itemTotal);
        if (isReturn) {
          stockRestore.run(itemQty, item.product_id);
        } else {
          stockDeduct.run(itemQty, item.product_id);
        }
      }

      // Client balance update + ledger row (when client is set).
      // Every money movement into client balance gets a client_payments entry so
      // the history panel is complete and every entry is editable/reversible.
      if (data.client_id) {
        const clientExists = db.prepare('SELECT 1 FROM clients WHERE id = ?').get(data.client_id);
        if (!clientExists) {
          throw new Error(`Client ${data.client_id} does not exist locally`);
        }

        const insertLedger = db.prepare(`
          INSERT INTO client_payments (client_id, sale_id, amount, date, method, notes, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const saleDate = data.date;
        const createdBy = data.created_by || null;

        if (isReturn) {
          // Return credits the client: total is negative, balance += |total|
          const creditAmt = Math.abs(total);
          db.prepare(`UPDATE clients SET balance = balance + ? WHERE id = ?`).run(creditAmt, data.client_id);
          insertLedger.run(
            data.client_id, saleId, creditAmt, saleDate, 'return',
            data.notes ? `[Return] ${data.notes}` : '[Return]',
            createdBy
          );
        } else if (total > paidAmount) {
          // Partial/credit: client owes the shortfall (balance goes more negative)
          const debt = money(total - paidAmount);
          db.prepare(`UPDATE clients SET balance = balance - ? WHERE id = ?`).run(debt, data.client_id);
          // Record the paid portion (if any) in the ledger so partial sales show up in history
          if (paidAmount > 0) {
            insertLedger.run(
              data.client_id, saleId, paidAmount, saleDate, 'cash',
              data.notes || null, createdBy
            );
          }
        } else if (paidAmount > total) {
          // Overpayment: two ledger rows — the portion covering the sale + the excess as credit
          const credit = money(paidAmount - total);
          db.prepare(`UPDATE clients SET balance = balance + ? WHERE id = ?`).run(credit, data.client_id);
          if (total > 0) {
            insertLedger.run(data.client_id, saleId, total, saleDate, 'cash', data.notes || null, createdBy);
          }
          insertLedger.run(data.client_id, null, credit, saleDate, 'credit_carry', data.notes || null, createdBy);
        } else if (paidAmount > 0) {
          // Exact cash sale — no balance change, but record the payment for history
          insertLedger.run(
            data.client_id, saleId, paidAmount, saleDate, 'cash',
            data.notes || null, createdBy
          );
        }
      }

      return { lastInsertRowid: saleId, changes: 1, skipped: false };
    })();
  },

  updateSale: (id, data) => {
    return db.transaction(() => {
      // Get old sale to calculate balance difference
      const oldSale = db.prepare(`SELECT * FROM sales WHERE id = ?`).get(id);

      const result = db.prepare(`
        UPDATE sales SET
          client_id = ?,
          date = ?,
          total = ?,
          paid_amount = ?,
          status = ?,
          notes = ?
        WHERE id = ?
      `).run(
        data.client_id,
        data.date,
        data.total,
        data.paid_amount,
        data.status,
        data.notes || null,
        id
      );

      // Adjust client balance + write an audit row so the history panel stays
      // consistent with the running balance. Any balance delta produced by
      // editing a sale is recorded as a method='adjustment' ledger entry.
      if (oldSale) {
        const oldDebt = oldSale.total - oldSale.paid_amount;
        const newDebt = data.total - data.paid_amount;
        const adjNote = `Sale #${id} updated`;
        const insertLedger = db.prepare(`
          INSERT INTO client_payments (client_id, sale_id, amount, date, method, notes, created_by)
          VALUES (?, ?, ?, ?, 'adjustment', ?, ?)
        `);

        if (oldSale.client_id !== data.client_id) {
          // Client changed: restore old client's balance, charge new client
          if (oldDebt > 0 && oldSale.client_id) {
            db.prepare(`UPDATE clients SET balance = balance + ? WHERE id = ?`).run(oldDebt, oldSale.client_id);
            insertLedger.run(oldSale.client_id, null, oldDebt, data.date, `${adjNote} (client reassigned)`, data.created_by || null);
          }
          if (newDebt > 0 && data.client_id) {
            db.prepare(`UPDATE clients SET balance = balance - ? WHERE id = ?`).run(newDebt, data.client_id);
            insertLedger.run(data.client_id, id, -newDebt, data.date, `${adjNote} (new owner of sale)`, data.created_by || null);
          }
        } else {
          // Same client: adjust by the difference
          const balanceChange = money(oldDebt - newDebt);
          if (balanceChange !== 0 && data.client_id) {
            db.prepare(`UPDATE clients SET balance = balance + ? WHERE id = ?`).run(balanceChange, data.client_id);
            insertLedger.run(data.client_id, id, balanceChange, data.date, adjNote, data.created_by || null);
          }
        }
      }

      return result;
    })();
  },

  // Per-sale payment. Also records a client_payments ledger row so the entry shows
  // up in the client's payment history and can be edited/deleted later.
  addPayment: (id, amount, opts = {}) => {
    return db.transaction(() => {
      const sale = db.prepare(`SELECT * FROM sales WHERE id = ?`).get(id);
      if (!sale) throw new Error('Sale not found');
      const amt = money(amount);
      if (amt <= 0) throw new Error('Payment amount must be positive');

      const newPaidAmount = money(sale.paid_amount + amt);
      const remaining = money(sale.total - newPaidAmount);

      let newStatus = sale.status;
      if (remaining <= 0) newStatus = 'paid';
      else if (newPaidAmount > 0) newStatus = 'partial';

      db.prepare(`
        UPDATE sales SET paid_amount = ?, status = ? WHERE id = ?
      `).run(newPaidAmount, newStatus, id);

      if (sale.client_id) {
        db.prepare(`UPDATE clients SET balance = balance + ? WHERE id = ?`).run(amt, sale.client_id);

        // Ledger entry
        db.prepare(`
          INSERT INTO client_payments (client_id, sale_id, amount, date, method, notes, batch_id, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sale.client_id,
          sale.id,
          amt,
          opts.date || new Date().toISOString().split('T')[0],
          opts.method || 'cash',
          opts.notes || null,
          opts.batch_id || null,
          opts.created_by || null,
        );
      }

      return { success: true, new_status: newStatus, remaining: Math.max(0, remaining) };
    })();
  },

  // Versement global — one amount from the client, allocated FIFO across unpaid
  // sales (oldest first), any excess stored as a credit_carry row on the account.
  // Returns { totalApplied, creditCarry, batchId, allocations: [{payment_id, sale_id, amount}] }.
  recordClientPayment: (clientId, amount, opts = {}) => {
    return db.transaction(() => {
      const amt = money(amount);
      if (!clientId) throw new Error('Client is required');
      if (amt <= 0) throw new Error('Payment amount must be positive');

      const exists = db.prepare('SELECT 1 FROM clients WHERE id = ?').get(clientId);
      if (!exists) throw new Error('Client not found');

      const date = opts.date || new Date().toISOString().split('T')[0];
      const method = opts.method || 'cash';
      const notes = opts.notes || null;
      const createdBy = opts.created_by || null;
      const batchId = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const unpaid = db.prepare(`
        SELECT id, total, paid_amount, status FROM sales
        WHERE client_id = ?
          AND status NOT IN ('paid', 'cancelled', 'return')
          AND (total - paid_amount) > 0
        ORDER BY date ASC, id ASC
      `).all(clientId);

      const insertPayment = db.prepare(`
        INSERT INTO client_payments (client_id, sale_id, amount, date, method, notes, batch_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const updateSale = db.prepare(`UPDATE sales SET paid_amount = ?, status = ? WHERE id = ?`);
      const updateBalance = db.prepare(`UPDATE clients SET balance = balance + ? WHERE id = ?`);

      let remaining = amt;
      const allocations = [];

      for (const sale of unpaid) {
        if (remaining <= 0) break;
        const outstanding = money(sale.total - sale.paid_amount);
        if (outstanding <= 0) continue;
        const allocate = money(Math.min(remaining, outstanding));

        const newPaid = money(sale.paid_amount + allocate);
        const newStatus = newPaid >= sale.total ? 'paid' : 'partial';
        updateSale.run(newPaid, newStatus, sale.id);

        const res = insertPayment.run(clientId, sale.id, allocate, date, method, notes, batchId, createdBy);
        updateBalance.run(allocate, clientId);

        allocations.push({ payment_id: res.lastInsertRowid, sale_id: sale.id, amount: allocate });
        remaining = money(remaining - allocate);
      }

      let creditCarry = 0;
      if (remaining > 0) {
        // Excess becomes on-account credit
        const res = insertPayment.run(clientId, null, remaining, date, 'credit_carry', notes, batchId, createdBy);
        updateBalance.run(remaining, clientId);
        allocations.push({ payment_id: res.lastInsertRowid, sale_id: null, amount: remaining });
        creditCarry = remaining;
      }

      return {
        success: true,
        batchId,
        totalApplied: money(amt - creditCarry),
        creditCarry,
        allocations,
      };
    })();
  },

  // Payment history for one client. Joins sale info so the UI can show "paid 500 against sale #42".
  getClientPayments: (clientId) => {
    return db.prepare(`
      SELECT cp.*,
        s.date   as sale_date,
        s.total  as sale_total,
        s.status as sale_status,
        u.name   as created_by_name
      FROM client_payments cp
      LEFT JOIN sales s ON cp.sale_id = s.id
      LEFT JOIN users u ON cp.created_by = u.id
      WHERE cp.client_id = ?
      ORDER BY cp.date DESC, cp.id DESC
    `).all(clientId);
  },

  // Edit an existing payment row: reverse the old effect, apply the new.
  // Only `amount`, `date`, `notes` are editable — not client/sale link or method
  // (changing method would require reversing and re-applying with different semantics).
  updateClientPayment: (id, data) => {
    return db.transaction(() => {
      const p = db.prepare('SELECT * FROM client_payments WHERE id = ?').get(id);
      if (!p) throw new Error('Payment not found');

      const newAmount = data.amount != null ? money(data.amount) : p.amount;
      if (newAmount === 0) {
        throw new Error('Amount cannot be zero — delete the entry instead');
      }
      if (newAmount < 0 && p.method !== 'adjustment') {
        throw new Error('Only adjustment entries can have negative amounts');
      }

      const delta = money(newAmount - p.amount);

      // If this payment is tied to a sale, mirror the delta into sale.paid_amount
      // and recompute its status.
      if (p.sale_id) {
        const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(p.sale_id);
        if (sale) {
          const newPaid = money(sale.paid_amount + delta);
          if (newPaid < 0) throw new Error('Edit would make sale paid_amount negative');
          if (newPaid > sale.total) {
            throw new Error('Edit would overpay the sale — record the excess as an adjustment instead');
          }
          const newStatus = newPaid >= sale.total ? 'paid'
            : newPaid > 0 ? 'partial'
            : 'pending';
          db.prepare('UPDATE sales SET paid_amount = ?, status = ? WHERE id = ?').run(newPaid, newStatus, sale.id);
        }
      }

      // Mirror into client balance
      db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?').run(delta, p.client_id);

      db.prepare(`
        UPDATE client_payments
        SET amount = ?, date = ?, notes = ?
        WHERE id = ?
      `).run(
        newAmount,
        data.date || p.date,
        data.notes !== undefined ? data.notes : p.notes,
        id
      );

      return { success: true, delta };
    })();
  },

  // Reverse and delete a payment entry. If tied to a sale, walks back the sale's
  // paid_amount and recomputes status. Always walks back the client balance.
  deleteClientPayment: (id) => {
    return db.transaction(() => {
      const p = db.prepare('SELECT * FROM client_payments WHERE id = ?').get(id);
      if (!p) throw new Error('Payment not found');

      if (p.sale_id) {
        const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(p.sale_id);
        if (sale) {
          const newPaid = money(sale.paid_amount - p.amount);
          if (newPaid < 0) {
            // Shouldn't happen in practice, but fail loud rather than corrupt data
            throw new Error('Reversal would make sale paid_amount negative');
          }
          const newStatus = newPaid >= sale.total ? 'paid'
            : newPaid > 0 ? 'partial'
            : 'pending';
          db.prepare('UPDATE sales SET paid_amount = ?, status = ? WHERE id = ?').run(newPaid, newStatus, sale.id);
        }
      }
      db.prepare('UPDATE clients SET balance = balance - ? WHERE id = ?').run(p.amount, p.client_id);
      db.prepare('DELETE FROM client_payments WHERE id = ?').run(id);

      return { success: true };
    })();
  },

  // Admin-only manual balance adjustment. `delta` is signed:
  //   positive  → credits the client (reduces their debt)
  //   negative  → adds to the client's debt (rare — e.g., correcting an overcredited entry)
  // Creates a client_payments row with method='adjustment' so every touch is auditable.
  adjustClientBalance: (clientId, delta, reason, opts = {}) => {
    return db.transaction(() => {
      const d = money(delta);
      if (!clientId) throw new Error('Client is required');
      if (d === 0) throw new Error('Adjustment delta cannot be zero');
      if (!reason || !String(reason).trim()) throw new Error('A reason is required for balance adjustments');

      const exists = db.prepare('SELECT 1 FROM clients WHERE id = ?').get(clientId);
      if (!exists) throw new Error('Client not found');

      const res = db.prepare(`
        INSERT INTO client_payments (client_id, sale_id, amount, date, method, notes, created_by)
        VALUES (?, NULL, ?, ?, 'adjustment', ?, ?)
      `).run(
        clientId,
        d,
        opts.date || new Date().toISOString().split('T')[0],
        String(reason).trim(),
        opts.created_by || null,
      );

      db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?').run(d, clientId);

      return { success: true, paymentId: res.lastInsertRowid };
    })();
  },

  deleteSale: (id) => {
    return db.transaction(() => {
      const sale = db.prepare(`SELECT * FROM sales WHERE id = ?`).get(id);

      if (sale) {
        // Restore client balance
        const debt = sale.total - sale.paid_amount;
        if (debt > 0 && sale.client_id) {
          db.prepare(`UPDATE clients SET balance = balance + ? WHERE id = ?`).run(debt, sale.client_id);
        }

        // Restore product quantities for all items in this sale
        const items = db.prepare(`SELECT product_id, quantity FROM sale_items WHERE sale_id = ?`).all(id);
        for (const item of items) {
          db.prepare(`UPDATE products SET quantity = quantity + ? WHERE id = ?`).run(item.quantity, item.product_id);
        }
      }

      // Delete sale items
      db.prepare(`DELETE FROM sale_items WHERE sale_id = ?`).run(id);
      // Delete sale
      return db.prepare(`DELETE FROM sales WHERE id = ?`).run(id);
    })();
  },

  // ============================================
  // SALE ITEMS
  // ============================================
  getSaleItems: (saleId) => {
    return db.prepare(`
      SELECT
        si.*,
        p.name as product_name,
        p.unit as product_unit
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(saleId);
  },

  addSaleItem: (data) => {
    return db.transaction(() => {
      const itemTotal = data.total || (data.quantity * data.unit_price);
      const result = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?)
      `).run(data.sale_id, data.product_id, data.quantity, data.unit_price, itemTotal);

      // Deduct product quantity from inventory
      db.prepare(`UPDATE products SET quantity = quantity - ? WHERE id = ?`)
        .run(data.quantity, data.product_id);

      return result;
    })();
  },

  updateSaleItem: (id, data) => {
    return db.transaction(() => {
      const oldItem = db.prepare(`SELECT * FROM sale_items WHERE id = ?`).get(id);

      const newItemTotal = money(data.quantity * data.unit_price);
      const result = db.prepare(`
        UPDATE sale_items SET
          product_id = ?,
          quantity = ?,
          unit_price = ?,
          total = ?
        WHERE id = ?
      `).run(
        data.product_id,
        data.quantity,
        money(data.unit_price),
        newItemTotal,
        id
      );

      if (oldItem) {
        const oldItemTotal = money(oldItem.quantity * oldItem.unit_price);
        const difference = money(newItemTotal - oldItemTotal);

        const sale = db.prepare(`SELECT * FROM sales WHERE id = ?`).get(oldItem.sale_id);
        const newTotal = money(sale.total + difference);

        // Recompute status from new total vs paid_amount
        let newStatus = sale.status;
        if (sale.status !== 'return' && sale.status !== 'cancelled') {
          if (newTotal <= 0) {
            newStatus = 'paid';
          } else if (sale.paid_amount <= 0) {
            newStatus = 'pending';
          } else if (sale.paid_amount >= newTotal) {
            newStatus = 'paid';
          } else {
            newStatus = 'partial';
          }
        }

        db.prepare(`UPDATE sales SET total = ?, status = ? WHERE id = ?`).run(newTotal, newStatus, oldItem.sale_id);

        // Update client balance + audit row so the history panel stays consistent.
        if (sale.client_id && difference !== 0) {
          db.prepare(`UPDATE clients SET balance = balance - ? WHERE id = ?`).run(difference, sale.client_id);
          // Balance moved DOWN (client owes more) when difference > 0, so ledger delta is -difference
          db.prepare(`
            INSERT INTO client_payments (client_id, sale_id, amount, date, method, notes)
            VALUES (?, ?, ?, ?, 'adjustment', ?)
          `).run(sale.client_id, sale.id, -difference, sale.date, `Sale #${sale.id} item #${id} edited`);
        }

        // Update product quantities
        if (data.product_id !== oldItem.product_id) {
          db.prepare(`UPDATE products SET quantity = quantity + ? WHERE id = ?`).run(oldItem.quantity, oldItem.product_id);
          db.prepare(`UPDATE products SET quantity = quantity - ? WHERE id = ?`).run(data.quantity, data.product_id);
        } else {
          const quantityDifference = data.quantity - oldItem.quantity;
          db.prepare(`UPDATE products SET quantity = quantity - ? WHERE id = ?`).run(quantityDifference, data.product_id);
        }
      }

      return result;
    })();
  },

  deleteSaleItem: (id) => {
    return db.transaction(() => {
      const item = db.prepare(`SELECT * FROM sale_items WHERE id = ?`).get(id);

      if (item) {
        const itemTotal = money(item.quantity * item.unit_price);
        const sale = db.prepare(`SELECT * FROM sales WHERE id = ?`).get(item.sale_id);
        const newTotal = money(sale.total - itemTotal);

        db.prepare(`UPDATE sales SET total = ? WHERE id = ?`).run(newTotal, item.sale_id);

        // Update client balance + audit row (removing an item reduces the client's debt)
        if (sale.client_id && itemTotal !== 0) {
          db.prepare(`UPDATE clients SET balance = balance + ? WHERE id = ?`).run(itemTotal, sale.client_id);
          db.prepare(`
            INSERT INTO client_payments (client_id, sale_id, amount, date, method, notes)
            VALUES (?, ?, ?, ?, 'adjustment', ?)
          `).run(sale.client_id, sale.id, itemTotal, sale.date, `Sale #${sale.id} item removed`);
        }

        // Restore product quantity
        db.prepare(`UPDATE products SET quantity = quantity + ? WHERE id = ?`).run(item.quantity, item.product_id);
      }

      return db.prepare(`DELETE FROM sale_items WHERE id = ?`).run(id);
    })();
  },

  // ============================================
  // STATISTICS
  // ============================================
  getClientStats: () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startOfMonth = `${year}-${month}-01`;
    const endOfMonth = lastDayOfMonth(year, now.getMonth() + 1);

    const staticStats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM clients) as total_clients,
        (SELECT COUNT(*) FROM sales) as total_sales,
        (SELECT COALESCE(SUM(total), 0) FROM sales) as total_revenue,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM sales) as total_collected,
        (SELECT COALESCE(SUM(total - paid_amount), 0) FROM sales WHERE status != 'paid') as total_outstanding,
        (SELECT COUNT(*) FROM clients WHERE balance < 0) as clients_with_debt
    `).get();

    const monthStats = db.prepare(`
      SELECT
        COUNT(*) as month_sales,
        COALESCE(SUM(total), 0) as month_revenue
      FROM sales
      WHERE date BETWEEN ? AND ?
    `).get(startOfMonth, endOfMonth);

    return { ...staticStats, ...monthStats };
  },

  getSalesSummary: (year, month) => {
    let dateFilter = '';
    const params = [];

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = lastDayOfMonth(year, month);
      dateFilter = `WHERE s.date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    } else if (year) {
      dateFilter = `WHERE strftime('%Y', s.date) = ?`;
      params.push(String(year));
    }

    return db.prepare(`
      SELECT
        c.id as client_id,
        c.name as client_name,
        COUNT(s.id) as sale_count,
        COALESCE(SUM(s.total), 0) as total_amount,
        COALESCE(SUM(s.paid_amount), 0) as paid_amount,
        COALESCE(SUM(s.total - s.paid_amount), 0) as outstanding
      FROM clients c
      LEFT JOIN sales s ON c.id = s.client_id ${dateFilter ? dateFilter.replace('WHERE', 'AND') : ''}
      GROUP BY c.id
      ORDER BY total_amount DESC
    `).all(...params);
  },

  getTopProducts: (limit = 10) => {
    return db.prepare(`
      SELECT
        p.id,
        p.name,
        p.unit,
        COALESCE(SUM(si.quantity), 0) as total_sold,
        COALESCE(SUM(si.quantity * si.unit_price), 0) as total_revenue
      FROM products p
      LEFT JOIN sale_items si ON p.id = si.product_id
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT ?
    `).all(limit);
  },

  getMonthlySales: (year) => {
    return db.prepare(`
      SELECT
        strftime('%m', date) as month,
        COUNT(*) as sale_count,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(paid_amount), 0) as collected
      FROM sales
      WHERE strftime('%Y', date) = ?
      GROUP BY strftime('%m', date)
      ORDER BY month
    `).all(String(year));
  }
});

module.exports = { clientsQueries };
