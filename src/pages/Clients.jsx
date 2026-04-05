import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, Filter, Edit2, Trash2, Phone, Mail, MapPin,
  ShoppingCart, DollarSign, AlertTriangle, ChevronDown, Eye, CreditCard,
  FileText, FileCheck, FilePlus, Printer
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ClientModal from '../components/ClientModal';
import SaleModal from '../components/SaleModal';
import DocumentGeneratorModal from '../components/documents/DocumentGeneratorModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import CustomSelect from '../components/CustomSelect';

const Clients = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [clients, setClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDebtOnly, setShowDebtOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('clients');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editingSale, setEditingSale] = useState(null);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSale, setPaymentSale] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Selected client for sales view
  const [selectedClient, setSelectedClient] = useState(null);

  // Document generation states
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState(null);
  const [selectedSaleForDoc, setSelectedSaleForDoc] = useState(null);
  const [companySettings, setCompanySettings] = useState({});

  useEffect(() => {
    loadData();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await window.api.settings.get('company_settings');
      if (result.success && result.data) {
        setCompanySettings(JSON.parse(result.data.value));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Open document generator for a specific sale
  const handleGenerateDocument = (sale, docType) => {
    setSelectedSaleForDoc(sale);
    setSelectedDocType(docType);
    setShowDocModal(true);
  };

  const loadData = async () => {
    try {
      const [clientsRes, salesRes, productsRes, statsRes] = await Promise.all([
        window.api.clients.getAll(),
        window.api.sales.getAll(),
        window.api.products.getAll(),
        window.api.clients.getStats()
      ]);

      if (clientsRes.success) setClients(clientsRes.data);
      if (salesRes.success) setSales(salesRes.data);
      if (productsRes.success) setProducts(productsRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Client CRUD
  const handleSaveClient = async (data) => {
    try {
      const result = editingClient
        ? await window.api.clients.update(editingClient.id, data)
        : await window.api.clients.add(data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save client');
      }
      setShowClientModal(false);
      setEditingClient(null);
      loadData();
    } catch (error) {
      console.error('Error saving client:', error);
      alert(error.message || 'Error saving client');
    }
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowClientModal(true);
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm(t('confirmDeleteClient'))) {
      try {
        const result = await window.api.clients.delete(id);
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete client');
        }
        loadData();
      } catch (error) {
        console.error('Error deleting client:', error);
        alert(error.message || 'Error deleting client');
      }
    }
  };

  // Sale CRUD
  const handleSaveSale = async ({ sale, items }) => {
    try {
      if (editingSale) {
        const updateResult = await window.api.sales.update(editingSale.id, sale);
        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Failed to update sale');
        }
      } else {
        // Create sale
        const result = await window.api.sales.add(sale);
        if (!result.success) {
          throw new Error(result.error || 'Failed to create sale');
        }
        const saleId = result.data.lastInsertRowid;
        // Add items with rollback on failure
        for (const item of items) {
          const itemResult = await window.api.sales.addItem({
            sale_id: saleId,
            ...item
          });
          if (!itemResult.success) {
            await window.api.sales.delete(saleId);
            throw new Error(itemResult.error || 'Failed to add sale item');
          }
        }
      }
      setShowSaleModal(false);
      setEditingSale(null);
      loadData();
    } catch (error) {
      console.error('Error saving sale:', error);
      alert(error.message || 'Error saving sale');
    }
  };

  const handleDeleteSale = async (id) => {
    if (window.confirm(t('confirmDeleteSale'))) {
      try {
        const result = await window.api.sales.delete(id);
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete sale');
        }
        loadData();
      } catch (error) {
        console.error('Error deleting sale:', error);
        alert(error.message || 'Error deleting sale');
      }
    }
  };

  // Payment handling
  const handleAddPayment = async () => {
    if (!paymentSale || !paymentAmount) return;
    try {
      const result = await window.api.sales.addPayment(paymentSale.id, parseFloat(paymentAmount));
      if (!result.success) {
        throw new Error(result.error || 'Failed to add payment');
      }
      setShowPaymentModal(false);
      setPaymentSale(null);
      setPaymentAmount('');
      loadData();
    } catch (error) {
      console.error('Error adding payment:', error);
      alert(error.message || 'Error adding payment');
    }
  };

  // Filtering
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.phone && client.phone.includes(searchQuery)) ||
      (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDebt = !showDebtOnly || client.outstanding_debt > 0 || client.balance < 0;
    return matchesSearch && matchesDebt;
  });

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    const matchesClient = !selectedClient || sale.client_id === selectedClient.id;
    return matchesSearch && matchesStatus && matchesClient;
  });

  const statCards = [
    {
      label: t('totalClients'),
      value: stats?.total_clients || 0,
      icon: Users,
      color: 'from-cyan-500 to-blue-500'
    },
    {
      label: t('totalSales'),
      value: stats?.total_sales || 0,
      icon: ShoppingCart,
      color: 'from-emerald-500 to-green-500'
    },
    {
      label: t('totalRevenue'),
      value: `${(stats?.total_revenue || 0).toLocaleString()} DZD`,
      icon: DollarSign,
      color: 'from-violet-500 to-purple-500'
    },
    {
      label: t('outstanding'),
      value: `${(stats?.total_outstanding || 0).toLocaleString()} DZD`,
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-500'
    }
  ];

  return (
    <div>
      <PageHeader
        title={t('clients')}
        subtitle={t('manageClients')}
        icon={Users}
        gradient="from-cyan-500 to-blue-500"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingSale(null);
                setShowSaleModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-dark-700 text-white font-medium text-sm
                       hover:bg-dark-600 transition-colors"
            >
              <ShoppingCart size={18} />
              {t('newSale')}
            </button>
            <button
              onClick={() => {
                setEditingClient(null);
                setShowClientModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-cyan-500 to-blue-500
                       text-white font-semibold text-sm
                       hover:shadow-lg hover:shadow-cyan-500/25
                       transition-all duration-300"
            >
              <Plus size={18} />
              {t('addClient')}
            </button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-dark-800/50 rounded-2xl p-4 border border-dark-700/50"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-dark-400 text-xs">{stat.label}</p>
                <p className="text-white font-semibold">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex bg-dark-800/50 rounded-xl p-1">
          <button
            onClick={() => { setActiveTab('clients'); setSelectedClient(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'clients'
                ? 'bg-cyan-500 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {t('clients')} ({clients.length})
          </button>
          <button
            onClick={() => { setActiveTab('sales'); setSelectedClient(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'sales'
                ? 'bg-cyan-500 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {t('sales')} ({sales.length})
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
          <input
            type="text"
            placeholder={activeTab === 'clients' ? t('searchClients') : t('searchSales')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-800/50 border border-dark-700/50
                     text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500/50
                     transition-colors duration-200"
          />
        </div>

        {activeTab === 'clients' ? (
          <button
            onClick={() => setShowDebtOnly(!showDebtOnly)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
              showDebtOnly
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:text-white'
            }`}
          >
            <AlertTriangle size={18} />
            {t('withDebt')}
          </button>
        ) : (
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'all', label: t('allStatus') },
              { value: 'paid', label: t('paid') },
              { value: 'partial', label: t('partial') },
              { value: 'pending', label: t('pending') },
            ]}
          />
        )}
      </div>

      {/* Selected Client Filter */}
      {selectedClient && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-dark-400 text-sm">{t('showingSalesFor')}:</span>
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm font-medium">
            {selectedClient.name}
          </span>
          <button
            onClick={() => setSelectedClient(null)}
            className="text-dark-500 hover:text-white text-sm"
          >
            {t('clear')}
          </button>
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'clients' ? (
          <motion.div
            key="clients"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {filteredClients.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {filteredClients.map((client, index) => (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-dark-800/50 rounded-2xl p-5 border border-dark-700/50 hover:border-dark-600 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold truncate">{client.name}</h3>
                          <p className="text-dark-400 text-sm">
                            {client.sale_count || 0} {t('orders')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setActiveTab('sales');
                          }}
                          className="p-2 rounded-lg text-dark-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title={t('viewSales')}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEditClient(client)}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {client.phone && (
                        <div className="flex items-center gap-2 text-dark-400">
                          <Phone size={14} />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2 text-dark-400">
                          <Mail size={14} />
                          <span>{client.email}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-center gap-2 text-dark-400">
                          <MapPin size={14} />
                          <span className="truncate">{client.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-700/50">
                      <div>
                        <p className="text-dark-500 text-xs">{t('totalPurchases')}</p>
                        <p className="text-white font-semibold">
                          {(client.total_purchases || 0).toLocaleString()} DZD
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-dark-500 text-xs">{t('outstanding')}</p>
                        <p className={`font-semibold ${
                          client.outstanding_debt > 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {(client.outstanding_debt || 0).toLocaleString()} DZD
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl
                            bg-dark-800/30 border border-dark-700/30 border-dashed">
                <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-dark-500" />
                </div>
                <h3 className="text-lg font-semibold text-dark-300 mb-2">{t('noClientsYet')}</h3>
                <p className="text-dark-500 text-sm mb-6">{t('startAddingCustomers')}</p>
                <button
                  onClick={() => {
                    setEditingClient(null);
                    setShowClientModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                           bg-dark-700 text-white font-medium text-sm
                           hover:bg-dark-600 transition-colors duration-200"
                >
                  <Plus size={18} />
                  {t('addFirstClient')}
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="sales"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {filteredSales.length > 0 ? (
              <div className="bg-dark-800/30 rounded-2xl border border-dark-700/50 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700/50">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('date')}</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('client')}</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('items')}</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('total')}</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('paid')}</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('status')}</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-dark-700/30 hover:bg-dark-800/30">
                        <td className="px-6 py-4 text-white">
                          {new Date(sale.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">{sale.client_name}</p>
                            {sale.client_phone && (
                              <p className="text-dark-500 text-sm">{sale.client_phone}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-dark-400">
                          {sale.item_count || 0} {t('items')}
                        </td>
                        <td className="px-6 py-4 text-right text-white font-semibold">
                          {sale.total.toLocaleString()} DZD
                        </td>
                        <td className="px-6 py-4 text-right text-emerald-400">
                          {sale.paid_amount.toLocaleString()} DZD
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            sale.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : sale.status === 'partial'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {t(sale.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Document Generation Buttons */}
                            <button
                              onClick={() => handleGenerateDocument(sale, 'invoice')}
                              className="p-2 rounded-lg text-dark-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                              title={t('generateInvoice')}
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              onClick={() => handleGenerateDocument(sale, 'delivery')}
                              className="p-2 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                              title={t('generateDeliveryNote')}
                            >
                              <FileCheck size={16} />
                            </button>
                            <button
                              onClick={() => handleGenerateDocument(sale, 'proforma')}
                              className="p-2 rounded-lg text-dark-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                              title={t('generateProforma')}
                            >
                              <FilePlus size={16} />
                            </button>

                            {/* Divider */}
                            <div className="w-px h-4 bg-dark-700 mx-1"></div>

                            {sale.status !== 'paid' && (
                              <button
                                onClick={() => {
                                  setPaymentSale(sale);
                                  setShowPaymentModal(true);
                                }}
                                className="p-2 rounded-lg text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                title={t('addPayment')}
                              >
                                <CreditCard size={16} />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteSale(sale.id)}
                                className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl
                            bg-dark-800/30 border border-dark-700/30 border-dashed">
                <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-8 h-8 text-dark-500" />
                </div>
                <h3 className="text-lg font-semibold text-dark-300 mb-2">{t('noSalesYet')}</h3>
                <p className="text-dark-500 text-sm mb-6">{t('startRecordingSales')}</p>
                <button
                  onClick={() => {
                    setEditingSale(null);
                    setShowSaleModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                           bg-dark-700 text-white font-medium text-sm
                           hover:bg-dark-600 transition-colors duration-200"
                >
                  <Plus size={18} />
                  {t('createFirstSale')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <ClientModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
        editItem={editingClient}
      />

      <SaleModal
        isOpen={showSaleModal}
        onClose={() => {
          setShowSaleModal(false);
          setEditingSale(null);
        }}
        onSave={handleSaveSale}
        editItem={editingSale}
        clients={clients}
        products={products}
      />

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && paymentSale && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowPaymentModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">{t('addPayment')}</h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-dark-800/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">{t('client')}:</span>
                    <span className="text-white">{paymentSale.client_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">{t('total')}:</span>
                    <span className="text-white">{paymentSale.total.toLocaleString()} DZD</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">{t('alreadyPaid')}:</span>
                    <span className="text-emerald-400">{paymentSale.paid_amount.toLocaleString()} DZD</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-dark-700">
                    <span className="text-dark-400">{t('remaining')}:</span>
                    <span className="text-amber-400 font-semibold">
                      {(paymentSale.total - paymentSale.paid_amount).toLocaleString()} DZD
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('paymentAmount')} (DZD)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={t('enterAmount')}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentSale(null);
                      setPaymentAmount('');
                    }}
                    className="px-5 py-2.5 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleAddPayment}
                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CreditCard size={18} />
                    {t('recordPayment')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Generator Modal */}
      <DocumentGeneratorModal
        isOpen={showDocModal}
        onClose={() => {
          setShowDocModal(false);
          setSelectedDocType(null);
          setSelectedSaleForDoc(null);
        }}
        documentType={selectedDocType}
        preSelectedSale={selectedSaleForDoc}
        sales={sales}
        settings={companySettings}
      />
    </div>
  );
};

export default Clients;
