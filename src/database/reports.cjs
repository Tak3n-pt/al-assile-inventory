// Reports database operations

const reportsQueries = (db) => ({
  // ============================================
  // PROFIT & LOSS REPORT
  // ============================================
  getProfitLoss: (startDate, endDate) => {
    // Get total revenue from sales
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total_revenue,
             COUNT(*) as sale_count
      FROM sales
      WHERE date BETWEEN ? AND ?
    `).get(startDate, endDate);

    // Get total expenses
    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses,
             COUNT(*) as expense_count
      FROM expenses
      WHERE date BETWEEN ? AND ?
    `).get(startDate, endDate);

    // Get cost of goods sold (from production batches)
    const productionCosts = db.prepare(`
      SELECT COALESCE(SUM(total_cost), 0) as total_production_cost,
             COALESCE(SUM(quantity_produced), 0) as total_produced
      FROM production_batches
      WHERE date BETWEEN ? AND ?
    `).get(startDate, endDate);

    // Get stock purchases cost
    const purchaseCosts = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total_purchase_cost,
             COUNT(*) as purchase_count
      FROM purchases
      WHERE date BETWEEN ? AND ?
    `).get(startDate, endDate);

    const totalRevenue = revenue.total_revenue || 0;
    const totalExpenses = expenses.total_expenses || 0;
    const totalProductionCost = productionCosts.total_production_cost || 0;
    const grossProfit = totalRevenue - totalProductionCost;
    const netProfit = grossProfit - totalExpenses;

    return {
      period: { startDate, endDate },
      revenue: {
        total: totalRevenue,
        saleCount: revenue.sale_count
      },
      costs: {
        production: totalProductionCost,
        purchases: purchaseCosts.total_purchase_cost,
        expenses: totalExpenses,
        expenseCount: expenses.expense_count
      },
      profit: {
        gross: grossProfit,
        net: netProfit,
        margin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0
      }
    };
  },

  getMonthlyProfitLoss: (year) => {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const revenue = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total
        FROM sales WHERE date BETWEEN ? AND ?
      `).get(startDate, endDate);

      const expenses = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses WHERE date BETWEEN ? AND ?
      `).get(startDate, endDate);

      const production = db.prepare(`
        SELECT COALESCE(SUM(total_cost), 0) as total
        FROM production_batches WHERE date BETWEEN ? AND ?
      `).get(startDate, endDate);

      months.push({
        month,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'short' }),
        revenue: revenue.total || 0,
        expenses: expenses.total || 0,
        productionCost: production.total || 0,
        profit: (revenue.total || 0) - (expenses.total || 0) - (production.total || 0)
      });
    }
    return months;
  },

  // ============================================
  // STOCK ALERTS
  // ============================================
  getLowStockItems: () => {
    return db.prepare(`
      SELECT
        s.*,
        sc.name as category_name,
        sup.name as supplier_name,
        (s.min_stock_alert - s.quantity) as shortage_amount
      FROM stock s
      LEFT JOIN stock_categories sc ON s.category_id = sc.id
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      WHERE s.quantity <= s.min_stock_alert AND s.min_stock_alert > 0
      ORDER BY (s.quantity / NULLIF(s.min_stock_alert, 0)) ASC
    `).all();
  },

  getOutOfStockItems: () => {
    return db.prepare(`
      SELECT
        s.*,
        sc.name as category_name,
        sup.name as supplier_name
      FROM stock s
      LEFT JOIN stock_categories sc ON s.category_id = sc.id
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      WHERE s.quantity <= 0
      ORDER BY s.name
    `).all();
  },

  getStockValuation: () => {
    return db.prepare(`
      SELECT
        COALESCE(SUM(quantity * cost_per_unit), 0) as total_value,
        COUNT(*) as total_items,
        SUM(CASE WHEN quantity <= min_stock_alert AND min_stock_alert > 0 THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock_count
      FROM stock
    `).get();
  },

  getStockByCategory: () => {
    return db.prepare(`
      SELECT
        sc.id,
        sc.name as category_name,
        COUNT(s.id) as item_count,
        COALESCE(SUM(s.quantity), 0) as total_quantity,
        COALESCE(SUM(s.quantity * s.cost_per_unit), 0) as total_value
      FROM stock_categories sc
      LEFT JOIN stock s ON s.category_id = sc.id
      GROUP BY sc.id, sc.name
      ORDER BY total_value DESC
    `).all();
  },

  // ============================================
  // PRODUCTION HISTORY
  // ============================================
  getProductionHistory: (limit = 50) => {
    return db.prepare(`
      SELECT
        pb.*,
        p.name as product_name,
        p.selling_price
      FROM production_batches pb
      LEFT JOIN products p ON pb.product_id = p.id
      ORDER BY pb.date DESC, pb.id DESC
      LIMIT ?
    `).all(limit);
  },

  getProductionByProduct: () => {
    return db.prepare(`
      SELECT
        p.id,
        p.name as product_name,
        p.selling_price,
        COUNT(pb.id) as batch_count,
        COALESCE(SUM(pb.quantity_produced), 0) as total_produced,
        COALESCE(SUM(pb.total_cost), 0) as total_cost,
        COALESCE(AVG(pb.total_cost / NULLIF(pb.quantity_produced, 0)), 0) as avg_unit_cost
      FROM products p
      LEFT JOIN production_batches pb ON pb.product_id = p.id
      GROUP BY p.id, p.name, p.selling_price
      ORDER BY total_produced DESC
    `).all();
  },

  getProductionByMonth: (year) => {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const data = db.prepare(`
        SELECT
          COUNT(*) as batch_count,
          COALESCE(SUM(quantity_produced), 0) as total_produced,
          COALESCE(SUM(total_cost), 0) as total_cost
        FROM production_batches
        WHERE date BETWEEN ? AND ?
      `).get(startDate, endDate);

      months.push({
        month,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'short' }),
        ...data
      });
    }
    return months;
  },

  // ============================================
  // SALES REPORTS
  // ============================================
  getSalesByClient: (startDate, endDate) => {
    return db.prepare(`
      SELECT
        c.id,
        c.name as client_name,
        c.phone,
        COUNT(s.id) as sale_count,
        COALESCE(SUM(s.total), 0) as total_sales,
        COALESCE(SUM(s.paid_amount), 0) as total_paid,
        COALESCE(SUM(s.total - s.paid_amount), 0) as outstanding
      FROM clients c
      LEFT JOIN sales s ON s.client_id = c.id AND s.date BETWEEN ? AND ?
      GROUP BY c.id, c.name, c.phone
      HAVING sale_count > 0
      ORDER BY total_sales DESC
    `).all(startDate, endDate);
  },

  getTopProducts: (startDate, endDate, limit = 10) => {
    return db.prepare(`
      SELECT
        p.id,
        p.name as product_name,
        SUM(si.quantity) as total_quantity,
        SUM(si.quantity * si.unit_price) as total_revenue,
        COUNT(DISTINCT s.id) as sale_count
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.date BETWEEN ? AND ?
      GROUP BY p.id, p.name
      ORDER BY total_revenue DESC
      LIMIT ?
    `).all(startDate, endDate, limit);
  },

  getSalesByStatus: () => {
    return db.prepare(`
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as paid_amount
      FROM sales
      GROUP BY status
    `).all();
  },

  getMonthlySales: (year) => {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const data = db.prepare(`
        SELECT
          COUNT(*) as sale_count,
          COALESCE(SUM(total), 0) as total_sales,
          COALESCE(SUM(paid_amount), 0) as total_paid
        FROM sales
        WHERE date BETWEEN ? AND ?
      `).get(startDate, endDate);

      months.push({
        month,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'short' }),
        ...data
      });
    }
    return months;
  },

  // ============================================
  // EXPENSE REPORTS
  // ============================================
  getExpensesByCategory: (startDate, endDate) => {
    return db.prepare(`
      SELECT
        ec.id,
        ec.name as category_name,
        COUNT(e.id) as expense_count,
        COALESCE(SUM(e.amount), 0) as total_amount
      FROM expense_categories ec
      LEFT JOIN expenses e ON e.category_id = ec.id AND e.date BETWEEN ? AND ?
      GROUP BY ec.id, ec.name
      ORDER BY total_amount DESC
    `).all(startDate, endDate);
  },

  getMonthlyExpenses: (year) => {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const data = db.prepare(`
        SELECT
          COUNT(*) as expense_count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM expenses
        WHERE date BETWEEN ? AND ?
      `).get(startDate, endDate);

      months.push({
        month,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'short' }),
        ...data
      });
    }
    return months;
  },

  getTopExpenses: (startDate, endDate, limit = 10) => {
    return db.prepare(`
      SELECT
        e.*,
        ec.name as category_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.date BETWEEN ? AND ?
      ORDER BY e.amount DESC
      LIMIT ?
    `).all(startDate, endDate, limit);
  },

  // ============================================
  // SUPPLIER REPORTS
  // ============================================
  getPurchasesBySupplier: (startDate, endDate) => {
    return db.prepare(`
      SELECT
        sup.id,
        sup.name as supplier_name,
        sup.phone,
        COUNT(p.id) as purchase_count,
        COALESCE(SUM(p.total), 0) as total_purchases,
        COALESCE(SUM(p.paid_amount), 0) as total_paid,
        COALESCE(SUM(p.total - p.paid_amount), 0) as outstanding
      FROM suppliers sup
      LEFT JOIN purchases p ON p.supplier_id = sup.id AND p.date BETWEEN ? AND ?
      GROUP BY sup.id, sup.name, sup.phone
      HAVING purchase_count > 0
      ORDER BY total_purchases DESC
    `).all(startDate, endDate);
  },

  getMonthlyPurchases: (year) => {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const data = db.prepare(`
        SELECT
          COUNT(*) as purchase_count,
          COALESCE(SUM(total), 0) as total_purchases,
          COALESCE(SUM(paid_amount), 0) as total_paid
        FROM purchases
        WHERE date BETWEEN ? AND ?
      `).get(startDate, endDate);

      months.push({
        month,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'short' }),
        ...data
      });
    }
    return months;
  },

  // ============================================
  // DASHBOARD SUMMARY
  // ============================================
  getDashboardStats: () => {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = today.substring(0, 8) + '01';
    const year = new Date().getFullYear();

    // Stock stats
    const stockStats = db.prepare(`
      SELECT
        COUNT(*) as total_items,
        COALESCE(SUM(quantity * cost_per_unit), 0) as total_value,
        SUM(CASE WHEN quantity <= min_stock_alert AND min_stock_alert > 0 THEN 1 ELSE 0 END) as low_stock_count
      FROM stock
    `).get();

    // This month's sales
    const salesStats = db.prepare(`
      SELECT
        COUNT(*) as sale_count,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(paid_amount), 0) as total_collected
      FROM sales
      WHERE date >= ?
    `).get(firstDayOfMonth);

    // This month's expenses
    const expenseStats = db.prepare(`
      SELECT
        COUNT(*) as expense_count,
        COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE date >= ?
    `).get(firstDayOfMonth);

    // This month's production
    const productionStats = db.prepare(`
      SELECT
        COUNT(*) as batch_count,
        COALESCE(SUM(quantity_produced), 0) as total_produced,
        COALESCE(SUM(total_cost), 0) as total_cost
      FROM production_batches
      WHERE date >= ?
    `).get(firstDayOfMonth);

    // Outstanding amounts
    const outstandingClients = db.prepare(`
      SELECT COALESCE(SUM(total - paid_amount), 0) as amount
      FROM sales WHERE status != 'paid'
    `).get();

    const outstandingSuppliers = db.prepare(`
      SELECT COALESCE(SUM(total - paid_amount), 0) as amount
      FROM purchases WHERE status != 'paid'
    `).get();

    // Pending payroll
    const pendingPayroll = db.prepare(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as amount
      FROM payroll WHERE paid = 0
    `).get();

    return {
      stock: stockStats,
      sales: salesStats,
      expenses: expenseStats,
      production: productionStats,
      outstanding: {
        fromClients: outstandingClients.amount,
        toSuppliers: outstandingSuppliers.amount,
        pendingPayroll: pendingPayroll.amount,
        pendingPayrollCount: pendingPayroll.count
      },
      monthProfit: (salesStats.total_sales || 0) - (expenseStats.total_expenses || 0) - (productionStats.total_cost || 0)
    };
  }
});

module.exports = { reportsQueries };
