import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, X, Bed, CheckCircle, Printer, FileText } from 'lucide-react';
import { DateFilter } from '../../components/ui/DateFilter';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface BillItem {
  id: string;
  description: string;
  price: number;
  qty: number;
  total: number;
}

interface BillResponse {
  IpBillId: number;
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
  InsuranceClaimedAmount: number;
  PatientBalance: number;
  IsInsurancePaid: boolean;
  Items: any[];
}

export const IPBilling = () => {
  const { state } = useLocation();
  const [bills, setBills] = useState<BillResponse[]>([]);

  // From IPD
  const [admissions, setAdmissions] = useState<any[]>([]);

  const [searchId, setSearchId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [items, setItems] = useState<BillItem[]>([]);

  const [patientName, setPatientName] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const todayStr = (() => {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  })();

  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);

  const [successMsg, setSuccessMsg] = useState('');

  const [isInsurancePaid, setIsInsurancePaid] = useState(false);
  const [insuranceDetails, setInsuranceDetails] = useState<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBills();
    fetchAdmissions();

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Check for passed claim data (e.g., from Insurance screen)
    if (state?.claimData && state?.dischargeCosts && !patientName) {
      const { claimData, dischargeCosts } = state;
      setPatientName(claimData.patient || claimData.patientName);
      setSelectedPatientId(claimData.uhid);
      setSearchId(claimData.uhid);

      // Attempt to get mobile number from patient API just in case it wasn't passed
      fetchPatientMobile(claimData.uhid);

      const newItems = [];
      let idCounter = 1;

      if (Number(dischargeCosts.operation) > 0) newItems.push({ id: `ITM-${idCounter++}`, description: 'Operation Cost', price: Number(dischargeCosts.operation), qty: 1, total: Number(dischargeCosts.operation) });
      if (Number(dischargeCosts.medication) > 0) newItems.push({ id: `ITM-${idCounter++}`, description: 'Medication Cost', price: Number(dischargeCosts.medication), qty: 1, total: Number(dischargeCosts.medication) });
      if (Number(dischargeCosts.dischargeMedication) > 0) newItems.push({ id: `ITM-${idCounter++}`, description: 'Discharge Medication', price: Number(dischargeCosts.dischargeMedication), qty: 1, total: Number(dischargeCosts.dischargeMedication) });
      if (Number(dischargeCosts.ward) > 0) newItems.push({ id: `ITM-${idCounter++}`, description: 'Ward Cost', price: Number(dischargeCosts.ward), qty: 1, total: Number(dischargeCosts.ward) });
      if (Number(dischargeCosts.other) > 0) newItems.push({ id: `ITM-${idCounter++}`, description: 'Other Costs', price: Number(dischargeCosts.other), qty: 1, total: Number(dischargeCosts.other) });

      setItems(newItems);

      if (claimData.balance <= 0) {
        setIsInsurancePaid(true);
      }
      setInsuranceDetails({
        total: claimData.amount,
        claimed: claimData.amount - claimData.balance,
        balance: claimData.balance
      });
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [state, patientName]);

  const fetchBills = async () => {
    try {
      const response = await axios.get(`${API_BASE}/ip-billing/`);
      setBills(response.data);
    } catch (error) {
      console.error("Failed to fetch bills", error);
    }
  };

  const fetchAdmissions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/ipd/admissions`);
      setAdmissions(response.data);
    } catch (error) {
      console.error("Failed to fetch admissions", error);
    }
  };

  const fetchPatientMobile = async (uhid: string) => {
    try {
      // Find patient from registration
      const response = await axios.get(`${API_BASE}/patients/`);
      const patient = response.data.find((p: any) => p.uhid === uhid || p.Uhid === uhid);
      if (patient) {
        const mobile = patient.mobileNumber || patient.MobileNumber;
        if (mobile) setMobileNumber(mobile);
      }
    } catch (e) {
      console.error("Failed to get mobile number", e);
    }
  };

  const filteredSuggestions = admissions.filter(p => {
    const sId = (searchId || '').toLowerCase();
    return (p.uhid?.toLowerCase() || '').includes(sId) ||
      (p.patientName?.toLowerCase() || '').includes(sId) ||
      (p.admissionNumber?.toLowerCase() || '').includes(sId);
  });

  const pendingDischarges = admissions.filter(p => {
    if (p.status !== 'Discharged' && p.status !== 'Discharge Requested') return false;

    // Assume billed if there's any bill for this UHID with a BillDate >= admissionDate
    const hasBill = bills.some(b =>
      b.Uhid === p.uhid &&
      new Date(b.BillDate) >= new Date(p.admissionDate) &&
      (b.PaymentStatus === 'Paid' || b.PaymentStatus === 'Pending') // IP Bills usually just mean it's billed
    );

    if (hasBill) return false;
    if (!dateFrom || !dateTo) return true;

    // Use dischargeDate if available, else admissionDate
    const dateToCheck = p.dischargeInfo?.dischargeDate || p.admissionDate;
    if (dateToCheck) {
      const visitDate = new Date(dateToCheck);
      const localDateStr = visitDate.getFullYear() + '-' + String(visitDate.getMonth() + 1).padStart(2, '0') + '-' + String(visitDate.getDate()).padStart(2, '0');
      return localDateStr >= dateFrom && localDateStr <= dateTo;
    }
    return true;
  });

  const filteredBills = bills.filter(bill => {
    if (!dateFrom || !dateTo) return true;
    const billDate = new Date(bill.BillDate);
    const localDateStr = billDate.getFullYear() + '-' + String(billDate.getMonth() + 1).padStart(2, '0') + '-' + String(billDate.getDate()).padStart(2, '0');
    return localDateStr >= dateFrom && localDateStr <= dateTo;
  });

  const selectPatient = (patient: any) => {
    setSearchId(patient.uhid || '');
    handleSearch(patient.uhid);
    setShowSuggestions(false);
  };

  const handleSearch = (idToSearch?: any) => {
    const query = (typeof idToSearch === 'string' ? idToSearch : searchId || '').toLowerCase();
    const foundIPD = admissions.find(p =>
      (p.uhid?.toLowerCase() || '') === query ||
      (p.patientName?.toLowerCase() || '') === query ||
      (p.admissionNumber?.toLowerCase() || '') === query
    );
    if (foundIPD) {
      setSearchId(foundIPD.uhid || '');
      setPatientName(foundIPD.patientName);
      setSelectedPatientId(foundIPD.uhid);

      fetchPatientMobile(foundIPD.uhid);

      const stayDays = foundIPD.expectedStayDays || 1;
      const newItems = [
        { id: 'ITM-001', description: `Room Charges (${stayDays} Days)`, price: 1500, qty: stayDays, total: 1500 * stayDays },
        { id: 'ITM-002', description: 'Nursing Charges (Per Day)', price: 500, qty: stayDays, total: 500 * stayDays },
        { id: 'ITM-003', description: 'Doctor Visit Fees', price: 900, qty: stayDays, total: 900 * stayDays },
      ];
      setItems(newItems);

      setIsInsurancePaid(false);
      setInsuranceDetails(null);
      return;
    }

    alert('Patient not found in active admissions.');
  };

  const handleAddItem = () => {
    setItems([...items, { id: `ITM-${Date.now()}`, description: 'New Item', price: 0, qty: 1, total: 0 }]);
  };

  const handleRemoveItem = (id: string) => setItems(items.filter(item => item.id !== id));

  const handleItemChange = (id: string, field: keyof BillItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'price' || field === 'qty') updated.total = Number(updated.price) * Number(updated.qty);
      return updated;
    }));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const handleGenerateBill = async () => {
    if (!patientName || items.length === 0) {
      alert('Please select a patient and add items first.');
      return;
    }

    let validMobile = mobileNumber;
    if (!validMobile || validMobile.length !== 10) {
      validMobile = "9999999999";
    }

    const payload = {
      BillNumber: `IPB-${String(bills.length + 1).padStart(4, '0')}`,
      Uhid: selectedPatientId,
      PatientName: patientName,
      MobileNumber: validMobile,
      TotalAmount: totalAmount,
      Discount: 0,
      Tax: 0,
      NetAmount: totalAmount,
      PaymentMode: isInsurancePaid ? 'Insurance' : 'Cash',
      PaymentStatus: isInsurancePaid ? 'Paid' : 'Pending',
      InsuranceClaimedAmount: insuranceDetails?.claimed || 0,
      PatientBalance: insuranceDetails?.balance || totalAmount,
      IsInsurancePaid: isInsurancePaid,
      Items: items.map(i => ({
        ItemCode: i.id,
        ItemDescription: i.description,
        Quantity: i.qty,
        UnitPrice: i.price,
        Subtotal: i.total,
      }))
    };

    try {
      const response = await axios.post(`${API_BASE}/ip-billing/`, payload);
      setSuccessMsg(`Bill ${response.data.BillNumber} generated successfully for ${patientName}!`);

      setPatientName('');
      setSearchId('');
      setSelectedPatientId('');
      setMobileNumber('');
      setItems([]);
      setIsInsurancePaid(false);
      setInsuranceDetails(null);

      fetchBills();

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error: any) {
      console.error("Error generating IP bill:", error);
      alert("Failed to generate IP bill. " + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Generate IP Bill (Discharge)</h2>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Search by IP ID / UHID / Name</label>
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
                        {filteredSuggestions.map(p => (
                          <li key={p.uhid} onClick={() => selectPatient(p)}
                            className="px-4 py-3 hover:bg-primary/5 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-0 transition-colors">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <Bed className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{p.patientName}</p>
                              <p className="text-xs text-slate-500">{p.uhid} · Ward {p.currentWardId} · {p.expectedStayDays || 1} days</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500">No matching patients found.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <label className="block text-sm font-medium text-slate-700 mb-2">Filter Recent Bills</label>
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
            pendingDischarges.length > 0 ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Pending Discharges
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingDischarges.map((adm, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectPatient(adm)}
                      className="bg-white border border-slate-200 p-5 rounded-xl hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{adm.patientName}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {adm.admissionNumber} • {adm.uhid}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 text-ellipsis overflow-hidden whitespace-nowrap max-w-[250px]">
                            {adm.specialty} • {adm.admittingDoctor}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                <Bed className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">Search for an IP ID above to load patient admission and charge details.</p>
              </div>
            )
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{patientName}</p>
                  <p className="text-xs text-slate-500">{selectedPatientId} • {mobileNumber}</p>
                </div>
              </div>

              {/* Insurance Claim Info Display */}
              {insuranceDetails && (
                <div className={`p-5 rounded-xl border ${isInsurancePaid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  {isInsurancePaid ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-emerald-700">
                        <CheckCircle className="w-8 h-8" />
                        <div>
                          <p className="font-bold text-lg">Bill Paid by Insurance</p>
                          <p className="text-sm">The total bill amount (₹{insuranceDetails.total.toLocaleString()}) has been fully covered.</p>
                        </div>
                      </div>
                      <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-sm flex items-center gap-2 hover:bg-emerald-700 transition-colors">
                        <Printer className="w-4 h-4" /> Print Bill
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 text-rose-700 font-bold mb-3">
                        <FileText className="w-5 h-5" /> Insurance Claim Processed - Patient Balance Due
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg border border-rose-100 shadow-sm">
                          <p className="text-slate-500 font-semibold text-xs mb-1">Total Bill</p>
                          <p className="font-bold text-slate-800 text-base">₹{insuranceDetails.total.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-rose-100 shadow-sm">
                          <p className="text-slate-500 font-semibold text-xs mb-1">Insurance Claimed</p>
                          <p className="font-bold text-slate-800 text-base">₹{insuranceDetails.claimed.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-rose-500 shadow-sm">
                          <p className="text-rose-600 font-bold text-xs mb-1">Patient Balance</p>
                          <p className="font-bold text-rose-700 text-lg">₹{insuranceDetails.balance.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                        <td className="px-5 py-3 max-w-xs">
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 p-1 focus:ring-1 focus:ring-primary/30 rounded text-sm truncate"
                            value={item.description}
                            title={item.description}
                            onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                          />
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
                  Generate IP Bill
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Recent IP Bills</h2>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Bill ID</th>
              <th className="px-6 py-4">UHID</th>
              <th className="px-6 py-4">Patient Name</th>
              <th className="px-6 py-4">Mobile</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Items</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBills.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-400">No recent IP bills found for the selected dates.</td></tr>
            ) : filteredBills.map((bill, idx) => (
              <tr key={bill.IpBillId || idx} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono font-medium text-slate-900">{bill.BillNumber}</td>
                <td className="px-6 py-4 font-mono text-slate-500 text-xs">{bill.Uhid}</td>
                <td className="px-6 py-4 text-slate-700">{bill.PatientName}</td>
                <td className="px-6 py-4 text-slate-500 text-xs">{bill.MobileNumber}</td>
                <td className="px-6 py-4 text-slate-500 text-xs">{new Date(bill.BillDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-slate-600 text-xs">{(bill.Items || []).length} items</td>
                <td className="px-6 py-4 font-bold text-slate-800">₹{bill.NetAmount.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-md ${bill.PaymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {bill.PaymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
