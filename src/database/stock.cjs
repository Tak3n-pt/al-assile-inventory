// Stock database operations

const stockQueries = (db) => ({
  // ============================================
  // CATEGORIES
  // ============================================
  getAllCategories: () => {
    return db.prepare(`
      SELECT * FROM stock_categories ORDER BY name
    `).all();
  },

  addCategory: (name, description) => {
    return db.prepare(`
      INSERT INTO stock_categories (name, description) VALUES (?, ?)
    `).run(name, description);
  },

  // ============================================
  // STOCK ITEMS
  // ============================================
  getAllStock: () => {
    return db.prepare(`
      SELECT
        s.*,
        sc.name as category_name,
        sup.name as supplier_name,
        CASE WHEN s.quantity <= s.min_stock_alert THEN 1 ELSE 0 END as is_low_stock
      FROM stock s
      LEFT JOIN stock_categories sc ON s.category_id = sc.id
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      ORDER BY s.name
    `).all();
  },

  getStockById: (id) => {
    return db.prepare(`
      SELECT
        s.*,
        sc.name as category_name,
        sup.name as supplier_name
      FROM stock s
      LEFT JOIN stock_categories sc ON s.category_id = sc.id
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      WHERE s.id = ?
    `).get(id);
  },

  getLowStockItems: () => {
    return db.prepare(`
      SELECT
        s.*,
        sc.name as category_name,
        sup.name as supplier_name
      FROM stock s
      LEFT JOIN stock_categories sc ON s.category_id = sc.id
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      WHERE s.quantity <= s.min_stock_alert AND s.min_stock_alert > 0
      ORDER BY s.quantity ASC
    `).all();
  },

  searchStock: (query) => {
    return db.prepare(`
      SELECT
        s.*,
        sc.name as category_name,
        sup.name as supplier_name,
        CASE WHEN s.quantity <= s.min_stock_alert THEN 1 ELSE 0 END as is_low_stock
      FROM stock s
      LEFT JOIN stock_categories sc ON s.category_id = sc.id
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      WHERE s.name LIKE ? OR sc.name LIKE ?
      ORDER BY s.name
    `).all(`%${query}%`, `%${query}%`);
  },

  getStockByCategory: (categoryId) => {
    return db.prepare(`
      SELECT
        s.*,
        sc.name as category_name,
        sup.name as supplier_name,
        CASE WHEN s.quantity <= s.min_stock_alert THEN 1 ELSE 0 END as is_low_stock
      FROM stock s
      LEFT JOIN stock_categories sc ON s.category_id = sc.id
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      WHERE s.category_id = ?
      ORDER BY s.name
    `).all(categoryId);
  },

  addStock: (data) => {
    const runAdd = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO stock (name, category_id, quantity, unit, cost_per_unit, min_stock_alert, supplier_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.name,
        data.category_id || null,
        data.quantity || 0,
        data.unit || 'kg',
        data.cost_per_unit || 0,
        data.min_stock_alert || 0,
        data.supplier_id || null,
        data.notes || null
      );

      // Record initial stock transaction
      if (data.quantity > 0) {
        db.prepare(`
          INSERT INTO stock_transactions (stock_id, type, quantity, unit_cost, notes)
          VALUES (?, 'in', ?, ?, 'Initial stock')
        `).run(result.lastInsertRowid, data.quantity, data.cost_per_unit || 0);
      }

      return result;
    });
    return runAdd();
  },

  updateStock: (id, data) => {
    return db.prepare(`
      UPDATE stock SET
        name = ?,
        category_id = ?,
        unit = ?,
        cost_per_unit = ?,
        min_stock_alert = ?,
        supplier_id = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.name,
      data.category_id || null,
      data.unit || 'kg',
      data.cost_per_unit || 0,
      data.min_stock_alert || 0,
      data.supplier_id || null,
      data.notes || null,
      id
    );
  },

  deleteStock: (id) => {
    return db.prepare(`DELETE FROM stock WHERE id = ?`).run(id);
  },

  // ============================================
  // STOCK QUANTITY OPERATIONS
  // ============================================
  addStockQuantity: (id, quantity, unitCost, notes) => {
    const runAddQty = db.transaction(() => {
      const stock = db.prepare(`SELECT quantity FROM stock WHERE id = ?`).get(id);
      const newQuantity = stock.quantity + quantity;

      db.prepare(`
        UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(newQuantity, id);

      return db.prepare(`
        INSERT INTO stock_transactions (stock_id, type, quantity, unit_cost, notes)
        VALUES (?, 'in', ?, ?, ?)
      `).run(id, quantity, unitCost || 0, notes || null);
    });
    return runAddQty();
  },

  removeStockQuantity: (id, quantity, notes, referenceType, referenceId) => {
    const runRemove = db.transaction(() => {
      const stock = db.prepare(`SELECT quantity FROM stock WHERE id = ?`).get(id);
      if (quantity > stock.quantity) {
        throw new Error(`Insufficient stock: requested ${quantity}, available ${stock.quantity}`);
      }
      const newQuantity = stock.quantity - quantity;

      db.prepare(`
        UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(newQuantity, id);

      return db.prepare(`
        INSERT INTO stock_transactions (stock_id, type, quantity, reference_type, reference_id, notes)
        VALUES (?, 'out', ?, ?, ?, ?)
      `).run(id, quantity, referenceType || null, referenceId || null, notes || null);
    });
    return runRemove();
  },

  adjustStockQuantity: (id, newQuantity, notes) => {
    const stock = db.prepare(`SELECT quantity FROM stock WHERE id = ?`).get(id);
    const difference = newQuantity - stock.quantity;

    db.prepare(`
      UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(newQuantity, id);

    return db.prepare(`
      INSERT INTO stock_transactions (stock_id, type, quantity, notes)
      VALUES (?, 'adjustment', ?, ?)
    `).run(id, difference, notes || 'Manual adjustment');
  },

  // ============================================
  // TRANSACTIONS HISTORY
  // ============================================
  getStockTransactions: (stockId) => {
    return db.prepare(`
      SELECT * FROM stock_transactions
      WHERE stock_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(stockId);
  },

  getAllTransactions: (limit = 50) => {
    return db.prepare(`
      SELECT
        st.*,
        s.name as stock_name,
        s.unit
      FROM stock_transactions st
      LEFT JOIN stock s ON st.stock_id = s.id
      ORDER BY st.created_at DESC
      LIMIT ?
    `).all(limit);
  },

  // ============================================
  // STATISTICS
  // ============================================
  getStockStats: () => {
    return db.prepare(`
      SELECT
        COUNT(*) as total_items,
        SUM(CASE WHEN quantity <= min_stock_alert AND min_stock_alert > 0 THEN 1 ELSE 0 END) as low_stock_count,
        SUM(quantity * cost_per_unit) as total_value
      FROM stock
    `).get();
  }
});

module.exports = { stockQueries };
