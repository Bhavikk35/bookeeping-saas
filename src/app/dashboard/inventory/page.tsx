'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/components/providers/TenantContext';
import { InventoryItem, InventorySummary } from '@/lib/types';
import {
  Package,
  PlusCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Trash2,
  Edit3,
  RefreshCw,
  TrendingDown,
  Layers,
  Calendar,
  Tag,
  DollarSign,
  X,
  Zap,
} from 'lucide-react';

export default function InventoryPage() {
  const { currentBusiness } = useTenant();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'Food & Retail',
    quantity_in_stock: '50',
    unit_price: '',
    min_stock_alert: '5',
    expiry_date: '',
    sku: '',
    batch_number: '',
  });

  const fetchInventoryData = async () => {
    const bizId = currentBusiness?.id || 'biz_tenant_demo';
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/list?businessId=${bizId}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setSummary(data.summary || null);
      }
    } catch (e) {
      console.error('Failed to fetch inventory data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [currentBusiness?.id]);

  const handleOpenAddModal = (item?: InventoryItem) => {
    setErrorMsg(null);
    if (item) {
      setEditingItem(item);
      setFormData({
        item_name: item.item_name,
        category: item.category || 'Food & Retail',
        quantity_in_stock: String(item.quantity_in_stock),
        unit_price: String(item.unit_price),
        min_stock_alert: String(item.min_stock_alert ?? 5),
        expiry_date: item.expiry_date || '',
        sku: item.sku || '',
        batch_number: item.batch_number || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        item_name: '',
        category: 'Food & Retail',
        quantity_in_stock: '50',
        unit_price: '',
        min_stock_alert: '5',
        expiry_date: '',
        sku: '',
        batch_number: '',
      });
    }
    setModalOpen(true);
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_name.trim()) {
      setErrorMsg('Please enter a valid product name.');
      return;
    }

    const bizId = currentBusiness?.id || 'biz_tenant_demo';
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem?.id,
          business_id: bizId,
          item_name: formData.item_name.trim(),
          category: formData.category,
          quantity_in_stock: parseInt(formData.quantity_in_stock, 10) || 0,
          unit_price: parseFloat(formData.unit_price) || 0,
          min_stock_alert: parseInt(formData.min_stock_alert, 10) || 5,
          expiry_date: formData.expiry_date || null,
          sku: formData.sku || null,
          batch_number: formData.batch_number || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchInventoryData();
      } else {
        setErrorMsg(data.error || 'Failed to save inventory item.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from inventory?')) return;
    const bizId = currentBusiness?.id || 'biz_tenant_demo';
    try {
      const res = await fetch('/api/inventory/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: bizId, id: itemId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchInventoryData();
      }
    } catch (e) {
      console.error('Failed to delete item:', e);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const in15DaysStr = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

  // Helper for Expiry Status Calculation
  const getExpiryBadge = (expiryDate?: string | null) => {
    if (!expiryDate) return null;
    if (expiryDate < todayStr) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
          <AlertCircle className="w-3 h-3 shrink-0" /> EXPIRED ({expiryDate})
        </span>
      );
    }
    if (expiryDate <= in15DaysStr) {
      const daysDiff = Math.ceil(
        (new Date(expiryDate).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24)
      );
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          <Clock className="w-3 h-3 shrink-0" /> Expiring in {daysDiff}d ({expiryDate})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#168A55] bg-[#EAF7F0] px-2 py-0.5 rounded-full border border-[#168A55]/20">
        <CheckCircle2 className="w-3 h-3 shrink-0" /> Fresh ({expiryDate})
      </span>
    );
  };

  // Filtered Inventory List
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();

    let matchesStatus = true;
    if (selectedStatus === 'low_stock') {
      matchesStatus = item.quantity_in_stock <= (item.min_stock_alert ?? 5);
    } else if (selectedStatus === 'expiring_soon') {
      matchesStatus = Boolean(item.expiry_date && item.expiry_date >= todayStr && item.expiry_date <= in15DaysStr);
    } else if (selectedStatus === 'expired') {
      matchesStatus = Boolean(item.expiry_date && item.expiry_date < todayStr);
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(items.map((i) => i.category || 'General')));
  const currencySymbol = currentBusiness?.currency === 'USD' ? '$' : '₹';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF7F0] border border-[#168A55]/20 text-[#168A55] flex items-center justify-center shrink-0 shadow-xs">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#17211C] tracking-tight">Inventory & Expiry Reminders</h2>
            <p className="text-xs text-[#66736C] mt-1">
              Load products, set prices, track real-time stock levels, and set expiry date reminders for{' '}
              <strong className="text-[#17211C] font-semibold">{currentBusiness?.business_name || 'My Business'}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchInventoryData}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-[#E2E8E4] rounded-xl text-xs font-bold text-[#17211C] transition-colors"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 text-[#66736C] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 bg-[#168A55] hover:bg-[#0D5C3A] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 active:scale-98"
          >
            <PlusCircle className="w-4 h-4" /> Load / Restock Product
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#66736C] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Inventory Value</span>
            <DollarSign className="w-4 h-4 text-[#168A55]" />
          </div>
          <div className="text-xl font-black text-[#17211C] font-mono">
            {currencySymbol}
            {summary?.totalInventoryValue.toLocaleString('en-IN') || '0'}
          </div>
          <p className="text-[10px] text-[#66736C] mt-1 font-medium">
            {summary?.totalStockQuantity || 0} total units in stock
          </p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#66736C] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Products Loaded</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-[#17211C] font-mono">{summary?.totalItems || 0}</div>
          <p className="text-[10px] text-[#66736C] mt-1 font-medium">Active product catalog</p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#66736C] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Low Stock Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-[#17211C] font-mono">{summary?.lowStockCount || 0}</span>
            {(summary?.lowStockCount || 0) > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Action Needed
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#66736C] mt-1 font-medium">Stock ≤ alert threshold</p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#66736C] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expiring / Expired</span>
            <Clock className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-[#17211C] font-mono">
              {(summary?.expiringSoonCount || 0) + (summary?.expiredCount || 0)}
            </span>
            {(summary?.expiredCount || 0) > 0 ? (
              <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                {summary?.expiredCount} Expired!
              </span>
            ) : (summary?.expiringSoonCount || 0) > 0 ? (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Expiring Soon
              </span>
            ) : null}
          </div>
          <p className="text-[10px] text-[#66736C] mt-1 font-medium">Expiry reminders & alerts</p>
        </div>
      </div>

      {/* Expiry & Low Stock Warning Banner (If Any Items Need Attention) */}
      {((summary?.lowStockCount || 0) > 0 || (summary?.expiringSoonCount || 0) > 0 || (summary?.expiredCount || 0) > 0) && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-amber-950">Inventory Attention Required</h4>
              <p className="mt-0.5 text-amber-800">
                You have <strong>{summary?.lowStockCount || 0}</strong> low stock product(s) and{' '}
                <strong>{(summary?.expiringSoonCount || 0) + (summary?.expiredCount || 0)}</strong> product(s) expiring soon or expired.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => setSelectedStatus('low_stock')}
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg transition-colors text-[11px]"
            >
              View Low Stock
            </button>
            <button
              onClick={() => setSelectedStatus('expiring_soon')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors text-[11px]"
            >
              View Expiring Items
            </button>
          </div>
        </div>
      )}

      {/* Main Inventory Content Box */}
      <div className="bg-white border border-[#E2E8E4] rounded-2xl shadow-xs overflow-hidden space-y-4 p-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#E2E8E4] pb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#66736C] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name, SKU, or category..."
              className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl pl-10 pr-4 py-2 text-xs text-[#17211C] placeholder-[#66736C] focus:outline-none focus:border-[#168A55]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#17211C] focus:outline-none focus:border-[#168A55]"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#17211C] focus:outline-none focus:border-[#168A55]"
            >
              <option value="all">All Stock & Expiry Status</option>
              <option value="low_stock">⚠️ Low Stock</option>
              <option value="expiring_soon">⏳ Expiring Soon (15 days)</option>
              <option value="expired">🚨 Expired Products</option>
            </select>

            {(selectedCategory !== 'all' || selectedStatus !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                }}
                className="text-xs text-[#66736C] hover:text-[#17211C] underline font-bold px-2"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Inventory Items Table */}
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <RefreshCw className="w-8 h-8 text-[#168A55] animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#66736C]">Loading business inventory...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Package className="w-12 h-12 text-[#66736C] mx-auto opacity-40" />
            <h3 className="text-base font-extrabold text-[#17211C]">No inventory products found</h3>
            <p className="text-xs text-[#66736C] max-w-sm mx-auto">
              Load products (e.g. Maggie, Milk, Bread, Biscuits) to track stock levels, unit prices, and expiry reminders.
            </p>
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 bg-[#168A55] hover:bg-[#0D5C3A] text-white font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Load Product Stock
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8E4] bg-[#F7F9F8]/60 text-[11px] font-bold uppercase tracking-wider text-[#66736C]">
                  <th className="py-3 px-4">Product Name & Category</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4">Stock Level</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E4] text-xs font-medium text-[#17211C]">
                {filteredItems.map((item) => {
                  const isLowStock = item.quantity_in_stock <= (item.min_stock_alert ?? 5);
                  const isOutOfStock = item.quantity_in_stock === 0;
                  const expiryBadge = getExpiryBadge(item.expiry_date);

                  return (
                    <tr key={item.id} className="hover:bg-[#F7F9F8]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#17211C] flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#168A55] shrink-0" />
                          <span>{item.item_name}</span>
                        </div>
                        <div className="text-[11px] text-[#66736C] flex items-center gap-2 mt-0.5">
                          <span>{item.category || 'General'}</span>
                          {item.sku && <span className="font-mono text-[10px]">SKU: {item.sku}</span>}
                          {item.batch_number && <span className="font-mono text-[10px]">Batch: {item.batch_number}</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold">
                        {currencySymbol}
                        {Number(item.unit_price).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-sm">{item.quantity_in_stock}</span>
                          <span className="text-[11px] text-[#66736C]">units</span>
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              Out of Stock 🚨
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Low Stock ⚠️
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[#168A55] bg-[#EAF7F0] px-2 py-0.5 rounded-full border border-[#168A55]/20">
                              In Stock
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {expiryBadge ? (
                          expiryBadge
                        ) : (
                          <span className="text-[11px] text-[#66736C] italic">No Expiry Set</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenAddModal(item)}
                            className="p-1.5 rounded-lg text-[#66736C] hover:text-[#168A55] hover:bg-[#EAF7F0] transition-colors"
                            title="Edit Stock / Price / Expiry"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded-lg text-[#66736C] hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Load / Restock Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8E4] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-[#66736C] hover:text-[#17211C] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-[#E2E8E4] pb-3">
              <h3 className="text-base font-extrabold text-[#17211C] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#168A55]" />
                {editingItem ? 'Edit Product Stock & Expiry' : 'Load / Restock Product in Inventory'}
              </h3>
              <p className="text-xs text-[#66736C] mt-0.5">
                Add stock for any product (e.g. Maggie, Parle-G, Milk, Bread, Samosa) with price and expiry reminders.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#17211C] mb-1">Product / Item Name *</label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  placeholder="e.g. Maggie 2-Min Noodles, Dairy Milk, Parle-G, Samosa"
                  className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl px-3.5 py-2.5 text-sm text-[#17211C] focus:outline-none focus:border-[#168A55]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17211C] mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#17211C] focus:outline-none focus:border-[#168A55]"
                  >
                    <option value="Food & Retail">Food & Retail</option>
                    <option value="Grocery">Grocery</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Snacks & Bakery">Snacks & Bakery</option>
                    <option value="General Store">General Store</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17211C] mb-1">Unit Selling Price ({currencySymbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    placeholder="e.g. 20"
                    className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#17211C] focus:outline-none focus:border-[#168A55]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17211C] mb-1">Stock Quantity Loaded *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.quantity_in_stock}
                    onChange={(e) => setFormData({ ...formData, quantity_in_stock: e.target.value })}
                    placeholder="50"
                    className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#17211C] focus:outline-none focus:border-[#168A55]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17211C] mb-1">Low Stock Alert Level</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                    placeholder="5"
                    className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl px-3 py-2 text-xs font-mono text-[#17211C] focus:outline-none focus:border-[#168A55]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#17211C] mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#17211C] focus:outline-none focus:border-[#168A55]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17211C] mb-1">Batch / Lot # (Optional)</label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    placeholder="e.g. BATCH-2026-09"
                    className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl px-3 py-2 text-xs text-[#17211C] focus:outline-none focus:border-[#168A55]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8E4]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#17211C] font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#168A55] hover:bg-[#0D5C3A] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Saving Stock...' : editingItem ? 'Update Stock' : 'Save & Load Product Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
