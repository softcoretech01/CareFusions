import { useState, useRef, useEffect } from 'react';
import { Search, Plus, X, User, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { DateFilter } from '../../components/ui/DateFilter';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface BillItem {
  id: string;
  description: string;
  price: number;
  qty: number;
  total: number;
}

interface OpdVisit {
  queueToken: string;
  appointmentNumber: string;
  uhid: string;
  patientName: string;
  mobileNumber?: string;
  billingStatus: string;
  department: string;
  doctorName: string;
  labOrders: any[];
  radiologyOrders: any[];
  status?: string;
  isFinalized?: boolean;
  date?: string;
}

interface BillResponse {
  OpBillId: number;
  BillNumber: string;
  Uhid: string;
  PatientName: string;
  MobileNumber: string;
  BillDate: string;
  TotalAmount: number;
  Discount: number;
  Tax: number;
  NetAmount: number;
  PaymentMode: string;
  PaymentStatus: string;
  Items: any[];
}

export const OPBilling = () => {
  const [bills, setBills] = useState<BillResponse[]>([]);
  const [patients, setPatients] = useState<OpdVisit[]>([]);
  const [searchId, setSearchId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [items, setItems] = useState<BillItem[]>([]);

  const [patientName, setPatientName] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedVisitNo, setSelectedVisitNo] = useState('');

  const todayStr = (() => {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  })();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBills();
    fetchVisits();

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchBills = async () => {
    try {
      const response = await axios.get(`${API_BASE}/op-billing/`);
      setBills(response.data);
    } catch (error) {
      console.error("Failed to fetch bills", error);
    }
  };

  const fetchVisits = async () => {
    try {
      const response = await axios.get(`${API_BASE}/opd-visits/schedule`);
      setPatients(response.data);
    } catch (error) {
      console.error("Failed to fetch OPD visits", error);
    }
  };

  const filteredSuggestions = patients.filter(p => {
    const sId = (searchId || '').toLowerCase();
    return (p.queueToken?.toLowerCase() || '').includes(sId) ||
      (p.uhid?.toLowerCase() || '').includes(sId) ||
      (p.patientName?.toLowerCase() || '').includes(sId);
  });

  const pendingBills = patients.filter(p => {
    const isPending = (p.status === 'Completed' || p.isFinalized) &&
      p.billingStatus !== 'Paid' &&
      p.billingStatus !== 'Billed' &&
      p.billingStatus !== 'Completed';

    if (!isPending) return false;
    if (!dateFrom || !dateTo) return true;

    if (p.date) {
      const visitDate = new Date(p.date);
      const localDateStr = visitDate.getFullYear() + '-' + String(visitDate.getMonth() + 1).padStart(2, '0') + '-' + String(visitDate.getDate()).padStart(2, '0');
      return localDateStr >= dateFrom && localDateStr <= dateTo;
    }
    return true;
  });

  const selectPatient = (visit: OpdVisit) => {
    if (visit.billingStatus === 'Paid' || visit.billingStatus === 'Billed' || visit.billingStatus === 'Completed') {
      alert(`This visit (${visit.queueToken}) has already been billed.`);
      return;
    }

    const uhid = visit.uhid;
    const name = visit.patientName;
    const mobile = visit.mobileNumber || '9999999999';

    setSearchId(visit.queueToken || '');
    setPatientName(name || '');
    setSelectedPatientId(uhid || '');
    setSelectedVisitNo(visit.queueToken || '');
    setMobileNumber(mobile);
    setShowSuggestions(false);

    // Auto populate items
    const newItems: BillItem[] = [
      { id: 'ITM-CONSULT', description: `Consultation Fee (${visit.doctorName || 'General'})`, price: 500, qty: 1, total: 500 },
    ];

    if (visit.labOrders && visit.labOrders.length > 0) {
      visit.labOrders.forEach((lab, idx) => {
        newItems.push({
          id: `LAB-${idx}`,
          description: `Lab Test: ${lab.testName || 'General Lab'}`,
          price: 250,
          qty: 1,
          total: 250
        });
      });
    }

    if (visit.radiologyOrders && visit.radiologyOrders.length > 0) {
      visit.radiologyOrders.forEach((rad, idx) => {
        newItems.push({
          id: `RAD-${idx}`,
          description: `Radiology: ${rad.testName || 'Scan'}`,
          price: 1500,
          qty: 1,
          total: 1500
        });
      });
    }

    setItems(newItems);
  };

  const handleSearch = () => {
    const sId = (searchId || '').toLowerCase();
    const found = patients.find(p =>
      (p.queueToken?.toLowerCase() || '') === sId ||
      (p.uhid?.toLowerCase() || '') === sId ||
      (p.patientName?.toLowerCase() || '') === sId
    );
    if (found) selectPatient(found);
    else alert('Pending OPD Visit not found.');
  };

  const handleAddItem = () => {
    setItems([...items, { id: `ITM-${Date.now()}`, description: 'New Item', price: 0, qty: 1, total: 0 }]);
  };

  const handleRemoveItem = (id: string) => setItems(items.filter(item => item.id !== id));

  const handleItemChange = (id: string, field: keyof BillItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'price' || field === 'qty') {
        updated.total = Number(updated.price) * Number(updated.qty);
      }
      return updated;
    }));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const handleGenerateBill = async () => {
    if (!patientName || items.length === 0) {
      alert('Please select a patient and add items first.');
      return;
    }

    // Fallback to valid 10 digit number if the one from DB is missing or invalid
    let validMobile = mobileNumber;
    if (!validMobile || validMobile.length !== 10) {
      validMobile = "9999999999";
    }

    const payload = {
      BillNumber: `BILL-${String(bills.length + 1).padStart(4, '0')}`,
      Uhid: selectedPatientId,
      PatientName: patientName,
      MobileNumber: validMobile,
      TotalAmount: totalAmount,
      Discount: 0,
      Tax: 0,
      NetAmount: totalAmount,
      PaymentMode: 'Cash',
      PaymentStatus: 'Paid',
      Items: items.map(i => ({
        ItemCode: i.id,
        ItemDescription: i.description,
        Quantity: i.qty,
        UnitPrice: i.price,
        Subtotal: i.total,
      }))
    };

    try {
      const response = await axios.post(`${API_BASE}/op-billing/`, payload);
      setSuccessMsg(`Bill ${response.data.BillNumber} generated successfully for ${patientName}!`);

      setPatientName('');
      setSearchId('');
      setSelectedPatientId('');
      setSelectedVisitNo('');
      setMobileNumber('');
      setItems([]);

      fetchBills(); // Refresh bills list
      fetchVisits(); // Refresh visits to reflect updated billing status (if backend updates it)

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error: any) {
      console.error("Error generating bill:", error);
      alert("Failed to generate bill. " + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Generate OP Bill</h2>
        </div>

        <div className="p-8 space-y-6">
          {successMsg && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-5 py-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <span className="text-sm font-semibold">{successMsg}</span>
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-4 items-end justify-between w-full">
            <div className="max-w-xl w-full" ref={wrapperRef}>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search by OP ID / UHID / Name</label>
              <div className="relative flex gap-2">
                <div className="flex-1 flex border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  <span className="bg-primary/10 px-4 py-3 text-primary font-bold text-sm border-r border-slate-200 flex items-center">
                    ID
                  </span>
                  <input
                    type="text"
                    placeholder="Type UHID or patient name..."
                    className="flex-1 px-4 py-3 text-sm focus:outline-none"
                    value={searchId}
                    onChange={e => { setSearchId(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <button onClick={handleSearch} className="bg-primary text-white px-5 py-3 rounded-lg hover:bg-primary/90 transition-colors shrink-0">
                  <Search className="w-5 h-5" />
                </button>
                {showSuggestions && searchId && (
                  <div className="absolute top-full left-0 right-14 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                    {filteredSuggestions.length > 0 ? (
                      <ul className="max-h-60 overflow-y-auto">
                        {filteredSuggestions.map((p, idx) => {
                          const isBilled = p.billingStatus === 'Paid' || p.billingStatus === 'Billed';
                          return (
                            <li key={p.queueToken || idx} onClick={() => selectPatient(p)}
                              className={`px-4 py-3 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors ${isBilled ? 'opacity-50 hover:bg-slate-50' : 'hover:bg-primary/5'}`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isBilled ? 'bg-slate-200 text-slate-500' : 'bg-primary/10 text-primary'}`}>
                                  <User className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{p.patientName}</p>
                                  <p className="text-xs text-slate-500">{p.queueToken} · {p.uhid}</p>
                                </div>
                              </div>
                              {isBilled && (
                                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Billed
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500">No matching patients found.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <DateFilter
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                defaultDateFrom={todayStr}
                defaultDateTo={todayStr}
              />
            </div>
          </div>

          {!patientName ? (
            <div className="space-y-6">
              {pendingBills.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" /> Pending Finalized Visits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingBills.map((visit, idx) => (
                      <div key={idx} onClick={() => selectPatient(visit)} className="border border-slate-200 rounded-xl p-4 bg-white hover:border-primary/30 hover:shadow-md transition-all cursor-pointer flex justify-between items-center group">
                        <div>
                          <p className="font-bold text-slate-800 group-hover:text-primary transition-colors">{visit.patientName}</p>
                          <p className="text-xs text-slate-500 mt-1">{visit.queueToken} • {visit.uhid}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{visit.department} • {visit.doctorName}</p>
                        </div>

                        {/* <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <Plus className="w-5 h-5" />
                        </div> */}

                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingBills.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                  <Search className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Search for an OP ID above to load patient and prescription details.</p>
                  <p className="text-xs mt-2 text-slate-400">Finalized visits will also appear here automatically.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{patientName}</p>
                  <p className="text-xs text-slate-500">{selectedVisitNo} • {selectedPatientId}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-4">Description</th>
                      <th className="px-5 py-4 w-36 text-right">Price (₹)</th>
                      <th className="px-5 py-4 w-24 text-center">Qty</th>
                      <th className="px-5 py-4 w-36 text-right">Total (₹)</th>
                      <th className="px-5 py-4 w-16 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3">
                          <input type="text" className="w-full bg-transparent border-0 p-1 focus:ring-1 focus:ring-primary/30 rounded text-sm" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} />
                        </td>
                        <td className="px-5 py-3">
                          <input type="number" className="w-full text-right bg-transparent border-0 p-1 focus:ring-1 focus:ring-primary/30 rounded text-sm" value={item.price} onChange={e => handleItemChange(item.id, 'price', Number(e.target.value))} />
                        </td>
                        <td className="px-5 py-3">
                          <input type="number" className="w-full text-center bg-transparent border-0 p-1 focus:ring-1 focus:ring-primary/30 rounded text-sm" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', Number(e.target.value))} />
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">₹{item.total.toFixed(2)}</td>
                        <td className="px-5 py-3 text-center">
                          <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-primary/5 border-t-2 border-primary/20 font-bold">
                      <td colSpan={3} className="px-5 py-4 text-right text-slate-700">Total Amount:</td>
                      <td className="px-5 py-4 text-right text-primary text-lg">₹{totalAmount.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button onClick={handleAddItem} className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
                <button onClick={handleGenerateBill} className="bg-primary text-white font-semibold px-8 py-3 rounded-xl hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
                  Generate OP Bill
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Recent OP Bills</h2>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Bill ID</th>
              <th className="px-6 py-4">UHID</th>
              <th className="px-6 py-4">Patient Name</th>
              <th className="px-6 py-4">Mobile</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(() => {
              const filteredBills = bills.filter(b => {
                if (!dateFrom || !dateTo) return true;
                const billDate = new Date(b.BillDate);
                const localDateStr = billDate.getFullYear() + '-' + String(billDate.getMonth() + 1).padStart(2, '0') + '-' + String(billDate.getDate()).padStart(2, '0');
                return localDateStr >= dateFrom && localDateStr <= dateTo;
              });

              if (filteredBills.length === 0) {
                return <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">No recent OP bills found for the selected date range.</td></tr>;
              }

              return filteredBills.map((bill, idx) => (
                <tr key={bill.OpBillId || idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono font-medium text-slate-900">{bill.BillNumber}</td>
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs">{bill.Uhid}</td>
                  <td className="px-6 py-4 text-slate-700">{bill.PatientName}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{bill.MobileNumber}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{new Date(bill.BillDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">₹{bill.NetAmount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${bill.PaymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {bill.PaymentStatus}
                    </span>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};
