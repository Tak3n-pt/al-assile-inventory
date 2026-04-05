import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Role-based menu permissions
export const rolePermissions = {
  admin: ['dashboard', 'sales', 'stock', 'inventory', 'clients', 'employers', 'expenses', 'reports', 'suppliers', 'documents', 'settings'],
  manager: ['dashboard', 'sales', 'stock', 'clients'],
  sales: ['dashboard', 'sales', 'stock', 'clients']
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for saved session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const result = await window.api.auth.login(username, password);
      if (result.success) {
        setUser(result.user);
        localStorage.setItem('user', JSON.stringify(result.user));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
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
