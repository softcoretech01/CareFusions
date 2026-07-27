import { useState } from 'react';
import { Plus, Search, FileText, CheckCircle, Clock, Ban, X, Upload, Edit, Trash2 } from 'lucide-react';
import { usePatients } from '../../contexts/PatientContext';
import { useInsurance } from '../../contexts/InsuranceContext';

export const PreAuthManagement = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showViewRequest, setShowViewRequest] = useState<any>(null);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const { patients } = usePatients();
  
  const handleClearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
  };
  
  const { preAuths: requests, addPreAuth, updatePreAuthStatus: handleAction, deletePreAuth, updatePreAuth } = useInsurance();

  const [newRequest, setNewRequest] = useState({
    patient: '',
    uhid: '',
    insurer: '',
    diagnosis: '',
    amount: ''
  });

  const filteredRequests = requests.filter(req => {
    const matchesTab = activeTab === 'all' || req.status.toLowerCase() === activeTab;
    const matchesSearch = req.patient.toLowerCase().includes(search.toLowerCase()) || 
                          req.id.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      id: `AUTH-${Math.floor(1000 + Math.random() * 9000)}`,
      patient: newRequest.patient,
      uhid: newRequest.uhid,
      insurer: newRequest.insurer,
      diagnosis: 'N/A', // Removed from form
      amount: Number(newRequest.amount),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Pending'
    };
    addPreAuth(newEntry);
    setShowNewModal(false);
    setNewRequest({ patient: '', uhid: '', insurer: '', diagnosis: '', amount: '' });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRequest) {
      updatePreAuth(editingRequest);
      setEditingRequest(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pre-Authorizations</h1>
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
              New Request
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search request..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          {['all', 'pending', 'approved', 'rejected'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Req ID</th>
                <th className="px-6 py-4 text-left">Patient Details</th>
                <th className="px-6 py-4 text-left">Insurer</th>
                <th className="px-6 py-4 text-left">Amount (₹)</th>
                <th className="px-6 py-4 text-left">Date Submitted</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-primary">{row.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{row.patient}</div>
                    <div className="text-xs text-slate-500">{row.uhid}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600">{row.insurer}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{row.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{row.date}</td>
                  <td className="px-6 py-4">
                    {row.status === 'Pending' && <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> Under Review</span>}
                    {row.status === 'Approved' && <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3" /> Approved</span>}
                    {row.status === 'Rejected' && <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max"><Ban className="w-3 h-3" /> Rejected</span>}
                  </td>
                  <td className="px-6 py-4">
                    {row.status === 'Pending' ? (
                      <div className="flex gap-2 items-center">
                        <button 
                          onClick={() => handleAction(row.id, 'Approved')}
                          className="px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleAction(row.id, 'Rejected')}
                          className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors"
                        >
                          Reject
                        </button>
                        <div className="flex items-center gap-1 ml-1 border-l border-slate-200 pl-2">
                          <button 
                            onClick={() => setEditingRequest(row)}
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Edit Request"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this request?')) {
                                deletePreAuth(row.id);
                              }
                            }}
                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors" title="Delete Request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowViewRequest(row)}
                          className="text-primary text-sm font-bold hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          View Details
                        </button>
                        <div className="flex items-center gap-1 ml-1 border-l border-slate-200 pl-2">
                          <button 
                            onClick={() => setEditingRequest(row)}
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Edit Request"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this request?')) {
                                deletePreAuth(row.id);
                              }
                            }}
                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors" title="Delete Request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No pre-authorization requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">New Pre-Auth Request</h2>
              <button 
                onClick={() => setShowNewModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">UHID</label>
                  <input 
                    required
                    type="text" 
                    value={newRequest.uhid}
                    onChange={(e) => {
                      const uhid = e.target.value;
                      setNewRequest(prev => {
                        const updated = { ...prev, uhid };
                        const found = patients.find(p => p.uhid.toLowerCase() === uhid.toLowerCase());
                        if (found) {
                          updated.patient = found.patientName || '';
                          if (found.insurer) {
                            updated.insurer = found.insurer;
                          }
                        } else if (uhid.trim() === '') {
                          updated.patient = '';
                          updated.insurer = '';
                        }
                        return updated;
                      });
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. UHID-2023-..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Patient Name</label>
                  <input 
                    required
                    type="text" 
                    value={newRequest.patient}
                    onChange={(e) => setNewRequest({...newRequest, patient: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-800 font-medium"
                    placeholder="Enter or auto-fetch name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Insurance Provider</label>
                <select 
                  required
                  value={newRequest.insurer}
                  onChange={(e) => setNewRequest({...newRequest, insurer: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Insurer...</option>
                  <option value="Star Health">Star Health</option>
                  <option value="HDFC ERGO">HDFC ERGO</option>
                  <option value="Care Health">Care Health</option>
                  <option value="ICICI Lombard">ICICI Lombard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Estimated Cost (₹)</label>
                <input 
                  required
                  type="number" 
                  min="0"
                  value={newRequest.amount || ''}
                  onChange={(e) => setNewRequest({...newRequest, amount: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Enter amount"
                />
              </div>
              <div className="pt-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Supporting Documents</label>
                <label className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group relative overflow-hidden">
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple />
                  <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-primary transition-colors" />
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">Click or drag to upload Clinical Notes & Estimates</p>
                  <p className="text-xs mt-1">PDF, JPG up to 10MB</p>
                </label>
              </div>
              
              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Request Modal */}
      {showViewRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Pre-Auth Details</h2>
              <button 
                onClick={() => setShowViewRequest(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Request ID</p>
                <p className="font-bold text-slate-800 text-lg">{showViewRequest.id}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Patient</p>
                  <p className="font-bold text-slate-800">{showViewRequest.patient}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">UHID</p>
                  <p className="font-bold text-slate-800">{showViewRequest.uhid}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Insurer</p>
                  <p className="font-bold text-slate-800">{showViewRequest.insurer}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Amount</p>
                  <p className="font-bold text-slate-800">₹{showViewRequest.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Date</p>
                  <p className="font-bold text-slate-800">{showViewRequest.date}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <p className="font-bold text-slate-800">{showViewRequest.status}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowViewRequest(null)}
                className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {editingRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Edit Pre-Auth Request</h2>
              <button 
                onClick={() => setEditingRequest(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">UHID</label>
                  <input 
                    required
                    type="text" 
                    value={editingRequest.uhid}
                    onChange={(e) => setEditingRequest({...editingRequest, uhid: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Patient Name</label>
                  <input 
                    required
                    type="text" 
                    value={editingRequest.patient}
                    onChange={(e) => setEditingRequest({...editingRequest, patient: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-800 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Insurance Provider</label>
                <select 
                  required
                  value={editingRequest.insurer}
                  onChange={(e) => setEditingRequest({...editingRequest, insurer: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="Star Health">Star Health</option>
                  <option value="HDFC ERGO">HDFC ERGO</option>
                  <option value="Care Health">Care Health</option>
                  <option value="ICICI Lombard">ICICI Lombard</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Estimated Cost (₹)</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    value={editingRequest.amount || ''}
                    onChange={(e) => setEditingRequest({...editingRequest, amount: Number(e.target.value)})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select 
                    required
                    value={editingRequest.status}
                    onChange={(e) => setEditingRequest({...editingRequest, status: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
