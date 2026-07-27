import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Box, Layers, IndianRupee, Package } from 'lucide-react';
import { useLocalStorage } from '../../utils/useLocalStorage';
import { initialStock } from './mockData';
import { initialCategories, type ItemCategoryRecord } from '../admin/purchase-inventory/ItemCategoryMaster';

export const CategoryLedger = () => {
  const [categories] = useLocalStorage<ItemCategoryRecord[]>('procurement_item_categories', initialCategories);
  const [stockRecords] = useLocalStorage<any[]>('inventory_stock', initialStock);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pastel color palettes for categories
  const colorPalettes = [
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', activeBg: 'bg-blue-100/80', activeBorder: 'border-blue-400', shadow: 'shadow-blue-100', iconBg: 'bg-blue-100', hoverBorder: 'hover:border-blue-300' },
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', activeBg: 'bg-emerald-100/80', activeBorder: 'border-emerald-400', shadow: 'shadow-emerald-100', iconBg: 'bg-emerald-100', hoverBorder: 'hover:border-emerald-300' },
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', activeBg: 'bg-purple-100/80', activeBorder: 'border-purple-400', shadow: 'shadow-purple-100', iconBg: 'bg-purple-100', hoverBorder: 'hover:border-purple-300' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', activeBg: 'bg-amber-100/80', activeBorder: 'border-amber-400', shadow: 'shadow-amber-100', iconBg: 'bg-amber-100', hoverBorder: 'hover:border-amber-300' },
    { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', activeBg: 'bg-rose-100/80', activeBorder: 'border-rose-400', shadow: 'shadow-rose-100', iconBg: 'bg-rose-100', hoverBorder: 'hover:border-rose-300' },
    { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', activeBg: 'bg-cyan-100/80', activeBorder: 'border-cyan-400', shadow: 'shadow-cyan-100', iconBg: 'bg-cyan-100', hoverBorder: 'hover:border-cyan-300' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', activeBg: 'bg-indigo-100/80', activeBorder: 'border-indigo-400', shadow: 'shadow-indigo-100', iconBg: 'bg-indigo-100', hoverBorder: 'hover:border-indigo-300' },
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', activeBg: 'bg-orange-100/80', activeBorder: 'border-orange-400', shadow: 'shadow-orange-100', iconBg: 'bg-orange-100', hoverBorder: 'hover:border-orange-300' },
  ];

  // Calculate category statistics
  const categoryStats = useMemo(() => {
    return categories.map(cat => {
      const itemsInCategory = stockRecords.filter(item => item.category === cat.categoryName);
      const totalItems = itemsInCategory.length;
      const totalQty = itemsInCategory.reduce((sum, item) => sum + (item.availableQty || 0), 0);
      
      // Assume an average unit price of 500 for calculation in mock.
      const totalValue = itemsInCategory.reduce((sum, item) => {
        const unitPrice = item.unitPrice || (item.itemCode ? parseInt(item.itemCode.replace(/\D/g, '')) * 10 : 500);
        return sum + ((item.availableQty || 0) * unitPrice);
      }, 0);

      return {
        ...cat,
        totalItems,
        totalQty,
        totalValue
      };
    }).filter(cat => cat.status === 'Active');
  }, [categories, stockRecords]);

  // Filter items for the selected category
  const activeItems = useMemo(() => {
    if (!activeCategory) return [];
    return stockRecords.filter(item => 
      item.category === activeCategory &&
      (item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [activeCategory, stockRecords, searchTerm]);

  // Set the first category as active by default if none is selected
  useMemo(() => {
    if (!activeCategory && categoryStats.length > 0) {
      setActiveCategory(categoryStats[0].categoryName);
    }
  }, [activeCategory, categoryStats]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Inventory</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Category Ledger</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Category Ledger Dashboard</h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-2 custom-scrollbar">
        {categoryStats.map((stat, index) => {
          const colors = colorPalettes[index % colorPalettes.length];
          const isActive = activeCategory === stat.categoryName;
          
          return (
            <motion.div 
              key={stat.id}
              whileHover={{ y: -4, scale: 1.01 }}
              onClick={() => setActiveCategory(stat.categoryName)}
              className={`p-4 min-w-[240px] rounded-2xl border-2 cursor-pointer transition-all duration-300 shrink-0 
                ${isActive ? `${colors.activeBg} ${colors.activeBorder} shadow-lg ${colors.shadow}` : `${colors.bg} ${colors.border} ${colors.hoverBorder} hover:shadow-md opacity-80 hover:opacity-100`}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl ${colors.iconBg} ${colors.text} ${isActive ? 'shadow-sm' : ''}`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${colors.iconBg} ${colors.text} bg-opacity-50`}>
                  {stat.categoryCode}
                </div>
              </div>
              <h3 className={`font-bold text-lg mb-1 truncate ${isActive ? 'text-slate-900' : 'text-slate-700'}`} title={stat.categoryName}>
                {stat.categoryName}
              </h3>
              
              <div className={`grid grid-cols-2 gap-2 mt-4 pt-3 border-t ${isActive ? 'border-white/40' : 'border-black/5'}`}>
                <div>
                  <div className={`text-[10px] flex items-center gap-1 ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>
                    <Package className="w-3 h-3"/> Total Qty
                  </div>
                  <div className={`font-bold text-sm ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                    {stat.totalQty.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className={`text-[10px] flex items-center gap-1 ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>
                    <IndianRupee className="w-3 h-3"/> Total Value
                  </div>
                  <div className={`font-bold text-sm ${isActive ? colors.text : 'text-slate-700'}`}>
                    ₹{stat.totalValue.toLocaleString()}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detailed List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Box className="w-5 h-5 text-primary" />
              {activeCategory} Items
            </h2>
            <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-medium">{activeItems.length} records</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="Search items..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Item Code</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Item Name</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Brand/Mfr</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Store</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Available Qty</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Unit Price (Est)</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Total Value</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeItems.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-500">No items found in this category.</td></tr>
              ) : activeItems.map((item) => {
                const unitPrice = item.unitPrice || (item.itemCode ? parseInt(item.itemCode.replace(/\D/g, '')) * 10 : 500);
                const totalValue = (item.availableQty || 0) * unitPrice;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-800 font-medium">{item.itemCode}</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{item.itemName}</div>
                      <div className="text-xs text-slate-500">{item.subCategory}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800">{item.brand}</div>
                      <div className="text-xs text-slate-500">{item.manufacturer}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.store}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-medium text-slate-800">{item.availableQty}</span>
                      <span className="text-xs text-slate-500 ml-1">{item.uom}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">₹{unitPrice.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium text-primary">₹{totalValue.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
