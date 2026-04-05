// Employers and Payroll database operations

const employersQueries = (db) => ({
  // ============================================
  // EMPLOYERS
  // ============================================
  getAllEmployers: () => {
    return db.prepare(`
      SELECT
        e.*,
        (SELECT COUNT(*) FROM payroll WHERE employer_id = e.id) as payment_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payroll WHERE employer_id = e.id AND paid = 1) as total_paid,
        (SELECT COUNT(*) FROM payroll WHERE employer_id = e.id AND paid = 0) as pending_payments
      FROM employers e
      ORDER BY e.name
    `).all();
  },

  getEmployerById: (id) => {
    return db.prepare(`
      SELECT
        e.*,
        (SELECT COUNT(*) FROM payroll WHERE employer_id = e.id) as payment_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payroll WHERE employer_id = e.id AND paid = 1) as total_paid,
        (SELECT COUNT(*) FROM payroll WHERE employer_id = e.id AND paid = 0) as pending_payments
      FROM employers e
      WHERE e.id = ?
    `).get(id);
  },

  getActiveEmployers: () => {
    return db.prepare(`
      SELECT
        e.*,
        (SELECT COUNT(*) FROM payroll WHERE employer_id = e.id AND paid = 0) as pending_payments
      FROM employers e
      WHERE e.status = 'active'
      ORDER BY e.name
    `).all();
  },

  searchEmployers: (query) => {
    return db.prepare(`
      SELECT
        e.*,
        (SELECT COUNT(*) FROM payroll WHERE employer_id = e.id AND paid = 0) as pending_payments
      FROM employers e
      WHERE e.name LIKE ? OR e.role LIKE ? OR e.phone LIKE ?
      ORDER BY e.name
    `).all(`%${query}%`, `%${query}%`, `%${query}%`);
  },

  addEmployer: (data) => {
    return db.prepare(`
      INSERT INTO employers (name, role, phone, salary, hire_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      data.role || null,
      data.phone || null,
      data.salary || 0,
      data.hire_date || new Date().toISOString().split('T')[0],
      data.status || 'active'
    );
  },

  updateEmployer: (id, data) => {
    return db.prepare(`
      UPDATE employers SET
        name = ?,
        role = ?,
        phone = ?,
        salary = ?,
        hire_date = ?,
        status = ?
      WHERE id = ?
    `).run(
      data.name,
      data.role || null,
      data.phone || null,
      data.salary || 0,
      data.hire_date,
      data.status || 'active',
      id
    );
  },

  deleteEmployer: (id) => {
    // Delete payroll records first
    db.prepare(`DELETE FROM payroll WHERE employer_id = ?`).run(id);
    return db.prepare(`DELETE FROM employers WHERE id = ?`).run(id);
  },

  // ============================================
  // PAYROLL
  // ============================================
  getAllPayroll: () => {
    return db.prepare(`
      SELECT
        p.*,
        e.name as employer_name,
        e.role as employer_role,
        e.salary as employer_salary
      FROM payroll p
      LEFT JOIN employers e ON p.employer_id = e.id
      ORDER BY p.year DESC, p.month DESC, e.name
    `).all();
  },

  getPayrollById: (id) => {
    return db.prepare(`
      SELECT
        p.*,
        e.name as employer_name,
        e.role as employer_role
      FROM payroll p
      LEFT JOIN employers e ON p.employer_id = e.id
      WHERE p.id = ?
    `).get(id);
  },

  getPayrollByEmployer: (employerId) => {
    return db.prepare(`
      SELECT * FROM payroll
      WHERE employer_id = ?
      ORDER BY year DESC, month DESC
    `).all(employerId);
  },

  getPayrollByMonth: (year, month) => {
    return db.prepare(`
      SELECT
        p.*,
        e.name as employer_name,
        e.role as employer_role,
        e.salary as employer_salary
      FROM payroll p
      LEFT JOIN employers e ON p.employer_id = e.id
      WHERE p.year = ? AND p.month = ?
      ORDER BY e.name
    `).all(year, month);
  },

  getPendingPayroll: () => {
    return db.prepare(`
      SELECT
        p.*,
        e.name as employer_name,
        e.role as employer_role,
        e.salary as employer_salary
      FROM payroll p
      LEFT JOIN employers e ON p.employer_id = e.id
      WHERE p.paid = 0
      ORDER BY p.year, p.month, e.name
    `).all();
  },

  addPayroll: (data) => {
    return db.prepare(`
      INSERT INTO payroll (employer_id, month, year, amount, paid, payment_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.employer_id,
      data.month,
      data.year,
      data.amount,
      data.paid ? 1 : 0,
      data.payment_date || null
    );
  },

  updatePayroll: (id, data) => {
    return db.prepare(`
      UPDATE payroll SET
        employer_id = ?,
        month = ?,
        year = ?,
        amount = ?,
        paid = ?,
        payment_date = ?
      WHERE id = ?
    `).run(
      data.employer_id,
      data.month,
      data.year,
      data.amount,
      data.paid ? 1 : 0,
      data.payment_date || null,
      id
    );
  },

  markPayrollPaid: (id, paymentDate) => {
    const runMark = db.transaction(() => {
      const payroll = db.prepare(`SELECT * FROM payroll WHERE id = ?`).get(id);
      if (!payroll) throw new Error('Payroll record not found');
      if (payroll.paid === 1) throw new Error('Payroll already marked as paid');

      const pDate = paymentDate || new Date().toISOString().split('T')[0];

      // Update payroll record
      db.prepare(`
        UPDATE payroll SET paid = 1, payment_date = ? WHERE id = ?
      `).run(pDate, id);

      // Add to expenses
      const employer = db.prepare(`SELECT name FROM employers WHERE id = ?`).get(payroll.employer_id);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];

      // Find or create Salaries expense category
      let category = db.prepare(`SELECT id FROM expense_categories WHERE name = 'Salaries'`).get();
      if (!category) {
        db.prepare(`INSERT INTO expense_categories (name, description) VALUES (?, ?)`).run(
          'Salaries', 'Employee salary payments'
        );
        category = db.prepare(`SELECT id FROM expense_categories WHERE name = 'Salaries'`).get();
      }

      // Add expense record
      db.prepare(`
        INSERT INTO expenses (category_id, amount, date, description, is_recurring, recurring_period, notes)
        VALUES (?, ?, ?, ?, 0, NULL, ?)
      `).run(
        category.id,
        payroll.amount,
        pDate,
        `Salary - ${employer?.name || 'Unknown'} (${monthNames[payroll.month - 1]} ${payroll.year})`,
        `Payroll ID: ${id}`
      );

      return { success: true };
    });
    return runMark();
  },

  deletePayroll: (id) => {
    return db.prepare(`DELETE FROM payroll WHERE id = ?`).run(id);
  },

  // Generate monthly payroll for all active employers
  generateMonthlyPayroll: (year, month) => {
    const activeEmployers = db.prepare(`
      SELECT * FROM employers WHERE status = 'active'
    `).all();

    const existingPayroll = db.prepare(`
      SELECT employer_id FROM payroll WHERE year = ? AND month = ?
    `).all(year, month);

    const existingEmployerIds = new Set(existingPayroll.map(p => p.employer_id));

    const stmt = db.prepare(`
      INSERT INTO payroll (employer_id, month, year, amount, paid, payment_date)
      VALUES (?, ?, ?, ?, 0, NULL)
    `);

    let created = 0;
    for (const employer of activeEmployers) {
      if (!existingEmployerIds.has(employer.id)) {
        stmt.run(employer.id, month, year, employer.salary);
        created++;
      }
    }

    return { success: true, created: created };
  },

  // ============================================
  // STATISTICS
  // ============================================
  getEmployerStats: () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const staticStats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM employers) as total_employers,
        (SELECT COUNT(*) FROM employers WHERE status = 'active') as active_employers,
        (SELECT COALESCE(SUM(salary), 0) FROM employers WHERE status = 'active') as monthly_salary_total,
        (SELECT COUNT(*) FROM payroll WHERE paid = 0) as pending_payments,
        (SELECT COALESCE(SUM(amount), 0) FROM payroll WHERE paid = 0) as pending_amount
    `).get();

    const periodStats = db.prepare(`
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM payroll WHERE year = ? AND paid = 1) as year_total_paid,
        (SELECT COALESCE(SUM(amount), 0) FROM payroll WHERE year = ? AND month = ? AND paid = 1) as month_total_paid
    `).get(year, year, month);

    return { ...staticStats, ...periodStats };
  },

  getPayrollSummary: (year) => {
    return db.prepare(`
      SELECT
        month,
        COUNT(*) as payment_count,
        COALESCE(SUM(amount), 0) as total_amount,
        SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN paid = 0 THEN amount ELSE 0 END) as pending_amount
      FROM payroll
      WHERE year = ?
      GROUP BY month
      ORDER BY month
    `).all(year);
  }
});

module.exports = { employersQueries };
