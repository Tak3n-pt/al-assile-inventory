import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Role-based menu permissions
export const rolePermissions = {
  admin: ['dashboard', 'sales', 'stock', 'inventory', 'clients', 'employers', 'expenses', 'reports', 'suppliers', 'documents', 'settings'],
  manager: ['dashboard', 'sales', 'stock', 'clients'],
  sales: ['dashboard', 'sales', 'stock', 'clients']
};

// Sessions older than this are discarded even if still in localStorage
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

// localStorage holds only { userId, loginAt } — never the full user record.
// The authoritative user (role, is_active, name) is fetched from the DB on each mount
// via auth:verifySession so a tampered localStorage can't escalate privileges.
const STORAGE_KEY = 'session';

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.userId !== 'number' || typeof parsed.loginAt !== 'number') return null;
    if (Date.now() - parsed.loginAt > SESSION_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: verify the stored session against the DB before trusting it
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Clean up any old-format localStorage entry from prior versions
      localStorage.removeItem('user');

      const stored = loadStoredSession();
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const r = await window.api.auth.verifySession(stored.userId);
        if (cancelled) return;
        if (r.success) {
          setUser(r.user);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = async (username, password) => {
    try {
      const result = await window.api.auth.login(username, password);
      if (result.success) {
        setUser(result.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          userId: result.user.id,
          loginAt: Date.now(),
        }));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('user');
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    const permissions = rolePermissions[user.role] || [];
    return permissions.includes(permission) || permissions.includes('*');
  };

  const canAccess = (pageId) => {
    return hasPermission(pageId);
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isManager = () => {
    return user?.role === 'manager' || user?.role === 'admin';
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    canAccess,
    isAdmin,
    isManager,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
