import { createContext, useContext, useState, type ReactNode } from 'react';

// Types
export interface PRItem {
  id: string;
  category: string;
  item: string;
  quantity: number;
  estimatedUnitPrice: number;
  total: number;
}

export interface PR {
  id: string;
  department: string;
  items: PRItem[];
  estimatedTotal: number;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  status: 'Pending Approval' | 'Approved' | 'Converted to PO' | 'Rejected';
  date: string;
  requestedBy: string;
}

export interface POItem {
  id: string;
  category: string;
  item: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PO {
  id: string;
  prId: string;
  vendorId: string;
  vendorName: string;
  items: POItem[];
  grandTotal: number;
  expectedDelivery: string;
  status: 'Draft' | 'Sent to Vendor' | 'Partially Fulfilled' | 'Fulfilled' | 'Cancelled';
  dateCreated: string;
}

export interface GRNItem {
  id: string; // references POItem id
  poItemId: string;
  item: string;
  orderedQty: number;
  receivedQty: number;
  rejectedQty: number;
  batchNumber: string;
  expiryDate: string;
}

export interface GRN {
  id: string;
  poId: string;
  vendorName: string;
  receivedItems: GRNItem[];
  status: 'Pending QA' | 'Accepted' | 'Rejected';
  receivedDate: string;
}

interface ProcurementContextType {
  prs: PR[];
  pos: PO[];
  grns: GRN[];
  vendors: any[];
  addPR: (pr: Omit<PR, 'id' | 'status' | 'date'>) => void;
  approvePR: (id: string) => void;
  rejectPR: (id: string) => void;
  createPOFromPR: (prId: string, vendorId: string, vendorName: string, items: POItem[], expectedDelivery: string) => void;
  createGRNFromPO: (poId: string, vendorName: string, receivedItems: GRNItem[]) => void;
  acceptGRN: (id: string) => void;
  deletePR: (id: string) => void;
  deletePO: (id: string) => void;
  deleteGRN: (id: string) => void;
  updatePR: (id: string, updates: Partial<PR>) => void;
}

const ProcurementContext = createContext<ProcurementContextType | undefined>(undefined);

export const ProcurementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vendors] = useState([
    { id: 'V-101', name: 'PharmaCorp India', categories: ['Pharmaceuticals', 'Lab Reagents'], rating: 4.8 },
    { id: 'V-102', name: 'MediEquip Solutions', categories: ['Medical Equipment'], rating: 4.5 },
    { id: 'V-103', name: 'Global Surgicals', categories: ['Medical Consumables'], rating: 4.2 },
    { id: 'V-104', name: 'CarePlus Distributors', categories: ['General & Admin', 'Medical Consumables'], rating: 4.0 },
  ]);

  const [prs, setPrs] = useState<any[]>([
    { 
      id: 'PR-2023-401', department: 'Pharmacy', urgency: 'Routine', status: 'Approved', date: 'Oct 15, 2023', requestedBy: 'Dr. Sharma', estimatedTotal: 50000,
      items: [{ id: 'item-1', category: 'Pharmaceuticals', item: 'Paracetamol 500mg IV', quantity: 1000, estimatedUnitPrice: 50, total: 50000 }]
    },
    { 
      id: 'PR-2023-402', department: 'ICU', urgency: 'Urgent', status: 'Pending Approval', date: 'Oct 16, 2023', requestedBy: 'Dr. Mehta', estimatedTotal: 250000,
      items: [{ id: 'item-2', category: 'Medical Equipment', item: 'Multipara Monitor', quantity: 2, estimatedUnitPrice: 125000, total: 250000 }]
    },
    { 
      id: 'PR-2023-403', department: 'Surgery', urgency: 'Emergency', status: 'Converted to PO', date: 'Oct 10, 2023', requestedBy: 'Dr. Ali', estimatedTotal: 15000,
      items: [{ id: 'item-3', category: 'Medical Consumables', item: 'Surgical Gloves (Size 7.5)', quantity: 500, estimatedUnitPrice: 30, total: 15000 }]
    },
  ]);

  const [pos, setPos] = useState<PO[]>([
    {
      id: 'PO-2023-001',
      prId: 'PR-2023-001',
      vendorId: 'VEN-001',
      vendorName: 'MediQuip Supplies',
      items: [
        { id: 'item-1', category: 'Medical Equipment', item: 'ECG Machine Cables', quantity: 5, unitPrice: 1950, total: 9750 }
      ],
      grandTotal: 9750,
      expectedDelivery: '2023-11-05',
      status: 'Sent to Vendor',
      dateCreated: '2023-10-25'
    }
  ]);

  const [grns, setGrns] = useState<GRN[]>([]);

  const addPR = (pr: Omit<PR, 'id' | 'status' | 'date'>) => {
    const newPR: PR = {
      ...pr,
      id: `PR-${new Date().getFullYear()}-${String(prs.length + 1).padStart(3, '0')}`,
      status: 'Pending Approval',
      date: new Date().toISOString().split('T')[0]
    };
    setPrs([newPR, ...prs]);
  };

  const approvePR = (id: string) => {
    setPrs(prs.map(pr => pr.id === id ? { ...pr, status: 'Approved' } : pr));
  };

  const rejectPR = (id: string) => {
    setPrs(prs.map(pr => pr.id === id ? { ...pr, status: 'Rejected' } : pr));
  };

  const createPOFromPR = (prId: string, vendorId: string, vendorName: string, items: POItem[], expectedDelivery: string) => {
    const grandTotal = items.reduce((sum, item) => sum + item.total, 0);
    const newPO: PO = {
      id: `PO-${new Date().getFullYear()}-${String(pos.length + 1).padStart(3, '0')}`,
      prId,
      vendorId,
      vendorName,
      items,
      grandTotal,
      expectedDelivery,
      status: 'Sent to Vendor',
      dateCreated: new Date().toISOString().split('T')[0]
    };
    
    setPos([newPO, ...pos]);
    setPrs(prs.map(pr => pr.id === prId ? { ...pr, status: 'Converted to PO' } : pr));
  };

  const createGRNFromPO = (poId: string, vendorName: string, receivedItems: GRNItem[]) => {
    const newGRN: GRN = {
      id: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(3, '0')}`,
      poId,
      vendorName,
      receivedItems,
      status: 'Pending QA',
      receivedDate: new Date().toISOString().split('T')[0]
    };
    
    setGrns([newGRN, ...grns]);
    
    // Simplistic check: if any items were received, update PO status
    setPos(pos.map(po => {
      if (po.id === poId) {
        return { ...po, status: 'Partially Fulfilled' }; // In real app, check against full quantities
      }
      return po;
    }));
  };

  const acceptGRN = (id: string) => {
    setGrns(grns.map(g => g.id === id ? { ...g, status: 'Accepted' } : g));
  };

  const deletePR = (id: string) => {
    setPrs(prs.filter(pr => pr.id !== id));
  };

  const deletePO = (id: string) => {
    setPos(pos.filter(po => po.id !== id));
  };

  const deleteGRN = (id: string) => {
    setGrns(grns.filter(grn => grn.id !== id));
  };

  const updatePR = (id: string, updates: Partial<PR>) => {
    setPrs(prs.map(pr => pr.id === id ? { ...pr, ...updates } : pr));
  };

  return (
    <ProcurementContext.Provider value={{ prs, pos, grns, vendors, addPR, approvePR, rejectPR, createPOFromPR, createGRNFromPO, acceptGRN, deletePR, deletePO, deleteGRN, updatePR }}>
      {children}
    </ProcurementContext.Provider>
  );
};

export const useProcurement = () => {
  const context = useContext(ProcurementContext);
  if (context === undefined) {
    throw new Error('useProcurement must be used within a ProcurementProvider');
  }
  return context;
};
