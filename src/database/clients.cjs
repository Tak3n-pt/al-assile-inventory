// Clients and Sales database operations

const clientsQueries = (db) => ({
  // ============================================
  // CLIENTS
  // ============================================
  getAllClients: () => {
    return db.prepare(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM sales WHERE client_id = c.id) as sale_count,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE client_id = c.id) as total_purchases,
        (SELECT COALESCE(SUM(total - paid_amount), 0) FROM sales WHERE client_id = c.id AND status != 'paid') as outstanding_debt
      FROM clients c
      ORDER BY c.name
    `).all();
  },

  getClientById: (id) => {
    return db.prepare(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM sales WHERE client_id = c.id) as sale_count,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE client_id = c.id) as total_purchases,
        (SELECT COALESCE(SUM(total - paid_amount), 0) FROM sales WHERE client_id = c.id AND status != 'paid') as outstanding_debt
      FROM clients c
      WHERE c.id = ?
    `).get(id);
  },

  searchClients: (query) => {
    return db.prepare(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM sales WHERE client_id = c.id) as sale_count,
        (SELECT COALESCE(SUM(total - paid_amount), 0) FROM sales WHERE client_id = c.id AND status != 'paid') as outstanding_debt
      FROM clients c
      WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.address LIKE ?
      ORDER BY c.name
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
  },

  getClientsWithDebt: () => {
    return db.prepare(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM sales WHERE client_id = c.id) as sale_count,
        (SELECT COALESCE(SUM(total - paid_amount), 0) FROM sales WHERE client_id = c.id AND status != 'paid') as outstanding_debt
      FROM clients c
      WHERE c.balance < 0 OR EXISTS (
        SELECT 1 FROM sales WHERE client_id = c.id AND status != 'paid'
      )
      ORDER BY outstanding_debt DESC
    `).all();
  },

  addClient: (data) => {
    return db.prepare(`
      INSERT INTO clients (name, phone, address, email, notes, balance)
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

  updateClient: (id, data) => {
    return db.prepare(`
      UPDATE clients SET
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
        // Restore product quantities for each sale item
        const items = db.prepare(`SELECT product_id, quantity FROM sale_items WHERE sale_id = ?`).all(sale.id);
        for (const item of items) {
          db.prepare(`UPDATE products SET quantity = quantity + ? WHERE id = ?`).run(item.quantity, item.product_id);
        }
        // Delete sale items
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

  addSale: (data) => {
    return db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO sales (client_id, date, total, paid_amount, status, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.client_id,
        data.date,
        data.total || 0,
        data.paid_amount || 0,
        data.status || 'pending',
        data.notes || null
      );

      // Update client balance if not fully paid
      if (data.total > (data.paid_amount || 0)) {
        const debt = data.total - (data.paid_amount || 0);
        db.prepare(`UPDATE clients SET balance = balance - ? WHERE id = ?`).run(debt, data.client_id);
      }

      return result;
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

      // Adjust client balance
      if (oldSale) {
        const oldDebt = oldSale.total - oldSale.paid_amount;
        const newDebt = data.total - data.paid_amount;

        if (oldSale.client_id !== data.client_id) {
          // Client changed: restore old client's balance, charge new client
          if (oldDebt > 0 && oldSale.client_id) {
            db.prepare(`UPDATE clients SET balance = balance + ? WHERE id = ?`).run(oldDebt, oldSale.client_id);
          }
          if (newDebt > 0 && data.client_id) {
            db.prepare(`UPDATE clients SET balance = balance - ? WHERE id = ?`).run(newDebt, data.client_id);
          }
        } else {
          // Same client: adjust by the difference
          const balanceChange = oldDebt - newDebt;
          if (balanceChange !== 0 && data.client_id) {
            db.prepare(`UPDATE clients SET balance = balance + ? WHERE id = ?`).run(balanceChange, data.client_id);
          }
        }
      }

      return result;
    })();
  },

  addPayment: (id, amount) => {
    return db.transaction(() => {
      const sale = db.prepare(`SELECT * FROM sales WHERE id = ?`).get(id);
      if (!sale) throw new Error('Sale not found');

      const newPaidAmount = sale.paid_amount + amount;
      const remaining = sale.total - newPaidAmount;

      let newStatus = sale.status;
      if (remaining <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      db.prepare(`
        UPDATE sales SET paid_amount = ?, status = ? WHERE id = ?
      `).run(newPaidAmount, newStatus, id);

      // Update client balance (reduce debt)
      db.prepare(`UPDATE clients SET balance = balance + ? WHERE id = ?`).run(amount, sale.client_id);

      return { success: true, new_status: newStatus, remaining: Math.max(0, remaining) };
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
        data.unit_price,
        data.quantity * data.unit_price,
        id
      );

      // Update sale total
      if (oldItem) {
        const oldItemTotal = oldItem.quantity * oldItem.unit_price;
        const newItemTotal = data.quantity * data.unit_price;
        const difference = newItemTotal - oldItemTotal;

        const sale = db.prepare(`SELECT * FROM sales WHERE id = ?`).get(oldItem.sale_id);
        const newTotal = sale.total + difference;

        db.prepare(`UPDATE sales SET total = ? WHERE id = ?`).run(newTotal, oldItem.sale_id);

        // Update client balance
        if (sale.client_id) {
          db.prepare(`UPDATE clients SET balance = balance - ? WHERE id = ?`).run(difference, sale.client_id);
        }

        // Update product quantities
        const quantityDifference = data.quantity - oldItem.quantity;

        // If product changed, restore old product and deduct from new
        if (data.product_id !== oldItem.product_id) {
          db.prepare(`UPDATE products SET quantity = quantity + ? WHERE id = ?`).run(oldItem.quantity, oldItem.product_id);
          db.prepare(`UPDATE products SET quantity = quantity - ? WHERE id = ?`).run(data.quantity, data.product_id);
        } else {
          // Same product, just adjust by the difference
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
        const itemTotal = item.quantity * item.unit_price;
        const sale = db.prepare(`SELECT * FROM sales WHERE id = ?`).get(item.sale_id);
        const newTotal = sale.total - itemTotal;

        db.prepare(`UPDATE sales SET total = ? WHERE id = ?`).run(newTotal, item.sale_id);

        // Update client balance
        if (sale.client_id) {
          db.prepare(`UPDATE clients SET balance = balance + ? WHERE id = ?`).run(itemTotal, sale.client_id);
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
    const endOfMonth = `${year}-${month}-31`;

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
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
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
