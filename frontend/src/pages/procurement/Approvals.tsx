import { useState, useMemo, useEffect } from 'react';
import { INVENTORY_TYPES, typeLabel } from '../../utils/inventoryTypes';
import { Search, CheckCircle, XCircle, Eye, AlertCircle, FileText, ShoppingCart, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface ApprovalRecord {
  id: string; // Composite ID
  originalId: number;
  documentType: 'Purchase Requisition' | 'Purchase Order' | 'Purchase Return';
  refNo: string;
  date: string;
  departmentOrVendor: string;
  amount: number;
  requestedBy: string;
  priority: string;
  /**
   * The inventory type the document covers. null on a legacy document whose
   * lines disagree, which is treated as "mixed" and needs both approvals.
   */
  inventoryType?: string | null;
  status: string;
}

export const Approvals = () => {
  const [pendingRecords, setPendingRecords] = useState<ApprovalRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [filterType, setFilterType] = useState('');
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ApprovalRecord | null>(null);
  const [selectedDocDetails, setSelectedDocDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ record: ApprovalRecord; action: 'Approved' | 'Rejected' } | null>(null);

  const tabs = ['All', 'Purchase Requisition', 'Purchase Order', 'Purchase Return'];

  const fetchApprovals = async () => {
    try {
      const res = await fetch(`${API_BASE}/approvals`);
      if (res.ok) setPendingRecords(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const processedData = useMemo(() => {
    return pendingRecords.filter(record => {
      const matchesSearch = Object.values(record).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesTab = activeTab === 'All' ? true : record.documentType === activeTab;
      const matchesType = filterType ? record.inventoryType === filterType : true;
      return matchesSearch && matchesTab && matchesType;
    });
  }, [pendingRecords, searchTerm, activeTab, filterType]);


  const promptAction = (record: ApprovalRecord, action: 'Approved' | 'Rejected') => {
    setConfirmAction({ record, action });
    setIsConfirmOpen(true);
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    const { record, action } = confirmAction;
    try {
      const res = await fetch(`${API_BASE}/approvals/${encodeURIComponent(record.documentType)}/${record.originalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      });
      if (res.ok) {
        setIsConfirmOpen(false);
        setConfirmAction(null);
        setSuccessMessage(`Document ${record.refNo} has been ${action}!`);
        setIsSuccessOpen(true);
        fetchApprovals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleView = async (record: ApprovalRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
    setIsLoadingDetails(true);
    setSelectedDocDetails(null);
    try {
      let endpoint = '';
      if (record.documentType === 'Purchase Requisition') endpoint = `${API_BASE}/purchase-requisitions/${record.originalId}`;
      else if (record.documentType === 'Purchase Order') endpoint = `${API_BASE}/purchase-orders/${record.originalId}`;
      else if (record.documentType === 'Purchase Return') endpoint = `${API_BASE}/purchase-returns/${record.originalId}`;
      
      const res = await fetch(endpoint);
      if (res.ok) {
        setSelectedDocDetails(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const getDocIcon = (type: string) => {
    switch(type) {
      case 'Purchase Requisition': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'Purchase Order': return <ShoppingCart className="w-5 h-5 text-emerald-500" />;
      case 'Purchase Return': return <RotateCcw className="w-5 h-5 text-orange-500" />;
      default: return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Procurement</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Approvals</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Pending Approvals</h1>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="flex border-b border-slate-100 px-4 pt-4 gap-6 bg-slate-50/50">
          {tabs.map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === tab ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="approvalTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="ml-auto mb-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary bg-white"
          >
            <option value="">All Types</option>
            {INVENTORY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" placeholder="Search Ref No, Dept, Vendor..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <AlertCircle className="w-4 h-4 text-amber-500" /> {processedData.length} documents awaiting your approval
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Type</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Ref No</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Dept / Vendor</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Requested By</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Amount</th>
                <th className="text-center py-3 px-4 font-medium text-slate-500 text-sm">Priority</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <CheckCircle className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                    <p className="text-lg font-medium text-slate-800">All caught up!</p>
                    <p className="text-sm">No pending approvals at the moment.</p>
                  </td>
                </tr>
              ) : processedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getDocIcon(record.documentType)}
                      <div>
                        <span className="font-medium text-slate-700 block">{record.documentType}</span>
                        {record.inventoryType && (
                          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            record.inventoryType === 'MEDICINE' ? 'bg-emerald-50 text-emerald-700'
                              : record.inventoryType === 'MEDICAL_ITEM' ? 'bg-sky-50 text-sky-700'
                              : 'bg-slate-100 text-slate-600'}`}>
                            {typeLabel(record.inventoryType)}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">{record.refNo}</td>
                  <td className="py-3 px-4 text-slate-600">{record.date}</td>
                  <td className="py-3 px-4 text-slate-600">{record.departmentOrVendor}</td>
                  <td className="py-3 px-4 text-slate-600">{record.requestedBy}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-800">{record.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${record.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                      {record.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" icon={Eye} className="!p-2" onClick={() => handleView(record)} />
                      <Button variant="filled" color="primary" size="sm" icon={CheckCircle} onClick={() => promptAction(record, 'Approved')}>Approve</Button>
                      <Button variant="outline" size="sm" icon={XCircle} onClick={() => promptAction(record, 'Rejected')} className="text-red-500 hover:bg-red-50 hover:border-red-200 border-slate-200">Reject</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
      
      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="View Document Details" size="5xl">
        {selectedRecord && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-3 gap-4">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Document Type</label><div className="text-sm font-medium text-slate-800">{selectedRecord.documentType}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Reference No</label><div className="text-sm font-medium text-slate-800">{selectedRecord.refNo}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Date</label><div className="text-sm font-medium text-slate-800">{selectedRecord.date}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Department / Vendor</label><div className="text-sm font-medium text-slate-800">{selectedRecord.departmentOrVendor}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Requested By</label><div className="text-sm font-medium text-slate-800">{selectedRecord.requestedBy}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Priority</label><div className="text-sm font-medium text-slate-800">{selectedRecord.priority}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Amount (₹)</label><div className="text-sm font-bold text-slate-800">{selectedRecord.amount.toLocaleString()}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Status</label><div className="text-sm font-medium text-slate-800">{selectedRecord.status}</div></div>
            </div>

            {/* Item Details */}
            {isLoadingDetails ? (
              <div className="py-8 text-center text-slate-500">Loading details...</div>
            ) : selectedDocDetails && (() => {
              if (selectedRecord.documentType === 'Purchase Requisition') {
                return (
                  <div className="mt-6">
                    <h3 className="font-semibold text-slate-800 mb-3">Requested Items</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left py-2 px-3 font-medium text-slate-600">Item</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600">Qty</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-600">UOM</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600">Est. Price (₹)</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedDocDetails.items?.map((item: any) => (
                            <tr key={item.id || item.itemId} className="bg-white">
                              <td className="py-2 px-3">{item.itemName}</td>
                              <td className="py-2 px-3 text-right">{item.requestedQty}</td>
                              <td className="py-2 px-3">{item.uom || '-'}</td>
                              <td className="py-2 px-3 text-right">{item.estimatedPrice}</td>
                              <td className="py-2 px-3 text-right font-medium">{item.estimatedAmount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }
              if (selectedRecord.documentType === 'Purchase Order') {
                return (
                  <div className="mt-6">
                    <h3 className="font-semibold text-slate-800 mb-3">Ordered Items</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left py-2 px-3 font-medium text-slate-600">Item</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600">Qty</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-600">UOM</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600">Rate (₹)</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedDocDetails.items?.map((item: any) => (
                            <tr key={item.id || item.itemId} className="bg-white">
                              <td className="py-2 px-3">{item.itemName}</td>
                              <td className="py-2 px-3 text-right">{item.orderedQty}</td>
                              <td className="py-2 px-3">{item.uom || '-'}</td>
                              <td className="py-2 px-3 text-right">{item.rate}</td>
                              <td className="py-2 px-3 text-right font-medium">{item.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }
              if (selectedRecord.documentType === 'Purchase Return') {
                return (
                  <div className="mt-6">
                    <h3 className="font-semibold text-slate-800 mb-3">Returned Items</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left py-2 px-3 font-medium text-slate-600">Item</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600">Rcvd Qty</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600">Return Qty</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-600">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedDocDetails.items?.map((item: any) => (
                            <tr key={item.id || item.itemId} className="bg-white">
                              <td className="py-2 px-3">{item.itemName}</td>
                              <td className="py-2 px-3 text-right">{item.receivedQty}</td>
                              <td className="py-2 px-3 text-right font-bold text-red-500">{item.returnQty}</td>
                              <td className="py-2 px-3 text-slate-600">{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
              <Button variant="outline" className="text-red-500 hover:bg-red-50 hover:border-red-200 border-slate-200" onClick={() => {
                promptAction(selectedRecord, 'Rejected');
                setIsViewOpen(false);
              }}>Reject</Button>
              <Button variant="filled" color="primary" onClick={() => {
                promptAction(selectedRecord, 'Approved');
                setIsViewOpen(false);
              }}>Approve</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title=""
        size="sm"
      >
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmAction?.action === 'Approved' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
            {confirmAction?.action === 'Approved' ? <CheckCircle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm {confirmAction?.action === 'Approved' ? 'Approval' : 'Rejection'}</h3>
          <p className="text-slate-500 text-sm mb-6">
            Are you sure you want to {confirmAction?.action === 'Approved' ? 'approve' : 'reject'} <span className="font-semibold text-slate-700">{confirmAction?.record.refNo}</span>?
          </p>
          <div className="flex items-center gap-3 w-full">
            <Button variant="outline" color="secondary" className="flex-1" onClick={() => setIsConfirmOpen(false)}>
              No
            </Button>
            <Button variant="filled" color={confirmAction?.action === 'Approved' ? 'primary' : 'danger'} className="flex-1" onClick={executeAction}>
              Yes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        title=""
        size="sm"
      >
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Success</h3>
          <p className="text-slate-500 text-sm mb-6">{successMessage}</p>
          <Button variant="filled" color="primary" className="w-full" onClick={() => setIsSuccessOpen(false)}>
            OK
          </Button>
        </div>
      </Modal>
    </>
  );
};
