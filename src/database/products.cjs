// Products and Production database operations

// Unit conversion utilities
const unitConversions = {
  // Weight conversions (base: kg)
  kg: { base: 'kg', factor: 1 },
  g: { base: 'kg', factor: 0.001 },
  // Volume conversions (base: L)
  L: { base: 'L', factor: 1 },
  ml: { base: 'L', factor: 0.001 },
  // Individual units (no conversion)
  pcs: { base: 'pcs', factor: 1 },
  box: { base: 'box', factor: 1 },
  pack: { base: 'pack', factor: 1 },
  bottle: { base: 'bottle', factor: 1 },
};

// Convert quantity from one unit to another
const convertUnit = (quantity, fromUnit, toUnit) => {
  if (!fromUnit || !toUnit || fromUnit === toUnit) return quantity;

  const fromInfo = unitConversions[fromUnit];
  const toInfo = unitConversions[toUnit];

  if (!fromInfo || !toInfo || fromInfo.base !== toInfo.base) {
    // Units are not compatible, return as-is
    return quantity;
  }

  // Convert: fromUnit -> base -> toUnit
  const baseValue = quantity * fromInfo.factor;
  return baseValue / toInfo.factor;
};

const productsQueries = (db) => ({
  // ============================================
  // PRODUCTS
  // ============================================
  getAllProducts: () => {
    return db.prepare(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM product_recipes WHERE product_id = p.id) as ingredient_count,
        (SELECT COUNT(*) FROM production_batches WHERE product_id = p.id) as batch_count,
        (SELECT COALESCE(SUM(quantity_produced), 0) FROM production_batches WHERE product_id = p.id) as total_produced,
        (SELECT COALESCE(SUM(quantity), 0) FROM sale_items WHERE product_id = p.id) as total_sold,
        CASE WHEN p.quantity <= p.min_stock_alert AND p.min_stock_alert > 0 THEN 1 ELSE 0 END as is_low_stock
      FROM products p
      ORDER BY p.name
    `).all();
  },

  getProductById: (id) => {
    return db.prepare(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM product_recipes WHERE product_id = p.id) as ingredient_count,
        (SELECT COUNT(*) FROM production_batches WHERE product_id = p.id) as batch_count,
        (SELECT COALESCE(SUM(quantity_produced), 0) FROM production_batches WHERE product_id = p.id) as total_produced
      FROM products p
      WHERE p.id = ?
    `).get(id);
  },

  searchProducts: (query) => {
    return db.prepare(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM product_recipes WHERE product_id = p.id) as ingredient_count,
        (SELECT COALESCE(SUM(quantity_produced), 0) FROM production_batches WHERE product_id = p.id) as total_produced
      FROM products p
      WHERE p.name LIKE ? OR p.description LIKE ? OR p.barcode LIKE ?
      ORDER BY p.name
    `).all(`%${query}%`, `%${query}%`, `%${query}%`);
  },

  getProductByBarcode: (barcode) => {
    return db.prepare(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM product_recipes WHERE product_id = p.id) as ingredient_count,
        (SELECT COALESCE(SUM(quantity_produced), 0) FROM production_batches WHERE product_id = p.id) as total_produced
      FROM products p
      WHERE p.barcode = ?
    `).get(barcode);
  },

  getFavoriteProducts: () => {
    return db.prepare(`
      SELECT
        p.*,
        (SELECT COUNT(*) FROM product_recipes WHERE product_id = p.id) as ingredient_count,
        (SELECT COALESCE(SUM(quantity_produced), 0) FROM production_batches WHERE product_id = p.id) as total_produced
      FROM products p
      WHERE p.is_favorite = 1 AND p.is_active = 1
      ORDER BY p.name
    `).all();
  },

  toggleFavorite: (id) => {
    return db.prepare(`
      UPDATE products SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END
      WHERE id = ?
    `).run(id);
  },

  updateBarcode: (id, barcode) => {
    return db.prepare(`UPDATE products SET barcode = ? WHERE id = ?`).run(barcode, id);
  },

  addProduct: (data) => {
    return db.prepare(`
      INSERT INTO products (name, description, selling_price, manual_cost, unit, barcode, is_favorite, image_path, is_resale, purchase_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      data.description || null,
      data.selling_price || 0,
      data.manual_cost || null,
      data.unit || 'pcs',
      data.barcode || null,
      data.is_favorite || 0,
      data.image_path || null,
      data.is_resale || 0,
      data.purchase_price || 0
    );
  },

  updateProduct: (id, data) => {
    return db.prepare(`
      UPDATE products SET
        name = ?,
        description = ?,
        selling_price = ?,
        manual_cost = ?,
        unit = ?,
        barcode = ?,
        is_favorite = ?,
        image_path = ?,
        is_resale = ?,
        purchase_price = ?
      WHERE id = ?
    `).run(
      data.name,
      data.description || null,
      data.selling_price || 0,
      data.manual_cost || null,
      data.unit || 'pcs',
      data.barcode || null,
      data.is_favorite || 0,
      data.image_path || null,
      data.is_resale || 0,
      data.purchase_price || 0,
      id
    );
  },

  deleteProduct: (id) => {
    // Refuse deletion if any sale_items reference this product
    const saleRef = db.prepare(`SELECT COUNT(*) as cnt FROM sale_items WHERE product_id = ?`).get(id);
    if (saleRef && saleRef.cnt > 0) {
      throw new Error('Cannot delete product: it is referenced by existing sale items');
    }
    // Delete recipes first
    db.prepare(`DELETE FROM product_recipes WHERE product_id = ?`).run(id);
    // Delete production batches
    db.prepare(`DELETE FROM production_batches WHERE product_id = ?`).run(id);
    return db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
  },

  // ============================================
  // PRODUCT RECIPES (Ingredients)
  // ============================================
  getProductRecipe: (productId) => {
    return db.prepare(`
      SELECT
        pr.*,
        pr.unit as unit,
        s.name as stock_name,
        s.unit as stock_unit,
        s.quantity as stock_quantity,
        s.cost_per_unit as stock_cost
      FROM product_recipes pr
      LEFT JOIN stock s ON pr.stock_item_id = s.id
      WHERE pr.product_id = ?
    `).all(productId);
  },

  addRecipeItem: (data) => {
    return db.prepare(`
      INSERT INTO product_recipes (product_id, stock_item_id, quantity_needed)
      VALUES (?, ?, ?)
    `).run(
      data.product_id,
      data.stock_item_id,
      data.quantity_needed
    );
  },

  updateRecipeItem: (id, data) => {
    return db.prepare(`
      UPDATE product_recipes SET
        stock_item_id = ?,
        quantity_needed = ?
      WHERE id = ?
    `).run(
      data.stock_item_id,
      data.quantity_needed,
      id
    );
  },

  deleteRecipeItem: (id) => {
    return db.prepare(`DELETE FROM product_recipes WHERE id = ?`).run(id);
  },

  clearProductRecipe: (productId) => {
    return db.prepare(`DELETE FROM product_recipes WHERE product_id = ?`).run(productId);
  },

  // Set entire recipe at once (replaces existing)
  setProductRecipe: (productId, items) => {
    // Clear existing recipe
    db.prepare(`DELETE FROM product_recipes WHERE product_id = ?`).run(productId);

    // Add new items with unit
    const stmt = db.prepare(`
      INSERT INTO product_recipes (product_id, stock_item_id, quantity_needed, unit)
      VALUES (?, ?, ?, ?)
    `);

    for (const item of items) {
      stmt.run(productId, item.stock_item_id, item.quantity_needed, item.unit || null);
    }

    return { success: true, count: items.length };
  },

  // ============================================
  // PRODUCTION BATCHES
  // ============================================
  getAllBatches: () => {
    return db.prepare(`
      SELECT
        pb.*,
        p.name as product_name,
        p.unit as product_unit
      FROM production_batches pb
      LEFT JOIN products p ON pb.product_id = p.id
      ORDER BY pb.date DESC, pb.created_at DESC
    `).all();
  },

  getBatchById: (id) => {
    return db.prepare(`
      SELECT
        pb.*,
        p.name as product_name,
        p.unit as product_unit
      FROM production_batches pb
      LEFT JOIN products p ON pb.product_id = p.id
      WHERE pb.id = ?
    `).get(id);
  },

  getBatchesByProduct: (productId) => {
    return db.prepare(`
      SELECT
        pb.*,
        p.name as product_name,
        p.unit as product_unit
      FROM production_batches pb
      LEFT JOIN products p ON pb.product_id = p.id
      WHERE pb.product_id = ?
      ORDER BY pb.date DESC
    `).all(productId);
  },

  getBatchesByDateRange: (startDate, endDate) => {
    return db.prepare(`
      SELECT
        pb.*,
        p.name as product_name,
        p.unit as product_unit
      FROM production_batches pb
      LEFT JOIN products p ON pb.product_id = p.id
      WHERE pb.date BETWEEN ? AND ?
      ORDER BY pb.date DESC
    `).all(startDate, endDate);
  },

  // Calculate cost for a product based on recipe
  calculateProductCost: (productId, quantity = 1) => {
    const recipe = db.prepare(`
      SELECT
        pr.quantity_needed,
        pr.unit as recipe_unit,
        s.cost_per_unit,
        s.unit as stock_unit
      FROM product_recipes pr
      LEFT JOIN stock s ON pr.stock_item_id = s.id
      WHERE pr.product_id = ?
    `).all(productId);

    let ingredientCost = 0;
    for (const item of recipe) {
      // Convert quantity to stock unit for cost calculation
      const recipeUnit = item.recipe_unit || item.stock_unit;
      const quantityInStockUnit = convertUnit(
        item.quantity_needed || 0,
        recipeUnit,
        item.stock_unit
      );
      ingredientCost += quantityInStockUnit * (item.cost_per_unit || 0);
    }

    return ingredientCost * quantity;
  },

  // Check if stock is sufficient for production
  checkStockAvailability: (productId, quantity) => {
    const recipe = db.prepare(`
      SELECT
        pr.stock_item_id,
        pr.quantity_needed,
        pr.unit as recipe_unit,
        s.name as stock_name,
        s.quantity as available,
        s.unit as stock_unit
      FROM product_recipes pr
      LEFT JOIN stock s ON pr.stock_item_id = s.id
      WHERE pr.product_id = ?
    `).all(productId);

    const shortages = [];
    for (const item of recipe) {
      // Convert quantity to stock unit for comparison
      const recipeUnit = item.recipe_unit || item.stock_unit;
      const neededInStockUnit = convertUnit(
        item.quantity_needed * quantity,
        recipeUnit,
        item.stock_unit
      );

      if (neededInStockUnit > item.available) {
        shortages.push({
          stock_item_id: item.stock_item_id,
          stock_name: item.stock_name,
          needed: neededInStockUnit,
          available: item.available,
          shortage: neededInStockUnit - item.available,
          unit: item.stock_unit
        });
      }
    }

    return {
      canProduce: shortages.length === 0,
      shortages: shortages
    };
  },

  // Create production batch and deduct stock
  createBatch: (data) => {
    const runCreate = db.transaction(() => {
      const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(data.product_id);
      if (!product) throw new Error('Product not found');

      // Check stock availability
      const availability = productsQueries(db).checkStockAvailability(data.product_id, data.quantity_produced);
      if (!availability.canProduce) {
        throw new Error(`Insufficient stock: ${availability.shortages.map(s => s.stock_name).join(', ')}`);
      }

      // Calculate ingredient cost
      const ingredientCost = productsQueries(db).calculateProductCost(data.product_id, data.quantity_produced);

      // Use manual cost if provided, otherwise use calculated
      const totalCost = data.manual_cost || (ingredientCost + (data.expense_allocation || 0));

      // Create batch record
      const result = db.prepare(`
        INSERT INTO production_batches (product_id, quantity_produced, total_cost, expense_allocation, date, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.product_id,
        data.quantity_produced,
        totalCost,
        data.expense_allocation || 0,
        data.date,
        data.notes || null
      );

      // Deduct stock for each ingredient with unit conversion
      const recipe = db.prepare(`
        SELECT
          pr.stock_item_id,
          pr.quantity_needed,
          pr.unit as recipe_unit,
          s.unit as stock_unit
        FROM product_recipes pr
        LEFT JOIN stock s ON pr.stock_item_id = s.id
        WHERE pr.product_id = ?
      `).all(data.product_id);

      const stockUpdateStmt = db.prepare(`
        UPDATE stock SET quantity = quantity - ? WHERE id = ?
      `);

      const transactionStmt = db.prepare(`
        INSERT INTO stock_transactions (stock_id, type, quantity, notes, reference_type, reference_id)
        VALUES (?, 'out', ?, ?, 'production', ?)
      `);

      for (const item of recipe) {
        // Convert quantity to stock unit before deducting
        const recipeUnit = item.recipe_unit || item.stock_unit;
        const deductQtyInStockUnit = convertUnit(
          item.quantity_needed * data.quantity_produced,
          recipeUnit,
          item.stock_unit
        );
        stockUpdateStmt.run(deductQtyInStockUnit, item.stock_item_id);
        transactionStmt.run(
          item.stock_item_id,
          deductQtyInStockUnit,
          `Production: ${product.name} x${data.quantity_produced}`,
          result.lastInsertRowid
        );
      }

      // Increase product quantity
      db.prepare(`UPDATE products SET quantity = quantity + ? WHERE id = ?`)
        .run(data.quantity_produced, data.product_id);

      return result;
    });

    return runCreate();
  },

  updateBatch: (id, data) => {
    const runUpdate = db.transaction(() => {
      // 1. Get the old batch
      const oldBatch = db.prepare(`SELECT * FROM production_batches WHERE id = ?`).get(id);
      if (!oldBatch) throw new Error('Batch not found');

      // 2. Get the recipe for the product
      const recipe = db.prepare(`
        SELECT
          pr.stock_item_id,
          pr.quantity_needed,
          pr.unit as recipe_unit,
          s.unit as stock_unit,
          s.name as stock_name,
          s.quantity as available
        FROM product_recipes pr
        LEFT JOIN stock s ON pr.stock_item_id = s.id
        WHERE pr.product_id = ?
      `).all(oldBatch.product_id);

      const stockRestoreStmt = db.prepare(`
        UPDATE stock SET quantity = quantity + ? WHERE id = ?
      `);
      const stockDeductStmt = db.prepare(`
        UPDATE stock SET quantity = quantity - ? WHERE id = ?
      `);
      const txStmt = db.prepare(`
        INSERT INTO stock_transactions (stock_id, type, quantity, notes, reference_type, reference_id)
        VALUES (?, ?, ?, ?, 'batch_update', ?)
      `);

      // 3. Reverse the old stock deductions (restore quantities based on old batch.quantity_produced)
      for (const item of recipe) {
        const recipeUnit = item.recipe_unit || item.stock_unit;
        const restoreQty = convertUnit(
          item.quantity_needed * oldBatch.quantity_produced,
          recipeUnit,
          item.stock_unit
        );
        stockRestoreStmt.run(restoreQty, item.stock_item_id);
        txStmt.run(
          item.stock_item_id,
          'in',
          restoreQty,
          `Batch update reversal (batch #${id})`,
          id
        );
      }

      // 4. If new quantity_produced > 0, check availability and deduct new quantities
      if (data.quantity_produced > 0) {
        const shortages = [];
        for (const item of recipe) {
          const recipeUnit = item.recipe_unit || item.stock_unit;
          const neededQty = convertUnit(
            item.quantity_needed * data.quantity_produced,
            recipeUnit,
            item.stock_unit
          );
          // Re-read current stock after restore
          const currentStock = db.prepare(`SELECT quantity FROM stock WHERE id = ?`).get(item.stock_item_id);
          const currentAvailable = currentStock ? currentStock.quantity : 0;
          if (neededQty > currentAvailable) {
            shortages.push({ stock_name: item.stock_name, needed: neededQty, available: currentAvailable });
          }
        }
        if (shortages.length > 0) {
          throw new Error(`Insufficient stock: ${shortages.map(s => s.stock_name).join(', ')}`);
        }

        for (const item of recipe) {
          const recipeUnit = item.recipe_unit || item.stock_unit;
          const deductQty = convertUnit(
            item.quantity_needed * data.quantity_produced,
            recipeUnit,
            item.stock_unit
          );
          stockDeductStmt.run(deductQty, item.stock_item_id);
          txStmt.run(
            item.stock_item_id,
            'out',
            deductQty,
            `Batch update deduction (batch #${id})`,
            id
          );
        }
      }

      // 5. Update the batch record
      const result = db.prepare(`
        UPDATE production_batches SET
          quantity_produced = ?,
          total_cost = ?,
          expense_allocation = ?,
          date = ?,
          notes = ?
        WHERE id = ?
      `).run(
        data.quantity_produced,
        data.total_cost,
        data.expense_allocation || 0,
        data.date,
        data.notes || null,
        id
      );

      // 6. Adjust product quantity by the difference
      const quantityDiff = data.quantity_produced - oldBatch.quantity_produced;
      if (quantityDiff !== 0) {
        db.prepare(`UPDATE products SET quantity = quantity + ? WHERE id = ?`)
          .run(quantityDiff, oldBatch.product_id);
      }

      return result;
    });

    return runUpdate();
  },

  deleteBatch: (id) => {
    // Get batch details before deletion
    const batch = db.prepare(`SELECT * FROM production_batches WHERE id = ?`).get(id);
    if (!batch) throw new Error('Batch not found');

    const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(batch.product_id);

    // Get recipe to restore stock with unit conversion
    const recipe = db.prepare(`
      SELECT
        pr.stock_item_id,
        pr.quantity_needed,
        pr.unit as recipe_unit,
        s.unit as stock_unit
      FROM product_recipes pr
      LEFT JOIN stock s ON pr.stock_item_id = s.id
      WHERE pr.product_id = ?
    `).all(batch.product_id);

    // Restore stock for each ingredient
    const stockRestoreStmt = db.prepare(`
      UPDATE stock SET quantity = quantity + ? WHERE id = ?
    `);

    const transactionStmt = db.prepare(`
      INSERT INTO stock_transactions (stock_id, type, quantity, notes, reference_type, reference_id)
      VALUES (?, 'in', ?, ?, 'batch_delete', ?)
    `);

    for (const item of recipe) {
      // Convert quantity to stock unit before restoring
      const recipeUnit = item.recipe_unit || item.stock_unit;
      const restoreQtyInStockUnit = convertUnit(
        item.quantity_needed * batch.quantity_produced,
        recipeUnit,
        item.stock_unit
      );
      stockRestoreStmt.run(restoreQtyInStockUnit, item.stock_item_id);
      transactionStmt.run(
        item.stock_item_id,
        restoreQtyInStockUnit,
        `Batch deleted: ${product?.name || 'Unknown'} x${batch.quantity_produced}`,
        id
      );
    }

    // Reduce product quantity
    db.prepare(`UPDATE products SET quantity = quantity - ? WHERE id = ?`)
      .run(batch.quantity_produced, batch.product_id);

    // Delete the batch record
    return db.prepare(`DELETE FROM production_batches WHERE id = ?`).run(id);
  },

  // ============================================
  // QUANTITY ADJUSTMENTS (for initial inventory / opening balance)
  // ============================================

  // Adjust product quantity directly (for opening balance)
  adjustProductQuantity: (id, newQuantity, notes = null) => {
    const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
    if (!product) throw new Error('Product not found');

    const oldQuantity = product.quantity || 0;
    const difference = newQuantity - oldQuantity;

    // Update product quantity
    db.prepare(`UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(newQuantity, id);

    // Log the adjustment as a production batch with 0 cost (opening balance)
    if (difference !== 0) {
      db.prepare(`
        INSERT INTO production_batches (product_id, quantity_produced, total_cost, expense_allocation, date, notes)
        VALUES (?, ?, 0, 0, date('now'), ?)
      `).run(id, difference, notes || 'Initial inventory / Opening balance adjustment');
    }

    return {
      success: true,
      product_id: id,
      old_quantity: oldQuantity,
      new_quantity: newQuantity,
      difference: difference
    };
  },

  // Set initial quantity without affecting stock (pure opening balance)
  setInitialQuantity: (id, quantity, notes = null) => {
    const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
    if (!product) throw new Error('Product not found');

    // Update product quantity directly
    db.prepare(`UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(quantity, id);

    // Create an opening balance record
    if (quantity > 0) {
      db.prepare(`
        INSERT INTO production_batches (product_id, quantity_produced, total_cost, expense_allocation, date, notes)
        VALUES (?, ?, 0, 0, date('now'), ?)
      `).run(id, quantity, notes || 'Opening balance - Initial inventory');
    }

    return {
      success: true,
      product_id: id,
      quantity: quantity
    };
  },

  // Add stock for resale products (bought and sold directly, no production)
  addResaleStock: (id, quantity, unitCost = 0, notes = null) => {
    const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
    if (!product) throw new Error('Product not found');

    const oldQuantity = product.quantity || 0;
    const newQuantity = oldQuantity + quantity;
    const totalCost = quantity * unitCost;

    // Update product quantity and purchase price
    db.prepare(`
      UPDATE products
      SET quantity = ?,
          purchase_price = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newQuantity, unitCost, id);

    // Create a production batch record for tracking (with ingredient_cost = total cost)
    db.prepare(`
      INSERT INTO production_batches (product_id, quantity_produced, ingredient_cost, total_cost, expense_allocation, date, notes)
      VALUES (?, ?, ?, ?, 0, date('now'), ?)
    `).run(id, quantity, totalCost, totalCost, notes || 'Resale stock purchase');

    return {
      success: true,
      product_id: id,
      old_quantity: oldQuantity,
      new_quantity: newQuantity,
      quantity_added: quantity,
      unit_cost: unitCost,
      total_cost: totalCost
    };
  },

  // ============================================
  // STATISTICS
  // ============================================
  getProductStats: () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startOfMonth = `${year}-${month}-01`;
    const endOfMonth = `${year}-${month}-31`;

    const totalStats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM production_batches) as total_batches,
        (SELECT COALESCE(SUM(quantity_produced), 0) FROM production_batches) as total_produced,
        (SELECT COALESCE(SUM(total_cost), 0) FROM production_batches) as total_cost
    `).get();

    const monthStats = db.prepare(`
      SELECT
        COUNT(*) as month_batches,
        COALESCE(SUM(quantity_produced), 0) as month_produced,
        COALESCE(SUM(total_cost), 0) as month_cost
      FROM production_batches
      WHERE date BETWEEN ? AND ?
    `).get(startOfMonth, endOfMonth);

    return {
      ...totalStats,
      ...monthStats
    };
  },

  getProductionSummary: (year, month) => {
    let query = `
      SELECT
        p.id as product_id,
        p.name as product_name,
        COUNT(pb.id) as batch_count,
        COALESCE(SUM(pb.quantity_produced), 0) as total_produced,
        COALESCE(SUM(pb.total_cost), 0) as total_cost
      FROM products p
      LEFT JOIN production_batches pb ON p.id = pb.product_id
    `;

    const params = [];
    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      query += ` WHERE pb.date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    } else if (year) {
      query += ` WHERE strftime('%Y', pb.date) = ?`;
      params.push(String(year));
    }

    query += ` GROUP BY p.id ORDER BY total_produced DESC`;

    return db.prepare(query).all(...params);
  }
});

module.exports = { productsQueries };
