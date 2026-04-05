// Users database operations
const bcrypt = require('bcryptjs');

const usersQueries = (db) => ({
  // Get all users (excluding password hash)
  getAllUsers: () => {
    return db.prepare(`
      SELECT id, username, name, role, is_active, last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();
  },

  // Get user by ID (excluding password hash)
  getUserById: (id) => {
    return db.prepare(`
      SELECT id, username, name, role, is_active, last_login, created_at
      FROM users
      WHERE id = ?
    `).get(id);
  },

  // Get user by username (including password hash for auth)
  getUserByUsername: (username) => {
    return db.prepare(`
      SELECT *
      FROM users
      WHERE username = ?
    `).get(username);
  },

  // Verify password
  verifyPassword: (plainPassword, hashedPassword) => {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  },

  // Hash password
  hashPassword: (password) => {
    return bcrypt.hashSync(password, 10);
  },

  // Login user
  login: (username, password) => {
    const user = db.prepare(`
      SELECT *
      FROM users
      WHERE username = ? AND is_active = 1
    `).get(username);

    if (!user) {
      return { success: false, error: 'User not found or inactive' };
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    // Update last login
    db.prepare(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `).run(user.id);

    // Return user without password hash
    const { password_hash, ...safeUser } = user;
    return { success: true, user: safeUser };
  },

  // Add new user
  addUser: (data) => {
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    return db.prepare(`
      INSERT INTO users (username, password_hash, name, role, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      data.username,
      hashedPassword,
      data.name,
      data.role || 'sales',
      data.is_active !== undefined ? data.is_active : 1
    );
  },

  // Update user (without password)
  updateUser: (id, data) => {
    return db.prepare(`
      UPDATE users SET
        username = ?,
        name = ?,
        role = ?,
        is_active = ?
      WHERE id = ?
    `).run(
      data.username,
      data.name,
      data.role,
      data.is_active,
      id
    );
  },

  // Update user password
  updatePassword: (id, newPassword) => {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    return db.prepare(`
      UPDATE users SET password_hash = ? WHERE id = ?
    `).run(hashedPassword, id);
  },

  // Delete user (but not admin with id=1)
  deleteUser: (id) => {
    // Prevent deleting the primary admin
    if (id === 1) {
      throw new Error('Cannot delete primary administrator');
    }
    return db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
  },

  // Check if username exists
  usernameExists: (username, excludeId = null) => {
    if (excludeId) {
      return db.prepare(`
        SELECT id FROM users WHERE username = ? AND id != ?
      `).get(username, excludeId);
    }
    return db.prepare(`
      SELECT id FROM users WHERE username = ?
    `).get(username);
  },

  // Get user count by role
  getUserStats: () => {
    return db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as managers,
        SUM(CASE WHEN role = 'sales' THEN 1 ELSE 0 END) as sales,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
      FROM users
    `).get();
  }
});

module.exports = { usersQueries };
