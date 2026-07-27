import { useState, useEffect } from 'react';
import { Search, Plus, FileText, CheckCircle, Clock, Ban, X, Upload, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useInsurance } from '../../contexts/InsuranceContext';
import { useIPD } from '../../contexts/IPDContext';

export const ClaimsManagement = () => {
  const [activeTab] = useState('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const handleClearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
  };
  const [showNewModal, setShowNewModal] = useState(false);
  const [showViewClaim, setShowViewClaim] = useState<any>(null);
  const { claims, addClaim, preAuths, deleteClaim, updateClaim } = useInsurance();
  const { patients } = useIPD();

  const [matchedPatient, setMatchedPatient] = useState<any>(null);
  const [editingClaim, setEditingClaim] = useState<any>(null);
  const [calculatedCosts, setCalculatedCosts] = useState<any>({
    items: [],
    total: 0
  });

  const [newClaim, setNewClaim] = useState({
    patient: '',
    uhid: '',
    insurer: '',
    preAuthorizedAmount: '',
    insuranceAmount: ''
  });

  // Watch UHID to fetch IPD details automatically
  useEffect(() => {
    const activeUhid = editingClaim ? editingClaim.uhid : newClaim.uhid;
    if (activeUhid && activeUhid.length >= 8) {
      const found = patients.find(p => p.uhid.toLowerCase() === activeUhid.toLowerCase() && (p.status === 'Discharged' || p.status === 'Discharge Requested'));
      if (found) {
        if (editingClaim) {
           setEditingClaim((prev: any) => ({ ...prev, patient: found.patientName }));
        } else {
           setNewClaim(prev => ({ ...prev, patient: found.patientName }));
        }
        setMatchedPatient(found);
        
        // Build itemized bill based on stay and medicines
        const stayDays = found.expectedStayDays || 1;
        const items = [
          { name: 'Room Charges', qty: stayDays, price: 1500, total: stayDays * 1500 },
          { name: 'Nursing Charges', qty: stayDays, price: 500, total: stayDays * 500 },
          { name: 'Doctor Visits', qty: stayDays, price: 900, total: stayDays * 900 },
        ];
        
        if (found.dischargeInfo?.medicines) {
          found.dischargeInfo.medicines.forEach(med => {
            items.push({ name: med.medicineName, qty: med.quantity, price: 40, total: med.quantity * 40 });
          });
        }
        
        
        const total = items.reduce((sum, item) => sum + item.total, 0);
        setCalculatedCosts({ items, total });

        // Auto-fetch Pre-Auth Amount & Insurer
        const relatedPreAuth = preAuths.find(p => p.uhid.toLowerCase() === activeUhid.toLowerCase());
        const relatedClaim = claims.find(c => c.uhid.toLowerCase() === activeUhid.toLowerCase());
        
        const fetchedInsurer = relatedPreAuth?.insurer || relatedClaim?.insurer;
        
        if (relatedPreAuth || relatedClaim) {
          const preAuthAmount = relatedPreAuth?.status === 'Approved' ? relatedPreAuth.amount : undefined;
          if (editingClaim) {
             setEditingClaim((prev: any) => ({ 
               ...prev, 
               insurer: fetchedInsurer || prev.insurer,
               preAuth: preAuthAmount !== undefined ? preAuthAmount : prev.preAuth,
               claimedAmount: prev.claimedAmount || preAuthAmount || 0,
             }));
          } else {
             setNewClaim(prev => ({ 
               ...prev, 
               insurer: fetchedInsurer || prev.insurer,
               preAuthorizedAmount: preAuthAmount !== undefined ? preAuthAmount.toString() : prev.preAuthorizedAmount,
               insuranceAmount: prev.insuranceAmount || (preAuthAmount !== undefined ? preAuthAmount.toString() : '')
             }));
          }
        }

      } else {
        setMatchedPatient(null);
        setCalculatedCosts({ items: [], total: 0 });
      }
    } else {
      setMatchedPatient(null);
      setCalculatedCosts({ items: [], total: 0 });
    }
  }, [newClaim.uhid, editingClaim?.uhid, patients, preAuths]);

  const filteredClaims = claims.filter(claim => {
    const matchesTab = activeTab === 'all' || claim.status.toLowerCase() === activeTab.replace('-', ' ');
    const matchesSearch = claim.patient.toLowerCase().includes(search.toLowerCase()) || 
                          claim.id.toLowerCase().includes(search.toLowerCase()) ||
                          claim.uhid.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      id: `CLM-2023-${Math.floor(100 + Math.random() * 900)}`,
      patient: newClaim.patient,
      uhid: newClaim.uhid,
      insurer: newClaim.insurer,
      diagnosis: matchedPatient ? matchedPatient.provisionalDiagnosis : 'General Claim',
      amount: calculatedCosts.total,
      preAuth: Number(newClaim.preAuthorizedAmount) || 0,
      claimedAmount: Number(newClaim.insuranceAmount) || 0,
      balance: Math.max(0, calculatedCosts.total - (Number(newClaim.insuranceAmount) || 0)),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Submitted'
    };
    addClaim(newEntry);
    setShowNewModal(false);
    

    setNewClaim({ patient: '', uhid: '', insurer: '', preAuthorizedAmount: '', insuranceAmount: '' });
    setMatchedPatient(null);
    setCalculatedCosts({ items: [], total: 0 });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClaim) {
      updateClaim(editingClaim);
      setEditingClaim(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> Submitted</span>;
      case 'In Process':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> In Process</span>;
      case 'Settled':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3" /> Settled</span>;
      case 'Denied':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max"><Ban className="w-3 h-3" /> Denied</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {!showNewModal && !editingClaim ? (
        <>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Claims Management</h1>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-600 font-medium"
                    />
                    <span className="text-slate-400 text-sm font-medium">to</span>
                    <input 
                      type="date" 
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-600 font-medium"
                    />
                  </div>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div className="flex items-center gap-2">
                    <button className="px-5 py-1.5 bg-primary text-white rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors">
                      Search
                    </button>
                    <button 
                      onClick={handleClearFilters}
                      className="px-5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setShowNewModal(true)}
                  className="px-5 py-2.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm h-[52px]"
                >
                  <Plus className="w-5 h-5" />
                  New Claim
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <div className="relative w-72 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search claim ID or patient..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1">
            <div className="overflow-x-auto h-full">
              <table className="w-full">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left">Claim ID</th>
                    <th className="px-6 py-4 text-left">Patient Details</th>
                    <th className="px-6 py-4 text-left">Insurer</th>
                    <th className="px-6 py-4 text-left">Total Billed (₹)</th>
                    <th className="px-6 py-4 text-left">Pre-Auth (₹)</th>
                    <th className="px-6 py-4 text-left">Claimed Amt (₹)</th>
                    <th className="px-6 py-4 text-left">Balance (₹)</th>
                    <th className="px-6 py-4 text-left">Date Submitted</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClaims.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-primary">{row.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{row.patient}</div>
                        <div className="text-xs text-slate-500">{row.uhid}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600">{row.insurer}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {row.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500">
                        {row.preAuth ? row.preAuth.toLocaleString() : '0'}
                      </td>
                      <td className="px-6 py-4 font-bold text-primary">
                        {row.claimedAmount ? row.claimedAmount.toLocaleString() : '0'}
                      </td>
                      <td className="px-6 py-4 font-bold text-rose-600">
                        {row.balance.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{row.date}</td>
                      <td className="px-6 py-4">
                        {getStatusBadge(row.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setShowViewClaim(row)}
                            className="text-primary text-sm font-bold hover:underline flex items-center gap-1"
                          >
                            View Claim
                          </button>
                          <div className="flex items-center gap-1 ml-3 border-l border-slate-200 pl-3">
                            <button 
                              onClick={() => setEditingClaim(row)}
                              className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Edit Claim"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this claim?')) {
                                  deleteClaim(row.id);
                                }
                              }}
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors" title="Delete Claim"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredClaims.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-6 py-8 text-center text-slate-500">
                        No claims found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : showNewModal ? (

        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Submit New Claim</h1>
              <p className="text-slate-500 text-sm">Fill in the claim details</p>
            </div>
            <button 
              onClick={() => setShowNewModal(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors font-bold flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-w-5xl mx-auto w-full">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">UHID</label>
                  <input 
                    required
                    type="text" 
                    value={newClaim.uhid}
                    onChange={(e) => setNewClaim({...newClaim, uhid: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base"
                    placeholder="e.g. UHID-2023-0004"
                  />
                  {!matchedPatient && newClaim.uhid.length >= 8 && (
                    <p className="text-sm text-rose-500 mt-2 flex items-center gap-1"><AlertCircle className="w-4 h-4"/> No discharged IP patient found with this UHID.</p>
                  )}
                  {matchedPatient && (
                    <p className="text-sm text-emerald-600 mt-2 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> IP Patient found and discharge records loaded.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Patient Name</label>
                  <input 
                    required
                    readOnly
                    type="text" 
                    value={newClaim.patient}
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none text-slate-500 text-base"
                    placeholder="Auto-populated"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Insurance Provider</label>
                <select 
                  required
                  value={newClaim.insurer}
                  onChange={(e) => setNewClaim({...newClaim, insurer: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base"
                >
                  <option value="">Select Insurer...</option>
                  <option value="Star Health">Star Health</option>
                  <option value="HDFC ERGO">HDFC ERGO</option>
                  <option value="Care Health">Care Health</option>
                  <option value="ICICI Lombard">ICICI Lombard</option>
                </select>
              </div>
              <div>
                {matchedPatient ? (
                  <div className="mt-4 p-6 border border-slate-200 rounded-xl bg-slate-50 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-base font-bold text-slate-700 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Discharge Bill Breakdown</h3>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3">Item Description</th>
                            <th className="px-4 py-3 text-right">Qty/Days</th>
                            <th className="px-4 py-3 text-right">Unit Price</th>
                            <th className="px-4 py-3 text-right">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {calculatedCosts.items.map((item:any, idx:number) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                              <td className="px-4 py-3 text-right text-slate-500">{item.qty}</td>
                              <td className="px-4 py-3 text-right text-slate-500">{item.price}</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-800">{item.total}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-primary/5 border-t-2 border-primary/20">
                          <tr>
                            <td colSpan={3} className="px-4 py-4 text-right font-bold text-slate-700 text-base">Calculated Total Bill</td>
                            <td className="px-4 py-4 text-right font-bold text-primary text-xl">₹{calculatedCosts.total}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                    <FileText className="w-10 h-10 mb-3 opacity-50" />
                    <p className="text-base font-medium">Enter a valid discharged patient UHID to auto-fetch their bill.</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Total Billed (₹)</label>
                  <input 
                    readOnly
                    type="text" 
                    value={calculatedCosts.total}
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-700 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Pre-Auth (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newClaim.preAuthorizedAmount || ''}
                    onChange={(e) => setNewClaim({...newClaim, preAuthorizedAmount: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base"
                    placeholder="Enter pre-auth amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Claimed (₹)</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    value={newClaim.insuranceAmount || ''}
                    onChange={(e) => setNewClaim({...newClaim, insuranceAmount: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base"
                    placeholder="Enter claim amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Balance Amount</label>
                  <input 
                    type="text" 
                    readOnly
                    value={`₹${Math.max(0, calculatedCosts.total - Number(newClaim.insuranceAmount || 0)).toLocaleString()}`}
                    className="w-full px-4 py-3 bg-rose-50 text-rose-700 font-bold border border-rose-200 rounded-xl focus:outline-none text-base"
                  />
                </div>
              </div>
              <div className="pt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Attach Final Bill & Discharge Summary</label>
                <label className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group relative overflow-hidden">
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple />
                  <Upload className="w-10 h-10 mb-3 text-slate-400 group-hover:text-primary transition-colors" />
                  <p className="text-base font-medium group-hover:text-primary transition-colors">Click or drag to upload PDFs</p>
                  <p className="text-sm mt-2">Up to 25MB total</p>
                </label>
              </div>
              
              <div className="pt-8 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-6 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-base"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors text-base"
                >
                  Submit Electronic Claim
                </button>
              </div>
            </form>
          </div>
        </>
      ) : editingClaim ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Edit Claim</h1>
              <p className="text-slate-500 text-sm">Modify the claim details</p>
            </div>
            <button 
              onClick={() => setEditingClaim(null)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors font-bold flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-y-auto">
            <form onSubmit={handleEditSubmit} className="p-8 space-y-6 max-w-4xl mx-auto w-full">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Claim ID</label>
                  <input 
                    readOnly
                    type="text" 
                    value={editingClaim.id}
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none text-slate-500 font-bold text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                  <select 
                    required
                    value={editingClaim.status}
                    onChange={(e) => setEditingClaim({...editingClaim, status: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="In Process">In Process</option>
                    <option value="Settled">Settled</option>
                    <option value="Denied">Denied</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">UHID</label>
                  <input 
                    required
                    type="text" 
                    value={editingClaim.uhid}
                    onChange={(e) => setEditingClaim({...editingClaim, uhid: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Patient Name</label>
                  <input 
                    required
                    type="text" 
                    value={editingClaim.patient}
                    onChange={(e) => setEditingClaim({...editingClaim, patient: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-800 font-medium text-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Insurance Provider</label>
                <select 
                  required
                  value={editingClaim.insurer}
                  onChange={(e) => setEditingClaim({...editingClaim, insurer: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base"
                >
                  <option value="Star Health">Star Health</option>
                  <option value="HDFC ERGO">HDFC ERGO</option>
                  <option value="Care Health">Care Health</option>
                  <option value="ICICI Lombard">ICICI Lombard</option>
                </select>
              </div>
              <div>
                {matchedPatient ? (
                  <div className="mt-4 p-6 border border-slate-200 rounded-xl bg-slate-50 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-base font-bold text-slate-700 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Discharge Bill Breakdown</h3>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3">Item Description</th>
                            <th className="px-4 py-3 text-right">Qty/Days</th>
                            <th className="px-4 py-3 text-right">Unit Price</th>
                            <th className="px-4 py-3 text-right">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {calculatedCosts.items.map((item:any, idx:number) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                              <td className="px-4 py-3 text-right text-slate-500">{item.qty}</td>
                              <td className="px-4 py-3 text-right text-slate-500">{item.price}</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-800">{item.total}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-primary/5 border-t-2 border-primary/20">
                          <tr>
                            <td colSpan={3} className="px-4 py-4 text-right font-bold text-slate-700 text-base">Calculated Total Bill</td>
                            <td className="px-4 py-4 text-right font-bold text-primary text-xl">₹{calculatedCosts.total}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                    <FileText className="w-10 h-10 mb-3 opacity-50" />
                    <p className="text-base font-medium">Enter a valid discharged patient UHID to auto-fetch their bill.</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Billed Amount (₹)</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    value={editingClaim.amount || ''}
                    onChange={(e) => {
                      const amount = Number(e.target.value);
                      const claimedAmount = Number(editingClaim.claimedAmount || 0);
                      setEditingClaim({...editingClaim, amount, balance: Math.max(0, amount - claimedAmount)});
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base"
                    placeholder="Enter billed amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Pre-Auth (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={editingClaim.preAuth || ''}
                    onChange={(e) => setEditingClaim({...editingClaim, preAuth: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base"
                    placeholder="Enter pre-auth amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Claimed Amount (₹)</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    value={editingClaim.claimedAmount === 0 ? '' : (editingClaim.claimedAmount || '')}
                    onChange={(e) => {
                      const claimedAmount = Number(e.target.value);
                      const amount = Number(editingClaim.amount);
                      setEditingClaim({...editingClaim, claimedAmount, balance: Math.max(0, amount - claimedAmount)});
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base"
                    placeholder="Enter claim amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Balance Amount</label>
                  <input 
                    type="text" 
                    readOnly
                    value={`₹${Math.max(0, Number(editingClaim.amount || 0) - Number(editingClaim.claimedAmount || 0)).toLocaleString()}`}
                    className="w-full px-4 py-3 bg-rose-50 text-rose-700 font-bold border border-rose-200 rounded-xl focus:outline-none text-base"
                  />
                </div>
              </div>
              
              <div className="pt-8 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setEditingClaim(null)}
                  className="flex-1 px-6 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-base"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-base"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </>
      ) : null}

      {/* View Claim Modal */}
      {showViewClaim && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Claim Details</h2>
              <button 
                onClick={() => setShowViewClaim(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Claim ID</p>
                <p className="font-bold text-slate-800 text-lg">{showViewClaim.id}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Patient</p>
                  <p className="font-bold text-slate-800">{showViewClaim.patient}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">UHID</p>
                  <p className="font-bold text-slate-800">{showViewClaim.uhid}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Insurer</p>
                  <p className="font-bold text-slate-800">{showViewClaim.insurer}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Diagnosis</p>
                  <p className="font-bold text-slate-800">{showViewClaim.diagnosis}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Billed Amount</p>
                  <p className="font-bold text-slate-800">₹{showViewClaim.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Balance Amount</p>
                  <p className="font-bold text-rose-600">₹{showViewClaim.balance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Date</p>
                  <p className="font-bold text-slate-800">{showViewClaim.date}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <p className="font-bold text-slate-800">{getStatusBadge(showViewClaim.status)}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowViewClaim(null)}
                className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
