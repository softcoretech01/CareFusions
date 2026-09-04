import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useMemo, useEffect } from 'react';
import { INVENTORY_TYPES } from '../../utils/inventoryTypes';
import { 
  Search, Filter, BookOpen, Star, Package, Clock, TrendingUp, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = API_BASE_URL;

export const VendorsCatalog = () => {
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  // Categories now carry an inventory type, so the buyer can narrow the
  // catalog to medicines, medical items or non-medical items.
  const [filterType, setFilterType] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catRes, ctgRes] = await Promise.all([
        fetch(`${API_BASE}/vendor-catalogs`),
        fetch(`${API_BASE}/categories`)
      ]);
      
      if (catRes.ok) setCatalogs(await catRes.json());
      if (ctgRes.ok) setCategories(await ctgRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);

  const processedData = useMemo(() => {
    let result = catalogs.filter(vendor => {
      const matchesSearch = vendor.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            vendor.vendorCode?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const hasCategoryItems = filterCategory 
        ? vendor.items.some((item: any) => item.category === filterCategory)
        : true;

      return matchesSearch && hasCategoryItems;
    });
    return result;
  }, [catalogs, searchTerm, filterCategory]);

  const filteredVendorItems = useMemo(() => {
    if (!selectedVendor || !selectedVendor.items) return [];
    if (!itemSearchTerm) return selectedVendor.items;
    return selectedVendor.items.filter((item: any) =>
      item.itemName?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
      item.itemCode?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(itemSearchTerm.toLowerCase())
    );
  }, [selectedVendor, itemSearchTerm]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Procurement</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Vendors Catalog</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Vendors Catalog</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors" title="Refresh">
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left sidebar: Vendors List */}
        <div className="w-1/3 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="Search Vendor..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`ml-2 p-2 border rounded-lg transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <Filter className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-slate-100 bg-slate-50 overflow-hidden">
                <div className="p-3 flex gap-3">
                  <select value={filterType}
                          onChange={(e) => { setFilterType(e.target.value); setFilterCategory(''); }}
                          className="w-1/3 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                    <option value="">All Types</option>
                    {INVENTORY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                    <option value="">Filter by Category</option>
                    {categories
                      .filter(c => !filterType || c.inventoryType === filterType)
                      .map(c => <option key={c.id} value={c.categoryName}>{c.categoryName}</option>)}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {processedData.map((vendor) => (
              <div 
                key={vendor.id} 
                onClick={() => setSelectedVendor(vendor)}
                className={`p-4 rounded-2xl cursor-pointer border transition-all ${selectedVendor?.id === vendor.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-800">{vendor.vendorName}</h3>
                  <div className="flex items-center gap-1 text-sm font-medium text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500" /> {vendor.rating}
                  </div>
                </div>
                <div className="text-sm text-slate-500 mb-3">{vendor.city}</div>
                <div className="flex gap-4 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-primary" /> {vendor.items?.length || 0} Items</div>
                  <div className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-blue-500" /> {vendor.activeContracts} Contracts</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side: Catalog Details */}
        <div className="w-2/3 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          {selectedVendor ? (
            <>
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedVendor.vendorName}</h2>
                    <div className="text-slate-500 mt-1 flex gap-4">
                      <span>Code: {selectedVendor.vendorCode}</span>
                      <span>GST: {selectedVendor.gstNumber}</span>
                      <span>Contact: {selectedVendor.contactPerson}</span>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-xl font-bold text-lg text-center">
                    {selectedVendor.rating} <span className="text-xs font-medium block">Rating</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-b border-slate-100 flex gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search items in catalog..."
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Item Code</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Item Name</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Valid Until</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Catalog Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVendorItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                          No items supplied or quoted for this vendor.
                        </td>
                      </tr>
                    ) : (
                      filteredVendorItems.map((item: any) => (
                        <tr key={item.itemId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 text-slate-800 font-medium">{item.itemCode}</td>
                          <td className="py-3 px-4 text-slate-800">{item.itemName}</td>
                          <td className="py-3 px-4 text-slate-600 text-sm">{item.category}</td>
                          <td className="py-3 px-4 text-slate-600 text-sm flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500"/> {item.contractValidUntil || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-bold text-emerald-600">₹{item.catalogPrice}</div>
                            <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5"><TrendingUp className="w-3 h-3"/> Last up: {item.lastUpdate || '-'}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <BookOpen className="w-16 h-16 mb-4 text-slate-200" />
              <h3 className="text-xl font-bold text-slate-600 mb-2">Select a Vendor</h3>
              <p>Choose a vendor from the list to view their catalog, prices, and items supplied.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
