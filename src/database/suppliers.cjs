// Suppliers database operations

const suppliersQueries = (db) => ({
  // ============================================
  // SUPPLIERS
  // ============================================
  getAllSuppliers: () => {
    return db.prepare(`
      SELECT
        s.*,
        (SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id) as purchase_count,
        (SELECT COALESCE(SUM(total), 0) FROM purchases WHERE supplier_id = s.id) as total_purchases
      FROM suppliers s
      ORDER BY s.name
    `).all();
  },

  getSupplierById: (id) => {
    return db.prepare(`
      SELECT
        s.*,
        (SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id) as purchase_count,
        (SELECT COALESCE(SUM(total), 0) FROM purchases WHERE supplier_id = s.id) as total_purchases
      FROM suppliers s
      WHERE s.id = ?
    `).get(id);
  },

  searchSuppliers: (query) => {
    return db.prepare(`
      SELECT
        s.*,
        (SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id) as purchase_count,
        (SELECT COALESCE(SUM(total), 0) FROM purchases WHERE supplier_id = s.id) as total_purchases
      FROM suppliers s
      WHERE s.name LIKE ? OR s.phone LIKE ? OR s.email LIKE ? OR s.address LIKE ?
      ORDER BY s.name
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
  },

  // Opening balance semantics:
  //   initial_balance < 0 → shop already owes this supplier X (pre-existing AP)
  //   initial_balance > 0 → shop already has prepayment credit with them
  // When provided, writes a matching 'opening_balance' row to supplier_payments
  // so the audit reconciles correctly.
  addSupplier: (data) => {
    return db.transaction(() => {
      const initial = Math.round((Number(data.initial_balance) || 0) * 100) / 100;
      const res = db.prepare(`
        INSERT INTO suppliers (name, phone, address, email, notes, balance)
        VALUES (?, ?, ?, ?, ?, 0)
      `).run(
        data.name,
        data.phone || null,
        data.address || null,
        data.email || null,
        data.notes || null
      );
      const newId = res.lastInsertRowid;
      if (initial !== 0) {
        db.prepare(`
          INSERT INTO supplier_payments
            (supplier_id, purchase_id, amount, date, method, notes, batch_id, created_by)
          VALUES (?, NULL, ?, ?, 'opening_balance', ?, ?, ?)
        `).run(
          newId,
          initial,
          new Date().toISOString().slice(0, 10),
          'Opening balance on supplier creation',
          `sup-opening-${newId}`,
          data.created_by || null
        );
        db.prepare('UPDATE suppliers SET balance = ? WHERE id = ?').run(initial, newId);
      }
      return { lastInsertRowid: newId, changes: 1 };
    })();
  },

  updateSupplier: (id, data) => {
    return db.prepare(`
      UPDATE suppliers SET
        name = ?,
        phone = ?,
        address = ?,
        email = ?,
        notes = ?,
        balance = ?
      WHERE id = ?
    `).run(
      data.name,
      data.phone || null,
      data.address || null,
      data.email || null,
      data.notes || null,
      data.balance || 0,
      id
    );
  },

  updateSupplierBalance: (id, amount) => {
    return db.prepare(`
      UPDATE suppliers SET balance = balance + ? WHERE id = ?
    `).run(amount, id);
  },

  deleteSupplier: (id) => {
    return db.prepare(`DELETE FROM suppliers WHERE id = ?`).run(id);
  },

  // ============================================
  // SUPPLIER PAYMENTS LEDGER
  // Every money movement on a supplier's balance runs through here so the
  // audit math (balance = SUM(payments) − SUM(unpaid purchase remainders))
  // stays honest. Mirrors client_payments exactly.
  // ============================================

  // Record a payment to a supplier. If purchase_id is set, also updates
  // that purchase's paid_amount + status. If not, the payment stacks as
  // on-account prepayment credit with the supplier.
  recordSupplierPayment: (data) => {
    const amount = Number(data.amount) || 0;
    if (amount === 0) throw new Error('Amount cannot be zero');
    const date = data.date || new Date().toISOString().slice(0, 10);
    return db.transaction(() => {
      const res = db.prepare(`
        INSERT INTO supplier_payments
          (supplier_id, purchase_id, amount, date, method, notes, batch_id, created_by, remote_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.supplier_id,
        data.purchase_id || null,
        amount,
        date,
        data.method || 'cash',
        data.notes || null,
        data.batch_id || null,
        data.created_by || null,
        data.remote_id || null
      );
      // Shop pays supplier → shop's debt to supplier goes DOWN → supplier
      // balance moves toward zero / positive. Balance += amount mirrors the
      // client flow; the sign interpretation is inverted but the math is
      // identical because we store balance as (paid − owed).
      db.prepare('UPDATE suppliers SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(amount, data.supplier_id);
      if (data.purchase_id) {
        const purchase = db.prepare('SELECT total, paid_amount FROM purchases WHERE id = ?').get(data.purchase_id);
        if (purchase) {
          const newPaid = Math.round((purchase.paid_amount + amount) * 100) / 100;
          const newStatus = newPaid >= purchase.total ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
          db.prepare('UPDATE purchases SET paid_amount = ?, status = ? WHERE id = ?')
            .run(newPaid, newStatus, data.purchase_id);
        }
      }
      return { id: res.lastInsertRowid };
    })();
  },

  // Versement-style: apply one lump sum across oldest unpaid purchases FIFO,
  // excess becomes prepayment credit. Mirrors the client versement flow.
  recordSupplierVersement: (supplierId, amount, opts = {}) => {
    const amt = Math.round((Number(amount) || 0) * 100) / 100;
    if (amt <= 0) throw new Error('Amount must be positive');
    const date = opts.date || new Date().toISOString().slice(0, 10);
    const batchId = `sup-versement-${Date.now()}`;
    return db.transaction(() => {
      const unpaid = db.prepare(`
        SELECT id, total, paid_amount FROM purchases
         WHERE supplier_id = ? AND status NOT IN ('paid', 'cancelled')
           AND (total - paid_amount) > 0
         ORDER BY date ASC, id ASC
      `).all(supplierId);
      let remaining = amt;
      const allocations = [];
      for (const p of unpaid) {
        if (remaining <= 0) break;
        const outstanding = Math.round((p.total - p.paid_amount) * 100) / 100;
        if (outstanding <= 0) continue;
        const allocate = Math.min(remaining, outstanding);
        const newPaid = Math.round((p.paid_amount + allocate) * 100) / 100;
        const newStatus = newPaid >= p.total ? 'paid' : 'partial';
        db.prepare('UPDATE purchases SET paid_amount = ?, status = ? WHERE id = ?')
          .run(newPaid, newStatus, p.id);
        const res = db.prepare(`
          INSERT INTO supplier_payments
            (supplier_id, purchase_id, amount, date, method, notes, batch_id, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(supplierId, p.id, allocate, date, opts.method || 'cash', opts.notes || null, batchId, opts.created_by || null);
        db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(allocate, supplierId);
        allocations.push({ payment_id: res.lastInsertRowid, purchase_id: p.id, amount: allocate });
        remaining = Math.round((remaining - allocate) * 100) / 100;
      }
      let prepayCarry = 0;
      if (remaining > 0) {
        const res = db.prepare(`
          INSERT INTO supplier_payments
            (supplier_id, purchase_id, amount, date, method, notes, batch_id, created_by)
          VALUES (?, NULL, ?, ?, 'prepayment', ?, ?, ?)
        `).run(supplierId, remaining, date, opts.notes || null, batchId, opts.created_by || null);
        db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(remaining, supplierId);
        allocations.push({ payment_id: res.lastInsertRowid, purchase_id: null, amount: remaining });
        prepayCarry = remaining;
      }
      return { batchId, totalApplied: amt - prepayCarry, prepayCarry, allocations };
    })();
  },

  getSupplierPayments: (supplierId) => {
    return db.prepare(`
      SELECT sp.*, p.reference AS purchase_reference, p.date AS purchase_date
      FROM supplier_payments sp
      LEFT JOIN purchases p ON sp.purchase_id = p.id
      WHERE sp.supplier_id = ?
      ORDER BY sp.created_at DESC
    `).all(supplierId);
  },

  deleteSupplierPayment: (id) => {
    return db.transaction(() => {
      const existing = db.prepare('SELECT * FROM supplier_payments WHERE id = ?').get(id);
      if (!existing) return { changes: 0 };
      if (existing.purchase_id) {
        const purchase = db.prepare('SELECT total, paid_amount FROM purchases WHERE id = ?').get(existing.purchase_id);
        if (purchase) {
          const newPaid = Math.max(0, Math.round((purchase.paid_amount - existing.amount) * 100) / 100);
          const newStatus = newPaid >= purchase.total ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
          db.prepare('UPDATE purchases SET paid_amount = ?, status = ? WHERE id = ?')
            .run(newPaid, newStatus, existing.purchase_id);
        }
      }
      db.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?').run(existing.amount, existing.supplier_id);
      db.prepare('DELETE FROM supplier_payments WHERE id = ?').run(id);
      return { changes: 1 };
    })();
  },

  // Audit: compare stored balance vs what history says it should be.
  auditSuppliers: () => {
    const rows = db.prepare(`
      SELECT
        s.id, s.name, s.phone, s.balance AS stored_balance,
        COALESCE((SELECT SUM(amount) FROM supplier_payments WHERE supplier_id = s.id), 0) AS sum_payments,
        COALESCE((SELECT SUM(total - paid_amount) FROM purchases
                   WHERE supplier_id = s.id AND status NOT IN ('paid','cancelled')), 0) AS sum_unpaid
      FROM suppliers s
      ORDER BY s.name ASC
    `).all();
    return rows.map(r => {
      // For suppliers: balance = payments_made - unpaid_invoices
      // Negative balance means shop still owes the supplier.
      const expected = Math.round((r.sum_payments - r.sum_unpaid) * 100) / 100;
      const stored   = Math.round(r.stored_balance * 100) / 100;
      const drift    = Math.round((stored - expected) * 100) / 100;
      return {
        id: r.id, name: r.name, phone: r.phone,
        stored_balance: stored, expected_balance: expected, drift,
        has_drift: Math.abs(drift) > 0.005,
      };
    });
  },

  repairSupplierBalance: (id, userId) => {
    const client = db.prepare('SELECT id, balance FROM suppliers WHERE id = ?').get(id);
    if (!client) throw new Error('Supplier not found');
    const sumP = db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM supplier_payments WHERE supplier_id = ?').get(id).s;
    const sumO = db.prepare(
      `SELECT COALESCE(SUM(total - paid_amount), 0) AS s FROM purchases
        WHERE supplier_id = ? AND status NOT IN ('paid','cancelled')`
    ).get(id).s;
    const expected = Math.round((sumP - sumO) * 100) / 100;
    const oldBalance = Math.round(client.balance * 100) / 100;
    return db.transaction(() => {
      db.prepare(`
        INSERT INTO supplier_payments
          (supplier_id, purchase_id, amount, date, method, notes, batch_id, created_by)
        VALUES (?, NULL, 0, ?, 'balance_correction', ?, ?, ?)
      `).run(
        id,
        new Date().toISOString().slice(0, 10),
        `Balance corrected from ${oldBalance.toFixed(2)} to ${expected.toFixed(2)}`,
        `sup-repair-${id}-${Date.now()}`,
        userId || null
      );
      db.prepare('UPDATE suppliers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(expected, id);
      return { id, old_balance: oldBalance, balance: expected };
    })();
  },

  // ============================================
  // PURCHASES
  // ============================================
  getAllPurchases: () => {
    return db.prepare(`
      SELECT
        p.*,
        s.name as supplier_name,
        (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as item_count
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.date DESC, p.created_at DESC
    `).all();
  },

  getPurchaseById: (id) => {
    return db.prepare(`
      SELECT
        p.*,
        s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(id);
  },

  getPurchasesBySupplier: (supplierId) => {
    return db.prepare(`
      SELECT
        p.*,
        s.name as supplier_name,
        (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as item_count
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.supplier_id = ?
      ORDER BY p.date DESC
    `).all(supplierId);
  },

  getPurchasesByDateRange: (startDate, endDate) => {
    return db.prepare(`
      SELECT
        p.*,
        s.name as supplier_name,
        (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as item_count
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.date BETWEEN ? AND ?
      ORDER BY p.date DESC
    `).all(startDate, endDate);
  },

  getPurchasesByStatus: (status) => {
    return db.prepare(`
      SELECT
        p.*,
        s.name as supplier_name,
        (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as item_count
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.status = ?
      ORDER BY p.date DESC
    `).all(status);
  },

  addPurchase: (data) => {
    return db.prepare(`
      INSERT INTO purchases (supplier_id, date, total, paid_amount, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.supplier_id,
      data.date,
      data.total || 0,
      data.paid_amount || 0,
      data.status || 'pending',
      data.notes || null
    );
  },

  updatePurchase: (id, data) => {
    return db.prepare(`
      UPDATE purchases SET
        supplier_id = ?,
        date = ?,
        total = ?,
        paid_amount = ?,
        status = ?,
        notes = ?
      WHERE id = ?
    `).run(
      data.supplier_id,
      data.date,
      data.total || 0,
      data.paid_amount || 0,
      data.status || 'pending',
      data.notes || null,
      id
    );
  },

  updatePurchasePayment: (id, paidAmount) => {
    return db.transaction(() => {
      const purchase = db.prepare(`SELECT supplier_id, total, paid_amount FROM purchases WHERE id = ?`).get(id);
      const newPaidAmount = (purchase.paid_amount || 0) + paidAmount;
      let status = 'pending';
      if (newPaidAmount >= purchase.total) {
        status = 'paid';
      } else if (newPaidAmount > 0) {
        status = 'partial';
      }

      // Update the purchase record
      db.prepare(`
        UPDATE purchases SET paid_amount = ?, status = ? WHERE id = ?
      `).run(newPaidAmount, status, id);

      // Decrement supplier balance by the payment amount (supplier owes less)
      db.prepare(`
        UPDATE suppliers SET balance = balance - ? WHERE id = ?
      `).run(paidAmount, purchase.supplier_id);

      return { newPaidAmount, status };
    })();
  },

  deletePurchase: (id) => {
    return db.transaction(() => {
      // Fetch the purchase to know supplier and unpaid balance
      const purchase = db.prepare(`SELECT supplier_id, total, paid_amount, status FROM purchases WHERE id = ?`).get(id);

      // Fetch all items so we can reverse stock
      const purchaseItems = db.prepare(`
        SELECT id, stock_item_id, quantity, unit_price FROM purchase_items WHERE purchase_id = ?
      `).all(id);

      // For each item: decrement stock and record a reversal transaction
      for (const item of purchaseItems) {
        db.prepare(`
          UPDATE stock SET quantity = quantity - ? WHERE id = ?
        `).run(item.quantity, item.stock_item_id);

        db.prepare(`
          INSERT INTO stock_transactions (stock_id, type, quantity, reference_id, reference_type, notes)
          VALUES (?, 'out', ?, ?, 'purchase_delete', 'Stock reversed due to purchase deletion')
        `).run(item.stock_item_id, item.quantity, id);
      }

      // Restore supplier balance for the unpaid portion
      const unpaid = (purchase.total || 0) - (purchase.paid_amount || 0);
      if (unpaid > 0) {
        db.prepare(`
          UPDATE suppliers SET balance = balance - ? WHERE id = ?
        `).run(unpaid, purchase.supplier_id);
      }

      // Delete items then the purchase header
      db.prepare(`DELETE FROM purchase_items WHERE purchase_id = ?`).run(id);
      return db.prepare(`DELETE FROM purchases WHERE id = ?`).run(id);
    })();
  },

  // ============================================
  // PURCHASE ITEMS
  // ============================================
  getPurchaseItems: (purchaseId) => {
    return db.prepare(`
      SELECT
        pi.*,
        st.name as stock_name,
        st.unit as stock_unit
      FROM purchase_items pi
      LEFT JOIN stock st ON pi.stock_item_id = st.id
      WHERE pi.purchase_id = ?
    `).all(purchaseId);
  },

  addPurchaseItem: (data) => {
    return db.transaction(() => {
      const itemTotal = Number(data.total) || (Number(data.quantity) * Number(data.unit_price)) || 0;
      const result = db.prepare(`
        INSERT INTO purchase_items (purchase_id, stock_item_id, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        data.purchase_id,
        data.stock_item_id,
        data.quantity,
        data.unit_price,
        itemTotal
      );

      // Update purchase total
      const items = db.prepare(`
        SELECT COALESCE(SUM(quantity * unit_price), 0) as total
        FROM purchase_items WHERE purchase_id = ?
      `).get(data.purchase_id);

      db.prepare(`UPDATE purchases SET total = ? WHERE id = ?`)
        .run(items.total, data.purchase_id);

      // Increment stock quantity
      db.prepare(`
        UPDATE stock SET quantity = quantity + ? WHERE id = ?
      `).run(data.quantity, data.stock_item_id);

      // Record inbound stock transaction
      db.prepare(`
        INSERT INTO stock_transactions (stock_id, type, quantity, reference_id, reference_type, notes)
        VALUES (?, 'in', ?, ?, 'purchase', 'Stock received via purchase')
      `).run(data.stock_item_id, data.quantity, data.purchase_id);

      return result;
    })();
  },

  updatePurchaseItem: (id, data) => {
    const item = db.prepare(`SELECT purchase_id FROM purchase_items WHERE id = ?`).get(id);

    const itemTotal = Number(data.total) || (Number(data.quantity) * Number(data.unit_price)) || 0;
    const result = db.prepare(`
      UPDATE purchase_items SET
        stock_item_id = ?,
        quantity = ?,
        unit_price = ?,
        total = ?
      WHERE id = ?
    `).run(
      data.stock_item_id,
      data.quantity,
      data.unit_price,
      itemTotal,
      id
    );

    // Update purchase total
    const items = db.prepare(`
      SELECT COALESCE(SUM(quantity * unit_price), 0) as total
      FROM purchase_items WHERE purchase_id = ?
    `).get(item.purchase_id);

    db.prepare(`UPDATE purchases SET total = ? WHERE id = ?`)
      .run(items.total, item.purchase_id);

    return result;
  },

  deletePurchaseItem: (id) => {
    return db.transaction(() => {
      // Fetch item details before deletion so we can reverse stock
      const item = db.prepare(`
        SELECT purchase_id, stock_item_id, quantity FROM purchase_items WHERE id = ?
      `).get(id);

      // Decrement stock quantity to reverse the received goods
      db.prepare(`
        UPDATE stock SET quantity = quantity - ? WHERE id = ?
      `).run(item.quantity, item.stock_item_id);

      // Record outbound reversal transaction
      db.prepare(`
        INSERT INTO stock_transactions (stock_id, type, quantity, reference_id, reference_type, notes)
        VALUES (?, 'out', ?, ?, 'purchase_delete', 'Stock reversed due to purchase item deletion')
      `).run(item.stock_item_id, item.quantity, item.purchase_id);

      // Delete the purchase item
      const result = db.prepare(`DELETE FROM purchase_items WHERE id = ?`).run(id);

      // Recalculate and update purchase total
      const items = db.prepare(`
        SELECT COALESCE(SUM(quantity * unit_price), 0) as total
        FROM purchase_items WHERE purchase_id = ?
      `).get(item.purchase_id);

      db.prepare(`UPDATE purchases SET total = ? WHERE id = ?`)
        .run(items.total, item.purchase_id);

      return result;
    })();
  },

  // ============================================
  // STATISTICS
  // ============================================
  getSupplierStats: () => {
    const now = new Date();
    const year = now.getFullYear();
    const mNum = now.getMonth() + 1;
    const month = String(mNum).padStart(2, '0');
    const startOfMonth = `${year}-${month}-01`;
    const lastDay = new Date(year, mNum, 0).getDate();
    const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    const totalStats = db.prepare(`
      SELECT
        COUNT(*) as total_suppliers,
        (SELECT COUNT(*) FROM purchases) as total_purchases,
        (SELECT COALESCE(SUM(total), 0) FROM purchases) as total_amount,
        (SELECT COALESCE(SUM(total - paid_amount), 0) FROM purchases WHERE status != 'paid') as total_debt
      FROM suppliers
    `).get();

    const monthStats = db.prepare(`
      SELECT
        COUNT(*) as month_purchases,
        COALESCE(SUM(total), 0) as month_amount
      FROM purchases
      WHERE date BETWEEN ? AND ?
    `).get(startOfMonth, endOfMonth);

    return {
      ...totalStats,
      ...monthStats
    };
  },

  getPurchaseSummaryBySupplier: () => {
    return db.prepare(`
      SELECT
        s.id,
        s.name,
        COUNT(p.id) as purchase_count,
        COALESCE(SUM(p.total), 0) as total_amount,
        COALESCE(SUM(p.total - p.paid_amount), 0) as debt_amount
      FROM suppliers s
      LEFT JOIN purchases p ON s.id = p.supplier_id
      GROUP BY s.id
      ORDER BY total_amount DESC
    `).all();
  },

  getUnpaidPurchases: () => {
    return db.prepare(`
      SELECT
        p.*,
        s.name as supplier_name,
        (p.total - p.paid_amount) as remaining
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.status != 'paid'
      ORDER BY p.date ASC
    `).all();
  }
});

module.exports = { suppliersQueries };
