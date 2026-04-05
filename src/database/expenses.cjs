// Expenses database operations

const expensesQueries = (db) => ({
  // ============================================
  // EXPENSE CATEGORIES
  // ============================================
  getAllCategories: () => {
    return db.prepare(`
      SELECT * FROM expense_categories ORDER BY name
    `).all();
  },

  addCategory: (name, description) => {
    return db.prepare(`
      INSERT INTO expense_categories (name, description) VALUES (?, ?)
    `).run(name, description);
  },

  updateCategory: (id, name, description) => {
    return db.prepare(`
      UPDATE expense_categories SET name = ?, description = ? WHERE id = ?
    `).run(name, description, id);
  },

  deleteCategory: (id) => {
    return db.prepare(`DELETE FROM expense_categories WHERE id = ?`).run(id);
  },

  // ============================================
  // EXPENSES
  // ============================================
  getAllExpenses: () => {
    return db.prepare(`
      SELECT
        e.*,
        ec.name as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      ORDER BY e.date DESC, e.created_at DESC
    `).all();
  },

  getExpenseById: (id) => {
    return db.prepare(`
      SELECT
        e.*,
        ec.name as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.id = ?
    `).get(id);
  },

  getExpensesByCategory: (categoryId) => {
    return db.prepare(`
      SELECT
        e.*,
        ec.name as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.category_id = ?
      ORDER BY e.date DESC
    `).all(categoryId);
  },

  getExpensesByDateRange: (startDate, endDate) => {
    return db.prepare(`
      SELECT
        e.*,
        ec.name as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.date BETWEEN ? AND ?
      ORDER BY e.date DESC
    `).all(startDate, endDate);
  },

  getExpensesByMonth: (year, month) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    return db.prepare(`
      SELECT
        e.*,
        ec.name as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.date BETWEEN ? AND ?
      ORDER BY e.date DESC
    `).all(startDate, endDate);
  },

  searchExpenses: (query) => {
    return db.prepare(`
      SELECT
        e.*,
        ec.name as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.description LIKE ? OR ec.name LIKE ? OR e.notes LIKE ?
      ORDER BY e.date DESC
    `).all(`%${query}%`, `%${query}%`, `%${query}%`);
  },

  addExpense: (data) => {
    return db.prepare(`
      INSERT INTO expenses (category_id, description, amount, date, is_recurring, recurring_period, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.category_id,
      data.description || null,
      data.amount,
      data.date,
      data.is_recurring ? 1 : 0,
      data.recurring_period || null,
      data.notes || null
    );
  },

  updateExpense: (id, data) => {
    return db.prepare(`
      UPDATE expenses SET
        category_id = ?,
        description = ?,
        amount = ?,
        date = ?,
        is_recurring = ?,
        recurring_period = ?,
        notes = ?
      WHERE id = ?
    `).run(
      data.category_id,
      data.description || null,
      data.amount,
      data.date,
      data.is_recurring ? 1 : 0,
      data.recurring_period || null,
      data.notes || null,
      id
    );
  },

  deleteExpense: (id) => {
    return db.prepare(`DELETE FROM expenses WHERE id = ?`).run(id);
  },

  // ============================================
  // STATISTICS
  // ============================================
  getExpenseStats: () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startOfMonth = `${year}-${month}-01`;
    const endOfMonth = `${year}-${month}-31`;

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM expenses
    `).get();

    const monthStats = db.prepare(`
      SELECT
        COUNT(*) as month_count,
        COALESCE(SUM(amount), 0) as month_amount
      FROM expenses
      WHERE date BETWEEN ? AND ?
    `).get(startOfMonth, endOfMonth);

    return {
      ...stats,
      ...monthStats
    };
  },

  getMonthlySummary: (year) => {
    return db.prepare(`
      SELECT
        strftime('%m', date) as month,
        COUNT(*) as count,
        SUM(amount) as total
      FROM expenses
      WHERE strftime('%Y', date) = ?
      GROUP BY strftime('%m', date)
      ORDER BY month
    `).all(String(year));
  },

  getCategorySummary: (year, month) => {
    let query = `
      SELECT
        ec.id as category_id,
        ec.name as category_name,
        COUNT(e.id) as count,
        COALESCE(SUM(e.amount), 0) as total
      FROM expense_categories ec
      LEFT JOIN expenses e ON ec.id = e.category_id
    `;

    const params = [];
    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      query += ` WHERE e.date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    } else if (year) {
      query += ` WHERE strftime('%Y', e.date) = ?`;
      params.push(String(year));
    }

    query += ` GROUP BY ec.id ORDER BY total DESC`;

    return db.prepare(query).all(...params);
  },

  getRecurringExpenses: () => {
    return db.prepare(`
      SELECT
        e.*,
        ec.name as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.is_recurring = 1
      ORDER BY e.date DESC
    `).all();
  }
});

module.exports = { expensesQueries };
