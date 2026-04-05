// Settings and Documents database queries

const docTypeConfig = {
  invoice:            { prefixKey: 'invoice_prefix',           numberKey: 'next_invoice_number' },
  delivery:           { prefixKey: 'delivery_prefix',          numberKey: 'next_delivery_number' },
  proforma:           { prefixKey: 'proforma_prefix',          numberKey: 'next_proforma_number' },
  purchase_order:     { prefixKey: 'purchase_order_prefix',    numberKey: 'next_purchase_order_number' },
  exit_voucher:       { prefixKey: 'exit_voucher_prefix',      numberKey: 'next_exit_voucher_number' },
  credit_note:        { prefixKey: 'credit_note_prefix',       numberKey: 'next_credit_note_number' },
  quote:              { prefixKey: 'quote_prefix',             numberKey: 'next_quote_number' },
  reception_voucher:  { prefixKey: 'reception_voucher_prefix', numberKey: 'next_reception_voucher_number' },
};

const settingsQueries = (db) => {
  return {
    // ============================================
    // SETTINGS
    // ============================================
    getAllSettings: () => {
      const rows = db.prepare('SELECT key, value FROM settings').all();
      const settings = {};
      rows.forEach(row => {
        settings[row.key] = row.value;
      });
      return settings;
    },

    getSetting: (key) => {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
      return row ? row.value : null;
    },

    setSetting: (key, value) => {
      const stmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(key, value, value);
      return { key, value };
    },

    setMultipleSettings: (settings) => {
      const stmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
      `);

      const transaction = db.transaction((settingsObj) => {
        for (const [key, value] of Object.entries(settingsObj)) {
          stmt.run(key, value, value);
        }
      });

      transaction(settings);
      return settings;
    },

    // ============================================
    // DOCUMENTS
    // ============================================
    getAllDocuments: (limit = 100) => {
      return db.prepare(`
        SELECT d.*, c.name as client_name
        FROM documents d
        LEFT JOIN clients c ON d.client_id = c.id
        ORDER BY d.created_at DESC
        LIMIT ?
      `).all(limit);
    },

    getDocumentsByType: (type) => {
      return db.prepare(`
        SELECT d.*, c.name as client_name
        FROM documents d
        LEFT JOIN clients c ON d.client_id = c.id
        WHERE d.type = ?
        ORDER BY d.created_at DESC
      `).all(type);
    },

    getDocumentById: (id) => {
      return db.prepare(`
        SELECT d.*, c.name as client_name, c.phone as client_phone,
               c.address as client_address, c.email as client_email
        FROM documents d
        LEFT JOIN clients c ON d.client_id = c.id
        WHERE d.id = ?
      `).get(id);
    },

    getDocumentsBySale: (saleId) => {
      return db.prepare(`
        SELECT d.*, c.name as client_name
        FROM documents d
        LEFT JOIN clients c ON d.client_id = c.id
        WHERE d.sale_id = ?
        ORDER BY d.created_at DESC
      `).all(saleId);
    },

    getDocumentsByClient: (clientId) => {
      return db.prepare(`
        SELECT d.*, c.name as client_name
        FROM documents d
        LEFT JOIN clients c ON d.client_id = c.id
        WHERE d.client_id = ?
        ORDER BY d.created_at DESC
      `).all(clientId);
    },

    getDocumentsByDateRange: (startDate, endDate) => {
      return db.prepare(`
        SELECT d.*, c.name as client_name
        FROM documents d
        LEFT JOIN clients c ON d.client_id = c.id
        WHERE d.date BETWEEN ? AND ?
        ORDER BY d.created_at DESC
      `).all(startDate, endDate);
    },

    createDocument: (data) => {
      const runCreate = db.transaction(() => {
        const config = docTypeConfig[data.type] || { prefixKey: null, numberKey: null };
        const prefixKey = config.prefixKey;
        const numberKey = config.numberKey;

        const prefix = db.prepare('SELECT value FROM settings WHERE key = ?').get(prefixKey)?.value || 'DOC';
        const nextNum = parseInt(db.prepare('SELECT value FROM settings WHERE key = ?').get(numberKey)?.value || '1');

        const year = new Date().getFullYear();
        const docNumber = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;

        // Insert the document
        const result = db.prepare(`
          INSERT INTO documents (type, number, sale_id, client_id, date, data, total)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          data.type,
          docNumber,
          data.sale_id || null,
          data.client_id || null,
          data.date || new Date().toISOString().split('T')[0],
          JSON.stringify(data.data || {}),
          data.total || 0
        );

        // Increment the document number
        db.prepare(`
          INSERT INTO settings (key, value, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
        `).run(numberKey, String(nextNum + 1), String(nextNum + 1));

        return {
          id: result.lastInsertRowid,
          number: docNumber,
          ...data
        };
      });
      return runCreate();
    },

    deleteDocument: (id) => {
      return db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    },

    getDocumentStats: () => {
      const stats = db.prepare(`
        SELECT
          type,
          COUNT(*) as count,
          SUM(total) as total_amount
        FROM documents
        GROUP BY type
      `).all();

      const thisMonth = db.prepare(`
        SELECT
          type,
          COUNT(*) as count,
          SUM(total) as total_amount
        FROM documents
        WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
        GROUP BY type
      `).all();

      return { all: stats, thisMonth };
    },

    // Get next document number preview
    getNextDocumentNumber: (type) => {
      const config = docTypeConfig[type] || { prefixKey: null, numberKey: null };
      const prefixKey = config.prefixKey;
      const numberKey = config.numberKey;

      const prefix = db.prepare('SELECT value FROM settings WHERE key = ?').get(prefixKey)?.value || 'DOC';
      const nextNum = parseInt(db.prepare('SELECT value FROM settings WHERE key = ?').get(numberKey)?.value || '1');

      const year = new Date().getFullYear();
      return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
    }
  };
};

module.exports = { settingsQueries };
