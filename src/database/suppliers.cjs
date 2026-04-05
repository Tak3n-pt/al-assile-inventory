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

  addSupplier: (data) => {
    return db.prepare(`
      INSERT INTO suppliers (name, phone, address, email, notes, balance)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      data.phone || null,
      data.address || null,
      data.email || null,
      data.notes || null,
      data.balance || 0
    );
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
      // Insert the purchase item
      const result = db.prepare(`
        INSERT INTO purchase_items (purchase_id, stock_item_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `).run(
        data.purchase_id,
        data.stock_item_id,
        data.quantity,
        data.unit_price
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

    const result = db.prepare(`
      UPDATE purchase_items SET
        stock_item_id = ?,
        quantity = ?,
        unit_price = ?
      WHERE id = ?
    `).run(
      data.stock_item_id,
      data.quantity,
      data.unit_price,
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
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startOfMonth = `${year}-${month}-01`;
    const endOfMonth = `${year}-${month}-31`;

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
