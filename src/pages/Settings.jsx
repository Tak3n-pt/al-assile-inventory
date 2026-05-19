import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Users,
  Shield,
  UserPlus,
  Trash2,
  Edit2,
  AlertTriangle,
  RefreshCw,
  Save,
  X,
  Eye,
  EyeOff,
  Lock,
  User,
  UserCheck,
  Check,
  Sun,
  Moon,
  Languages,
  Package,
  Warehouse,
  Search,
  Cloud,
  Upload,
  Download,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const Settings = () => {
  const { user, isAdmin, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  // Form states
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'sales'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Loading/error states
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  // Initial Inventory states
  const [stockItems, setStockItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryTab, setInventoryTab] = useState('stock'); // 'stock' or 'products'
  const [inventorySearch, setInventorySearch] = useState('');
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [savingQuantity, setSavingQuantity] = useState(false);

  // Cloud sync states
  const [cloudServerUrl, setCloudServerUrl] = useState('');
  const [cloudSyncKey, setCloudSyncKey] = useState('');
  const [syncPushing, setSyncPushing] = useState(false);
  const [syncPulling, setSyncPulling] = useState(false);
  const [syncMessage, setSyncMessage] = useState({ type: '', text: '' });
  const [lastSyncPush, setLastSyncPush] = useState(null);
  const [lastSyncPull, setLastSyncPull] = useState(null);
  const [backing, setBacking] = useState(false);

  // Load users and inventory
  useEffect(() => {
    if (isAdmin()) {
      loadUsers();
      loadInventory();
      loadSyncSettings();
    }
  }, []);

  // Listen for background sync errors from main process
  useEffect(() => {
    if (!window.api?.sync?.onStatus) return;
    const unsub = window.api.sync.onStatus((status) => {
      if (!status.ok) {
        setSyncMessage({ type: 'error', text: `Auto-sync ${status.type || ''} failed: ${status.message || 'connection error'}` });
        setTimeout(() => setSyncMessage({ type: '', text: '' }), 6000);
      }
    });
    return unsub;
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const result = await window.api.users.getAll();
      if (result.success) {
        setUsers(result.data || []);
      } else {
        console.error('Error loading users:', result.error);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load inventory (stock and products)
  const loadInventory = async () => {
    try {
      setLoadingInventory(true);
      const [stockResult, productsResult] = await Promise.all([
        window.api.stock.getAll(),
        window.api.products.getAll()
      ]);

      if (stockResult.success) {
        setStockItems(stockResult.data || []);
      }
      if (productsResult.success) {
        setProducts(productsResult.data || []);
      }
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoadingInventory(false);
    }
  };

  // Load cloud sync settings
  const loadSyncSettings = async () => {
    try {
      const [urlResult, keyResult, lastPushResult, lastPullResult] = await Promise.all([
        window.api.settings.get('cloud_server_url'),
        window.api.settings.get('cloud_sync_key'),
        window.api.settings.get('last_sync_push'),
        window.api.settings.get('last_sync_pull'),
      ]);
      if (urlResult.success && urlResult.data) setCloudServerUrl(urlResult.data);
      if (keyResult.success && keyResult.data) setCloudSyncKey(keyResult.data);
      if (lastPushResult.success && lastPushResult.data) setLastSyncPush(lastPushResult.data);
      if (lastPullResult.success && lastPullResult.data) setLastSyncPull(lastPullResult.data);
    } catch (err) {
      console.error('Error loading sync settings:', err);
    }
  };

  const handleSyncPush = async () => {
    if (!cloudServerUrl) {
      setSyncMessage({ type: 'error', text: t('pleaseEnterServerUrl') });
      return;
    }
    try {
      setSyncPushing(true);
      setSyncMessage({ type: '', text: '' });
      await Promise.all([
        window.api.settings.set('cloud_server_url', cloudServerUrl),
        window.api.settings.set('cloud_sync_key', cloudSyncKey),
      ]);
      const result = await window.api.sync.push(cloudServerUrl, cloudSyncKey);
      if (result.success) {
        const now = new Date().toISOString();
        setLastSyncPush(now);
        setSyncMessage({ type: 'success', text: t('dataPushedSuccess') });
      } else {
        setSyncMessage({ type: 'error', text: result.error || t('pushFailed') });
      }
    } catch (err) {
      setSyncMessage({ type: 'error', text: err.message });
    } finally {
      setSyncPushing(false);
    }
  };

  const handleSyncPull = async () => {
    if (!cloudServerUrl) {
      setSyncMessage({ type: 'error', text: t('pleaseEnterServerUrl') });
      return;
    }
    try {
      setSyncPulling(true);
      setSyncMessage({ type: '', text: '' });
      await Promise.all([
        window.api.settings.set('cloud_server_url', cloudServerUrl),
        window.api.settings.set('cloud_sync_key', cloudSyncKey),
      ]);
      const result = await window.api.sync.pull(cloudServerUrl, cloudSyncKey);
      if (result.success) {
        const now = new Date().toISOString();
        setLastSyncPull(now);
        setSyncMessage({
          type: 'success',
          text: t('pulledSalesFromMobile').replace('{n}', result.imported)
        });
      } else {
        setSyncMessage({ type: 'error', text: result.error || t('pullFailed') });
      }
    } catch (err) {
      setSyncMessage({ type: 'error', text: err.message });
    } finally {
      setSyncPulling(false);
    }
  };

  const handleBackup = async () => {
    try {
      setBacking(true);
      const result = await window.api.db.backup();
      if (result.success) {
        setSyncMessage({ type: 'success', text: language === 'ar' ? 'تم حفظ النسخة الاحتياطية بنجاح' : language === 'fr' ? 'Sauvegarde enregistrée avec succès' : `Backup saved successfully` });
      } else if (!result.canceled) {
        setSyncMessage({ type: 'error', text: result.error || 'Backup failed' });
      }
    } catch (err) {
      setSyncMessage({ type: 'error', text: err.message });
    } finally {
      setBacking(false);
    }
  };

  // Handle quantity edit
  const handleEditQuantity = (item, type) => {
    setEditingItem({ ...item, type });
    setNewQuantity(String(item.quantity || 0));
    setError('');
    setShowQuantityModal(true);
  };

  // Save quantity
  const handleSaveQuantity = async () => {
    const quantity = parseFloat(newQuantity);
    if (isNaN(quantity) || quantity < 0) {
      setError(t('pleaseEnterValidQuantity'));
      return;
    }

    try {
      setSavingQuantity(true);
      setError('');

      let result;
      if (editingItem.type === 'stock') {
        result = await window.api.stockQuantity.adjust(
          editingItem.id,
          quantity,
          t('openingBalanceAdjustment')
        );
      } else {
        result = await window.api.products.adjustQuantity(
          editingItem.id,
          quantity,
          t('openingBalanceInitialInventory')
        );
      }

      if (result.success) {
        setShowQuantityModal(false);
        setEditingItem(null);
        loadInventory();
      } else {
        setError(result.error || t('failedToSaveQuantity'));
      }
    } catch (err) {
      setError(err.message || t('errorOccurred'));
    } finally {
      setSavingQuantity(false);
    }
  };

  // Filter inventory items by search
  const filteredStockItems = stockItems.filter(item =>
    item.name?.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const filteredProducts = products.filter(item =>
    item.name?.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  // User CRUD operations
  const handleAddUser = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      password: '',
      name: '',
      role: 'sales'
    });
    setShowPassword(false);
    setError('');
    setShowUserModal(true);
  };

  const handleEditUser = (userData) => {
    setEditingUser(userData);
    setUserForm({
      username: userData.username,
      password: '',
      name: userData.name,
      role: userData.role
    });
    setShowPassword(false);
    setError('');
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.username || !userForm.name || !userForm.role) {
      setError(t('fillRequiredFields'));
      return;
    }

    if (!editingUser && !userForm.password) {
      setError(t('passwordRequiredNewUser'));
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (editingUser) {
        // Update existing user
        const updateResult = await window.api.users.update(editingUser.id, {
          username: userForm.username,
          name: userForm.name,
          role: userForm.role,
          is_active: editingUser.is_active !== undefined ? editingUser.is_active : 1
        });

        if (!updateResult.success) {
          setError(updateResult.error || t('failedToUpdateUser'));
          setSaving(false);
          return;
        }

        // Update password if provided
        if (userForm.password) {
          await window.api.users.updatePassword(editingUser.id, userForm.password);
        }
      } else {
        // Add new user
        const addResult = await window.api.users.add(userForm);
        if (!addResult.success) {
          setError(addResult.error || t('failedToAddUser'));
          setSaving(false);
          return;
        }
      }

      setShowUserModal(false);
      loadUsers();
    } catch (err) {
      setError(err.message || t('errorOccurred'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setSaving(true);
      setError('');
      const result = await window.api.users.delete(userToDelete.id);
      if (!result.success) {
        setError(result.error || t('failedToDeleteUser'));
        setSaving(false);
        return;
      }
      setShowDeleteModal(false);
      setUserToDelete(null);
      loadUsers();
    } catch (err) {
      setError(err.message || t('errorOccurred'));
    } finally {
      setSaving(false);
    }
  };

  // Reset system
  const handleReset = async () => {
    if (!resetPassword) {
      setError(t('pleaseEnterPassword'));
      return;
    }

    try {
      setResetting(true);
      setError('');

      const result = await window.api.system.reset({
        userId: user.id,
        password: resetPassword
      });

      if (result.success) {
        // Logout and redirect to login
        logout();
        window.location.hash = '#/login';
      } else {
        setError(result.error || t('systemResetFailed'));
      }
    } catch (err) {
      setError(err.message || t('errorOccurred'));
    } finally {
      setResetting(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'from-amber-500 to-amber-600';
      case 'manager': return 'from-blue-500 to-blue-600';
      case 'sales': return 'from-emerald-500 to-emerald-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'manager': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'sales': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: t('roleAdmin'),
      manager: t('roleManager'),
      sales: t('roleSales')
    };
    return labels[role] || role;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center shadow-lg">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {t('settings')}
            </h1>
            <p className="text-dark-400">
              {t('systemUserManagement')}
            </p>
          </div>
        </div>
      </div>

      {/* Appearance Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sun size={20} className="text-amber-400" />
          {t('appearanceAndLanguage')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-3">
              {t('themeLabel')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => theme !== 'dark' && toggleTheme()}
                className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all
                  ${theme === 'dark'
                    ? 'bg-dark-700 border-emerald-500 text-white'
                    : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600'}`}
              >
                <Moon size={20} />
                <span className="font-medium">{t('themeDark')}</span>
              </button>
              <button
                onClick={() => theme !== 'light' && toggleTheme()}
                className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all
                  ${theme === 'light'
                    ? 'bg-dark-700 border-emerald-500 text-white'
                    : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600'}`}
              >
                <Sun size={20} />
                <span className="font-medium">{t('themeLight')}</span>
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-3">
              {t('language')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => language !== 'en' && toggleLanguage()}
                className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all
                  ${language === 'en'
                    ? 'bg-dark-700 border-emerald-500 text-white'
                    : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600'}`}
              >
                <span className="text-lg">EN</span>
                <span className="font-medium">English</span>
              </button>
              <button
                onClick={() => language !== 'ar' && toggleLanguage()}
                className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all
                  ${language === 'ar'
                    ? 'bg-dark-700 border-emerald-500 text-white'
                    : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600'}`}
              >
                <span className="text-lg">ع</span>
                <span className="font-medium">العربية</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Admin Only Sections */}
      {isAdmin() && (
        <>
          {/* User Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users size={20} className="text-blue-400" />
                {t('userManagement')}
              </h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddUser}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
              >
                <UserPlus size={18} />
                {t('addUser')}
              </motion.button>
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((userData) => (
                  <motion.div
                    key={userData.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-4 bg-dark-900/50 rounded-xl border border-dark-700/50 hover:border-dark-600 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRoleColor(userData.role)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                        {userData.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Info */}
                      <div>
                        <p className="font-semibold text-white">{userData.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-dark-400">@{userData.username}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRoleBadgeColor(userData.role)}`}>
                            {getRoleLabel(userData.role)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEditUser(userData)}
                        className="p-2 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                        title={t('edit')}
                      >
                        <Edit2 size={18} />
                      </motion.button>
                      {userData.id !== user.id && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setUserToDelete(userData);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title={t('delete')}
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))}

                {users.length === 0 && (
                  <div className="text-center py-8 text-dark-400">
                    {t('noUsersFound')}
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Initial Inventory / Opening Balance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Warehouse size={20} className="text-emerald-400" />
                {t('initialInventory')}
              </h2>
            </div>

            <p className="text-dark-400 text-sm mb-4">
              {t('initialInventoryDesc')}
            </p>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setInventoryTab('stock')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all
                  ${inventoryTab === 'stock'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'bg-dark-800/50 text-dark-400 hover:text-white hover:bg-dark-700'}`}
              >
                <Package size={18} />
                {t('rawMaterials')}
                <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
                  {stockItems.length}
                </span>
              </button>
              <button
                onClick={() => setInventoryTab('products')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all
                  ${inventoryTab === 'products'
                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                    : 'bg-dark-800/50 text-dark-400 hover:text-white hover:bg-dark-700'}`}
              >
                <Warehouse size={18} />
                {t('products')}
                <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
                  {products.length}
                </span>
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder={t('searchEllipsis')}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Inventory List */}
            {loadingInventory ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {inventoryTab === 'stock' ? (
                  filteredStockItems.length > 0 ? (
                    filteredStockItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-dark-900/50 rounded-xl border border-dark-700/50 hover:border-dark-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
                            <Package size={18} />
                          </div>
                          <div>
                            <p className="font-medium text-white">{item.name}</p>
                            <p className="text-xs text-dark-400">{item.category_name || 'No category'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-white">
                              {item.quantity || 0} <span className="text-dark-400 text-sm">{item.unit}</span>
                            </p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditQuantity(item, 'stock')}
                            className="p-2 rounded-lg text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                            title={t('editQuantity')}
                          >
                            <Edit2 size={18} />
                          </motion.button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-dark-400">
                      {t('noRawMaterialsHint')}
                    </div>
                  )
                ) : (
                  filteredProducts.length > 0 ? (
                    filteredProducts.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-dark-900/50 rounded-xl border border-dark-700/50 hover:border-dark-600 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white">
                            <Warehouse size={18} />
                          </div>
                          <div>
                            <p className="font-medium text-white">{item.name}</p>
                            <p className="text-xs text-dark-400">
                              {item.selling_price ? `${item.selling_price.toLocaleString()} DZD` : 'No price'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-white">
                              {item.quantity || 0} <span className="text-dark-400 text-sm">{item.unit || 'pcs'}</span>
                            </p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditQuantity(item, 'product')}
                            className="p-2 rounded-lg text-dark-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                            title={t('editQuantity')}
                          >
                            <Edit2 size={18} />
                          </motion.button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-dark-400">
                      {t('noProductsHint')}
                    </div>
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* Cloud Sync */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700/50 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Cloud size={20} className="text-sky-400" />
              {t('cloudSync')}
            </h2>
            <p className="text-dark-400 text-sm mb-5">
              {t('cloudSyncDesc')}
            </p>

            <div className="space-y-4">
              {/* Server URL */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  {t('cloudServerUrl')}
                </label>
                <input
                  type="text"
                  value={cloudServerUrl}
                  onChange={(e) => setCloudServerUrl(e.target.value)}
                  placeholder="https://your-server.com"
                  className="w-full px-4 py-3 rounded-xl bg-dark-900/60 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Sync Key */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  {t('syncApiKey')}
                </label>
                <input
                  type="text"
                  value={cloudSyncKey}
                  onChange={(e) => setCloudSyncKey(e.target.value)}
                  placeholder={t('enterSyncKey')}
                  className="w-full px-4 py-3 rounded-xl bg-dark-900/60 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Status message */}
              {syncMessage.text && (
                <div className={`p-3 rounded-xl text-sm border ${
                  syncMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {syncMessage.text}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSyncPush}
                  disabled={syncPushing || syncPulling}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-sky-500/25 transition-all disabled:opacity-50"
                >
                  {syncPushing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Upload size={18} />
                  )}
                  {t('pushToCloud')}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSyncPull}
                  disabled={syncPushing || syncPulling}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
                >
                  {syncPulling ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  {t('pullFromCloud')}
                </motion.button>
              </div>

              {/* Backup button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleBackup}
                disabled={backing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
                style={{ background: 'rgba(212,165,116,0.08)', border: '1px solid rgba(212,165,116,0.2)', color: '#D4A574' }}
              >
                {backing ? (
                  <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(212,165,116,0.2)', borderTopColor: '#D4A574' }} />
                ) : (
                  <HardDrive size={18} />
                )}
                {language === 'ar' ? 'نسخ احتياطي للقاعدة' : language === 'fr' ? 'Sauvegarder la base de données' : 'Backup Database'}
              </motion.button>

              {/* Timestamps */}
              {(lastSyncPush || lastSyncPull) && (
                <div className="pt-2 space-y-1.5 border-t border-dark-700/50">
                  {lastSyncPush && (
                    <div className="flex items-center justify-between text-xs text-dark-400">
                      <span className="flex items-center gap-1.5">
                        <Upload size={12} className="text-sky-400" />
                        {t('lastPush')}
                      </span>
                      <span>{new Date(lastSyncPush).toLocaleString()}</span>
                    </div>
                  )}
                  {lastSyncPull && (
                    <div className="flex items-center justify-between text-xs text-dark-400">
                      <span className="flex items-center gap-1.5">
                        <Download size={12} className="text-violet-400" />
                        {t('lastPull')}
                      </span>
                      <span>{new Date(lastSyncPull).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* System Reset */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-red-500/30 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-400" />
              {t('systemReset')}
            </h2>
            <p className="text-dark-400 mb-4">
              {t('systemResetDesc')}
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setResetPassword('');
                setError('');
                setShowResetModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all"
            >
              <RefreshCw size={18} />
              {t('resetSystem')}
            </motion.button>
          </motion.div>
        </>
      )}

      {/* User Modal */}
      <AnimatePresence>
        {showUserModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowUserModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                <h2 className="text-lg font-semibold text-white">
                  {editingUser ? t('editUser') : t('addNewUser')}
                </h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('name')} *
                  </label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder={t('enterName')}
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('username')} *
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder={t('enterUsername')}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('password')}
                    {!editingUser && ' *'}
                    {editingUser && (
                      <span className="text-dark-500 text-xs mr-2">
                        ({t('leaveEmptyToKeep')})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder={t('enterPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-dark-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('role')} *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['admin', 'manager', 'sales'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setUserForm({ ...userForm, role })}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all
                          ${userForm.role === role
                            ? `bg-gradient-to-br ${getRoleColor(role)} text-white border-transparent`
                            : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600'}`}
                      >
                        {role === 'admin' && <Shield size={20} />}
                        {role === 'manager' && <UserCheck size={20} />}
                        {role === 'sales' && <User size={20} />}
                        <span className="text-xs font-medium">{getRoleLabel(role)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-dark-800 text-white font-medium hover:bg-dark-700 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSaveUser}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={18} />
                        {t('save')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && userToDelete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Trash2 size={32} className="text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {t('deleteUser')}
                </h3>
                <p className="text-dark-400 mb-6">
                  {t('confirmDeleteUserName').replace('{name}', userToDelete.name)}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-dark-800 text-white font-medium hover:bg-dark-700 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={18} />
                        {t('delete')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowResetModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto bg-dark-900 rounded-2xl border border-red-500/30 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle size={32} className="text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 text-center">
                  {t('warning')}
                </h3>
                <p className="text-dark-400 mb-4 text-center">
                  {t('resetConfirmDesc')}
                </p>

                {/* Data that will be deleted */}
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400 font-medium mb-2">
                    {t('willBeDeleted')}
                  </p>
                  <ul className="text-sm text-dark-400 space-y-1">
                    <li>• {t('allProductsAndStock')}</li>
                    <li>• {t('allSalesAndPurchases')}</li>
                    <li>• {t('allClientsAndSuppliers')}</li>
                    <li>• {t('allExpensesAndDocs')}</li>
                    <li>• {t('allEmployersAndPayroll')}</li>
                  </ul>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Password Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-red-500 transition-colors"
                      placeholder={t('enterYourPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-dark-400 hover:text-white"
                    >
                      {showResetPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-dark-800 text-white font-medium hover:bg-dark-700 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={resetting || !resetPassword}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50"
                  >
                    {resetting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <RefreshCw size={18} />
                        {t('reset')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quantity Edit Modal */}
      <AnimatePresence>
        {showQuantityModal && editingItem && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowQuantityModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="p-6">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  editingItem.type === 'stock'
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20'
                    : 'bg-gradient-to-br from-violet-500/20 to-purple-500/20'
                }`}>
                  {editingItem.type === 'stock' ? (
                    <Package size={32} className="text-amber-400" />
                  ) : (
                    <Warehouse size={32} className="text-violet-400" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 text-center">
                  {t('editQuantity')}
                </h3>
                <p className="text-dark-400 mb-4 text-center">
                  {editingItem.name}
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Current Quantity Info */}
                <div className="mb-4 p-3 rounded-xl bg-dark-800/50 border border-dark-700/50">
                  <div className="flex justify-between items-center">
                    <span className="text-dark-400 text-sm">
                      {t('currentQuantityColon')}
                    </span>
                    <span className="text-white font-semibold">
                      {editingItem.quantity || 0} {editingItem.unit || (editingItem.type === 'stock' ? 'kg' : 'pcs')}
                    </span>
                  </div>
                </div>

                {/* New Quantity Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('newQuantityLabel')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newQuantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setNewQuantity(value);
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder={t('enterQuantity')}
                      autoFocus
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400">
                      {editingItem.unit || (editingItem.type === 'stock' ? 'kg' : 'pcs')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowQuantityModal(false);
                      setEditingItem(null);
                      setError('');
                    }}
                    className="flex-1 px-4 py-3 rounded-xl bg-dark-800 text-white font-medium hover:bg-dark-700 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSaveQuantity}
                    disabled={savingQuantity || !newQuantity}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50 ${
                      editingItem.type === 'stock'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/25'
                        : 'bg-gradient-to-r from-violet-500 to-purple-500 hover:shadow-lg hover:shadow-violet-500/25'
                    }`}
                  >
                    {savingQuantity ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={18} />
                        {t('save')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
