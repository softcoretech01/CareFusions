import { useState, useMemo } from 'react';
import { Search, CheckCircle, XCircle, Eye, AlertCircle, FileText, ShoppingCart, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

// Hooks
import { useLocalStorage } from '../../utils/useLocalStorage';
import type { PRRecord } from './PurchaseRequisitions';
import type { PORecord } from './PurchaseOrders';
import type { ReturnRecord } from './PurchaseReturn';

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
  status: string;
}

export const Approvals = () => {
  const [prs, setPrs] = useLocalStorage<PRRecord[]>('procurement_prs_v2', []);
  const [pos, setPos] = useLocalStorage<PORecord[]>('procurement_pos_v2', []);
  const [returns, setReturns] = useLocalStorage<ReturnRecord[]>('procurement_returns_v2', []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ApprovalRecord | null>(null);

  const tabs = ['All', 'Purchase Requisition', 'Purchase Order', 'Purchase Return'];

  // Aggregate pending records
  const pendingRecords = useMemo<ApprovalRecord[]>(() => {
    const list: ApprovalRecord[] = [];
    
    // Add pending PRs
    prs.forEach(pr => {
      if (pr.approvalStatus === 'Submitted' || pr.approvalStatus === 'Pending Department Approval') {
        list.push({
          id: `PR-${pr.id}`,
          originalId: pr.id,
          documentType: 'Purchase Requisition',
          refNo: pr.prNo,
          date: pr.requisitionDate,
          departmentOrVendor: pr.department,
          amount: pr.items.reduce((sum, item) => sum + (item.requestedQty * item.estimatedPrice), 0),
          requestedBy: pr.createdBy || 'Unknown',
          priority: pr.priority,
          status: pr.approvalStatus
        });
      }
    });

    // Add pending POs
    pos.forEach(po => {
      if (po.status === 'Submitted' || po.status === 'Pending Approval') {
        list.push({
          id: `PO-${po.id}`,
          originalId: po.id,
          documentType: 'Purchase Order',
          refNo: po.poNumber,
          date: po.poDate,
          departmentOrVendor: po.vendorName,
          amount: po.totalAmount,
          requestedBy: 'System', // Could be populated if added to PO schema
          priority: 'Normal',
          status: po.status
        });
      }
    });

    // Add pending Returns
    returns.forEach(ret => {
      if (ret.status === 'Submitted' || ret.status === 'Pending Approval') {
        list.push({
          id: `RET-${ret.id}`,
          originalId: ret.id,
          documentType: 'Purchase Return',
          refNo: ret.returnNo,
          date: ret.returnDate,
          departmentOrVendor: ret.vendorName,
          amount: 0, // Not tracked on return currently
          requestedBy: 'System',
          priority: 'Normal',
          status: ret.status
        });
      }
    });

    return list;
  }, [prs, pos, returns]);

  const processedData = useMemo(() => {
    return pendingRecords.filter(record => {
      const matchesSearch = Object.values(record).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesTab = activeTab === 'All' ? true : record.documentType === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [pendingRecords, searchTerm, activeTab]);

  const handleAction = (record: ApprovalRecord, action: 'Approved' | 'Rejected') => {
    if (record.documentType === 'Purchase Requisition') {
      const updated = prs.map(pr => pr.id === record.originalId ? { ...pr, approvalStatus: action, currentStage: action === 'Approved' ? 'Approved' : 'Rejected' } : pr);
      setPrs(updated);
    } else if (record.documentType === 'Purchase Order') {
      const updated = pos.map(po => po.id === record.originalId ? { ...po, status: action } : po);
      setPos(updated);
    } else if (record.documentType === 'Purchase Return') {
      const updated = returns.map(ret => ret.id === record.originalId ? { ...ret, status: action } : ret);
      setReturns(updated);
    }
    alert(`Document ${record.refNo} has been ${action}!`);
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
                      <span className="font-medium text-slate-700">{record.documentType}</span>
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
                      <Button variant="outline" size="sm" icon={Eye} className="!p-2" onClick={() => {
                        setSelectedRecord(record);
                        setIsViewOpen(true);
                      }} />
                      <Button variant="filled" color="primary" size="sm" icon={CheckCircle} onClick={() => handleAction(record, 'Approved')}>Approve</Button>
                      <Button variant="outline" size="sm" icon={XCircle} onClick={() => handleAction(record, 'Rejected')} className="text-red-500 hover:bg-red-50 hover:border-red-200 border-slate-200">Reject</Button>
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
            {(() => {
              if (selectedRecord.documentType === 'Purchase Requisition') {
                const pr = prs.find(p => p.id === selectedRecord.originalId);
                if (!pr) return null;
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
                          {pr.items.map(item => (
                            <tr key={item.id} className="bg-white">
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
                const po = pos.find(p => p.id === selectedRecord.originalId);
                if (!po) return null;
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
                          {po.items.map(item => (
                            <tr key={item.id} className="bg-white">
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
                const ret = returns.find(r => r.id === selectedRecord.originalId);
                if (!ret) return null;
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
                          {ret.items.map((item: any) => (
                            <tr key={item.id} className="bg-white">
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
                handleAction(selectedRecord, 'Rejected');
                setIsViewOpen(false);
              }}>Reject</Button>
              <Button variant="filled" color="primary" onClick={() => {
                handleAction(selectedRecord, 'Approved');
                setIsViewOpen(false);
              }}>Approve</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
