import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Warehouse,
  Users,
  UserCog,
  Receipt,
  FileBarChart,
  FileText,
  Truck,
  ChevronLeft,
  ChevronRight,
  Settings,
  LayoutDashboard,
  ShoppingCart,
  Sun,
  Moon,
  Languages,
  X,
  LogOut,
  Shield,
  UserCheck,
  User
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

// Al Assile Date Logo SVG Component
const AlAssileLogo = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Background Circle */}
    <circle cx="32" cy="32" r="30" fill="url(#logoGradient)" />

    {/* Date fruit shape */}
    <ellipse cx="32" cy="36" rx="12" ry="16" fill="#8B4513" />
    <ellipse cx="32" cy="36" rx="10" ry="14" fill="#A0522D" />
    <ellipse cx="29" cy="33" rx="4" ry="8" fill="#CD853F" opacity="0.6" />

    {/* Palm leaf accent */}
    <path d="M32 8 C32 8 24 16 24 20 C24 24 28 22 32 18 C36 22 40 24 40 20 C40 16 32 8 32 8Z" fill="#228B22" />
    <path d="M32 10 C32 10 26 16 26 19 C26 22 29 21 32 18 C35 21 38 22 38 19 C38 16 32 10 32 10Z" fill="#32CD32" />

    {/* Highlight */}
    <ellipse cx="28" cy="30" rx="3" ry="5" fill="white" opacity="0.2" />

    <defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stopColor="#D4A574" />
        <stop offset="100%" stopColor="#8B6914" />
      </linearGradient>
    </defs>
  </svg>
);

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, setLanguage, t } = useLanguage();
  const { user, logout, canAccess, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return Shield;
      case 'manager': return UserCheck;
      default: return User;
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: language === 'ar' ? 'مدير النظام' : language === 'fr' ? 'Administrateur' : 'Administrator',
      manager: language === 'ar' ? 'مدير' : language === 'fr' ? 'Responsable' : 'Manager',
      sales: language === 'ar' ? 'موظف مبيعات' : language === 'fr' ? 'Ventes' : 'Sales'
    };
    return labels[role] || role;
  };

  const allMenuItems = [
    {
      id: 'dashboard',
      label: t('dashboard'),
      icon: LayoutDashboard,
      path: '/',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'sales',
      label: t('pos'),
      icon: ShoppingCart,
      path: '/sales',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      id: 'stock',
      label: t('stock'),
      icon: Package,
      path: '/stock',
      color: 'from-amber-500 to-orange-500'
    },
    {
      id: 'inventory',
      label: t('inventory'),
      icon: Warehouse,
      path: '/inventory',
      color: 'from-violet-500 to-purple-500'
    },
    {
      id: 'clients',
      label: t('clients'),
      icon: Users,
      path: '/clients',
      color: 'from-orange-500 to-amber-500'
    },
    {
      id: 'employers',
      label: t('employers'),
      icon: UserCog,
      path: '/employers',
      color: 'from-pink-500 to-rose-500'
    },
    {
      id: 'expenses',
      label: t('expenses'),
      icon: Receipt,
      path: '/expenses',
      color: 'from-red-500 to-orange-500'
    },
    {
      id: 'reports',
      label: t('reports'),
      icon: FileBarChart,
      path: '/reports',
      color: 'from-indigo-500 to-blue-500'
    },
    {
      id: 'documents',
      label: t('documents'),
      icon: FileText,
      path: '/documents',
      color: 'from-violet-500 to-purple-500'
    },
    {
      id: 'suppliers',
      label: t('suppliers'),
      icon: Truck,
      path: '/suppliers',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: Settings,
      path: '/settings',
      color: 'from-slate-500 to-gray-500'
    },
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => canAccess(item.id));

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 88 }
  };

  const NavItem = ({ item, isCollapsed }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <NavLink to={item.path}>
        <motion.div
          className={`
            relative flex items-center gap-3 py-3 rounded-2xl
            cursor-pointer transition-all duration-300 group
            ${isCollapsed ? 'px-3 mx-2 justify-center' : 'px-4 mx-3'}
            ${isActive
              ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg'
              : 'text-dark-400 hover:text-white hover:bg-dark-800/60'
            }
          `}
          whileHover={{ scale: isCollapsed ? 1.05 : 1.02, x: isCollapsed ? 0 : 4 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Active indicator glow */}
          {isActive && (
            <motion.div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${item.color} opacity-20 blur-xl`}
              layoutId="activeGlow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 0.3 }}
            />
          )}

          {/* Icon container */}
          <div className={`
            relative z-10 flex items-center justify-center rounded-xl flex-shrink-0
            ${isCollapsed ? 'w-10 h-10' : 'w-9 h-9'}
            ${isActive
              ? 'bg-white/20'
              : 'bg-dark-800 group-hover:bg-dark-700'
            }
            transition-all duration-300
          `}>
            <Icon size={isCollapsed ? 20 : 18} strokeWidth={2} />
          </div>

          {/* Label */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                className="relative z-10 font-semibold text-sm whitespace-nowrap overflow-hidden"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Hover tooltip for collapsed state */}
          {isCollapsed && (
            <div className="
              absolute left-full ml-3 px-3 py-2 rounded-lg
              opacity-0 group-hover:opacity-100 pointer-events-none
              transition-opacity duration-200 whitespace-nowrap z-[100]
              shadow-xl
            "
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155'
            }}
            >
              <span className="text-sm font-medium" style={{ color: '#ffffff' }}>{item.label}</span>
              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2
                            w-2 h-2 rotate-45"
                   style={{ backgroundColor: '#1e293b', borderLeft: '1px solid #334155', borderBottom: '1px solid #334155' }} />
            </div>
          )}
        </motion.div>
      </NavLink>
    );
  };

  return (
    <>
      <motion.aside
        className="relative h-full bg-dark-900/95 backdrop-blur-xl border-r border-dark-800/50
                   flex flex-col shadow-2xl overflow-hidden"
        variants={sidebarVariants}
        initial="expanded"
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo Section */}
        <div className="relative px-4 py-4 border-b border-dark-800/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center gap-3"
              animate={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
            >
              {/* Al Assile Logo */}
              <motion.div
                className="logo-animate flex-shrink-0"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <AlAssileLogo size={isCollapsed ? 40 : 44} />
              </motion.div>

              {/* Logo Text */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="min-w-0"
                  >
                    <h1 className="text-lg font-bold text-white tracking-tight">
                      {language === 'ar' ? 'الأصيل' : 'Al Assile'}
                    </h1>
                    <p className="text-xs text-dark-500 font-medium">
                      {language === 'ar' ? 'منتجات التمور' : language === 'fr' ? 'Produits de Dattes' : 'Date Products'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Collapse Toggle Button - Inside sidebar */}
            <motion.button
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                         transition-all duration-200"
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8'
              }}
              onClick={() => setIsCollapsed(!isCollapsed)}
              whileHover={{ scale: 1.1, backgroundColor: '#334155' }}
              whileTap={{ scale: 0.9 }}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </motion.button>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden min-h-0">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.p
                className="px-7 mb-4 text-xs font-semibold text-dark-500 uppercase tracking-wider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {t('mainMenu')}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <NavItem item={item} isCollapsed={isCollapsed} />
              </motion.div>
            ))}
          </div>
        </nav>

        {/* Bottom Section - Premium Design */}
        <div className="mt-auto flex-shrink-0">
          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-dark-600 to-transparent" />

          {/* Quick Actions */}
          <div className="px-3 py-3">
            <div className={`flex ${isCollapsed ? 'flex-col gap-2' : 'gap-2'} items-center justify-center`}>
              {/* Settings */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSettings(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300"
                style={{
                  background: 'linear-gradient(to bottom right, #1e293b, #0f172a)',
                  border: '1px solid rgba(51, 65, 85, 0.5)'
                }}
                title={t('settings')}
              >
                <Settings size={16} className="text-violet-400" />
              </motion.button>

              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleTheme}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300"
                style={{
                  background: 'linear-gradient(to bottom right, #1e293b, #0f172a)',
                  border: '1px solid rgba(51, 65, 85, 0.5)'
                }}
                title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: theme === 'dark' ? 0 : 180 }}
                  transition={{ duration: 0.3 }}
                >
                  {theme === 'dark' ? (
                    <Sun size={16} className="text-amber-400" />
                  ) : (
                    <Moon size={16} className="text-amber-400" />
                  )}
                </motion.div>
              </motion.button>

              {/* Language Toggle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleLanguage}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300"
                style={{
                  background: 'linear-gradient(to bottom right, #1e293b, #0f172a)',
                  border: '1px solid rgba(51, 65, 85, 0.5)'
                }}
                title={language === 'en' ? 'العربية' : language === 'ar' ? 'Français' : 'English'}
              >
                <span className="text-xs font-bold text-emerald-400">
                  {language === 'en' ? 'ع' : language === 'ar' ? 'FR' : 'EN'}
                </span>
              </motion.button>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="px-3 pb-3">
            <motion.div
              className="relative overflow-hidden rounded-xl p-3 border transition-all duration-300"
              style={{
                background: 'linear-gradient(to bottom right, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))',
                borderColor: 'rgba(51, 65, 85, 0.5)'
              }}
            >
              {isCollapsed ? (
                /* Collapsed State - Vertical Layout */
                <div className="flex flex-col items-center gap-2">
                  {/* Avatar */}
                  <div className="relative">
                    <div className={`absolute -inset-0.5 rounded-lg opacity-75 blur-sm
                      ${user?.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                        user?.role === 'manager' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                        'bg-gradient-to-br from-emerald-500 to-emerald-700'}`} />
                    <div className={`relative w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-lg
                      ${user?.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                        user?.role === 'manager' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                        'bg-gradient-to-br from-emerald-500 to-emerald-700'}`}>
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full
                                  border-2 border-dark-800" />
                  </div>
                  {/* Logout Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleLogout}
                    className="w-full p-2 rounded-lg hover:bg-red-500/20 transition-all flex items-center justify-center"
                    style={{ color: '#ef4444' }}
                    title={t('logout')}
                  >
                    <LogOut size={16} />
                  </motion.button>
                </div>
              ) : (
                /* Expanded State - Horizontal Layout */
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`absolute -inset-0.5 rounded-lg opacity-75 blur-sm
                      ${user?.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                        user?.role === 'manager' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                        'bg-gradient-to-br from-emerald-500 to-emerald-700'}`} />
                    <div className={`relative w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-lg
                      ${user?.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                        user?.role === 'manager' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                        'bg-gradient-to-br from-emerald-500 to-emerald-700'}`}>
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full
                                  border-2 border-dark-800" />
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#ffffff' }}>
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs truncate flex items-center gap-1" style={{ color: '#94a3b8' }}>
                      {React.createElement(getRoleIcon(user?.role), { size: 11 })}
                      <span>{getRoleLabel(user?.role)}</span>
                    </p>
                  </div>

                  {/* Logout Button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleLogout}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-red-500/20 transition-all"
                    style={{ color: '#ef4444' }}
                    title={t('logout')}
                  >
                    <LogOut size={16} />
                  </motion.button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.aside>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto rounded-2xl border shadow-2xl"
              style={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#334155' }}>
                <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>{t('settings')}</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-lg hover:bg-slate-800"
                  style={{ color: '#94a3b8' }}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Theme Setting */}
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: '#cbd5e1' }}>
                    {t('appearance')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { toggleTheme(); if (theme === 'light') return; }}
                      className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all"
                      style={{
                        backgroundColor: theme === 'dark' ? '#334155' : 'rgba(30, 41, 59, 0.5)',
                        borderColor: theme === 'dark' ? '#10b981' : '#334155',
                        color: theme === 'dark' ? '#ffffff' : '#94a3b8'
                      }}
                    >
                      <Moon size={20} />
                      <span className="font-medium">{t('darkMode')}</span>
                    </button>
                    <button
                      onClick={() => { toggleTheme(); if (theme === 'dark') return; }}
                      className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all"
                      style={{
                        backgroundColor: theme === 'light' ? '#334155' : 'rgba(30, 41, 59, 0.5)',
                        borderColor: theme === 'light' ? '#10b981' : '#334155',
                        color: theme === 'light' ? '#ffffff' : '#94a3b8'
                      }}
                    >
                      <Sun size={20} />
                      <span className="font-medium">{t('lightMode')}</span>
                    </button>
                  </div>
                </div>

                {/* Language Setting */}
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: '#cbd5e1' }}>
                    {t('language')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => { if (language !== 'en') setLanguage('en'); }}
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border transition-all"
                      style={{
                        backgroundColor: language === 'en' ? '#334155' : 'rgba(30, 41, 59, 0.5)',
                        borderColor: language === 'en' ? '#10b981' : '#334155',
                        color: language === 'en' ? '#ffffff' : '#94a3b8'
                      }}
                    >
                      <span className="text-lg">🇬🇧</span>
                      <span className="font-medium text-sm">{t('english')}</span>
                    </button>
                    <button
                      onClick={() => { if (language !== 'ar') setLanguage('ar'); }}
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border transition-all"
                      style={{
                        backgroundColor: language === 'ar' ? '#334155' : 'rgba(30, 41, 59, 0.5)',
                        borderColor: language === 'ar' ? '#10b981' : '#334155',
                        color: language === 'ar' ? '#ffffff' : '#94a3b8'
                      }}
                    >
                      <span className="text-lg">🇩🇿</span>
                      <span className="font-medium text-sm">{t('arabic')}</span>
                    </button>
                    <button
                      onClick={() => { if (language !== 'fr') setLanguage('fr'); }}
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border transition-all"
                      style={{
                        backgroundColor: language === 'fr' ? '#334155' : 'rgba(30, 41, 59, 0.5)',
                        borderColor: language === 'fr' ? '#10b981' : '#334155',
                        color: language === 'fr' ? '#ffffff' : '#94a3b8'
                      }}
                    >
                      <span className="text-lg">🇫🇷</span>
                      <span className="font-medium text-sm">{t('french')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
