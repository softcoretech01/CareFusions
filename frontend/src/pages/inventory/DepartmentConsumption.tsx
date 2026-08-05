import { useState, useMemo } from 'react';
import { Search, Building2 } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const DepartmentConsumption = () => {
  const { documents, ledger, loading } = useInventory();
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Real consumption is what was actually issued to departments. The prototype
  // read a separate localStorage key that nothing ever wrote, so this screen
  // was disconnected from Stock Issue entirely.
  const issues = useMemo(() => documents.filter(d => {
    if (d.docType !== 'ISSUE' || !d.departmentName) return false;
    if (d.docDate) {
      const day = localDay(new Date(d.docDate));
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
    }
    return true;
  }), [documents, fromDate, toDate]);

  // Value each issued line at the rate the ledger actually posted it at.
  const rateFor = (docNumber: string, itemId: number) =>
    ledger.find(l => l.docNumber === docNumber && l.itemId === itemId)?.rate ?? 0;

  const summary = useMemo(() => {
    const acc: Record<string, { department: string; docs: number; items: number; qty: number; value: number }> = {};
    issues.forEach(d => {
      const k = d.departmentName;
      acc[k] = acc[k] || { department: k, docs: 0, items: 0, qty: 0, value: 0 };
      acc[k].docs += 1;
      acc[k].items += d.items.length;
      d.items.forEach(it => {
        acc[k].qty += Math.abs(it.quantity);
        acc[k].value += Math.abs(it.quantity) * rateFor(d.docNumber, it.itemId);
      });
    });
    const s = search.trim().toLowerCase();
    return Object.values(acc).filter(r => !s || r.department.toLowerCase().includes(s));
  }, [issues, ledger, search]);

  const totalValue = summary.reduce((s, r) => s + r.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Department Consumption</h1>
          <p className="text-xs text-slate-500">What each department actually consumed, from posted issues</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-2 shadow-sm">
          <span className="text-xs text-slate-500">Total Consumption </span>
          <span className="font-bold text-slate-800">{inr(totalValue)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search department..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary" />
        </div>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600" />
        <span className="text-slate-400 text-sm">to</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600" />
        <button onClick={() => { setSearch(''); setFromDate(''); setToDate(''); }}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200">Clear</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-right">Issues</th>
                <th className="px-4 py-3 text-right">Line Items</th>
                <th className="px-4 py-3 text-right">Total Qty</th>
                <th className="px-4 py-3 text-right">Consumption Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.map(r => (
                <tr key={r.department} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-bold text-slate-800">{r.department}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.docs}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.items}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{r.qty}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{inr(r.value)}</td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                  <Building2 className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                  {loading ? 'Loading…' : 'No stock has been issued to departments yet.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
