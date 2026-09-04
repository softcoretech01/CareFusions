import { API_BASE_URL } from '@/utils/apiBase';
import { createContext, useState, useContext, useCallback, useEffect, type ReactNode, useRef } from 'react';

const API_BASE = API_BASE_URL;
const PHARM = `${API_BASE}/pharmacy`;

export interface Medicine {
  id: string;
  name: string;
  category: string;
  batchNo: string;
  /** Owning master: MEDICINE | MEDICAL_ITEM. */
  itemType?: string;
  quantity: number;
  unitPrice: number;
  expiryDate: string;
  manufacturer: string;
  minStockLevel: number;
}

export interface BillItem {
  medicineId: string;
  itemType?: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Bill {
  saleId?: number;        // server PK, used for refund / status updates
  billId: string;         // server-generated BillNumber (INV-YYYYNNNN)
  patientName: string;
  patientId: string;
  date: string;
  items: BillItem[];
  totalAmount: number;
  discount: number;
  tax: number;
  netAmount: number;
  paymentMode: string;
  paymentStatus: string;
}

interface PharmacyBillingContextType {
  // Pharmacy State & Functions
  medicines: Medicine[];
  addMedicine: (medicine: Omit<Medicine, 'id'>) => void;
  updateMedicine: (id: string, updatedData: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  searchMedicine: (query: string) => Medicine[];
  checkLowStock: () => Medicine[];
  checkExpiry: () => Medicine[];
  updateStock: (id: string, quantitySold: number) => void;

  // Billing State & Functions
  bills: Bill[];
  currentBillItems: BillItem[];
  createNewBill: () => void;
  addItemToBill: (medicineId: string, quantity: number) => void;
  removeItemFromBill: (index: number) => void;
  finalizeBill: (billData: Omit<Bill, 'billId' | 'items'>) => void;
  cancelBill: () => void;
  searchBillHistory: (query: string) => Bill[];
  refundBill: (billId: string) => void;
  addRetailBill: (bill: Bill) => void;
  updateBillStatus: (billId: string, status: string) => void;
  updateRetailBill: (updatedBill: Bill) => void;
  refresh?: (force?: boolean) => Promise<void>;
  hasLoaded?: boolean;
}

const PharmacyBillingContext = createContext<PharmacyBillingContextType | undefined>(undefined);

// Map a Bill (or finalize payload with items) to the sale-create API body.
const toSaleBody = (bill: Omit<Bill, 'billId'>) => ({
  patientName: bill.patientName || null,
  patientRef: bill.patientId || null,
  totalAmount: bill.totalAmount,
  discount: bill.discount || 0,
  tax: bill.tax || 0,
  netAmount: bill.netAmount,
  paymentMode: bill.paymentMode || 'Cash',
  paymentStatus: bill.paymentStatus || 'Pending',
  items: bill.items.map(i => ({
    medicineId: Number(i.medicineId),
    // The counter sells medicines and priced medical items; the type tells
    // the server which master the id belongs to and which lots to allocate.
    itemType: i.itemType || 'MEDICINE',
    medicineName: i.medicineName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    subtotal: i.subtotal,
  })),
});

export const PharmacyBillingProvider = ({ children }: { children: ReactNode }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([]);
  const [, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Live inventory + sales are owned by the backend (hospital.Pharmacy_*).
  const refresh = useCallback(async (force: boolean = false) => {
    if (hasLoaded && !force) return;
    setIsLoading(true);
    try {
      const [m, s] = await Promise.all([
        fetch(`${PHARM}/medicines`).then(r => r.json()),
        fetch(`${PHARM}/sales`).then(r => r.json()),
      ]);
      setMedicines(Array.isArray(m) ? m : []);
      setBills(Array.isArray(s) ? s : []);
    } catch (e) {
      console.error('[Pharmacy] load failed', e);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  // Removed automatic useEffect for refresh

  const saleIdFor = (billId: string) => bills.find(b => b.billId === billId)?.saleId;

  // --- Pharmacy inventory helpers (read side derived from server state) ---
  // add/update/delete medicine are used only by the (unrouted) inventory
  // dashboard; kept as optimistic local ops so that screen still functions.
  const addMedicine = (medicineData: Omit<Medicine, 'id'>) => {
    const newId = `MED${String(medicines.length + 1).padStart(3, '0')}`;
    setMedicines([...medicines, { ...medicineData, id: newId }]);
  };
  const updateMedicine = (id: string, updatedData: Partial<Medicine>) => {
    setMedicines(medicines.map(m => (m.id === id ? { ...m, ...updatedData } : m)));
  };
  const deleteMedicine = (id: string) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };

  const searchMedicine = (query: string) => {
    const q = query.toLowerCase();
    return medicines.filter(
      m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.batchNo.toLowerCase().includes(q)
    );
  };

  const checkLowStock = () => medicines.filter(m => m.quantity < m.minStockLevel);

  const checkExpiry = () => {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return medicines.filter(m => m.expiryDate && new Date(m.expiryDate) <= thirtyDaysFromNow);
  };

  // Manual stock correction (unrouted inventory dashboard). Sales/refunds
  // adjust stock server-side, so this is not called by the POS/returns flow.
  const updateStock = (id: string, quantitySold: number) => {
    (async () => {
      try {
        await fetch(`${PHARM}/stock/${id}/adjust`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delta: -quantitySold }),
        });
        await refresh(true);
      } catch (e) { console.error('[Pharmacy] stock adjust failed', e); }
    })();
  };

  // --- Billing ---
  const createNewBill = () => setCurrentBillItems([]);

  const addItemToBill = (medicineId: string, quantity: number) => {
    const medicine = medicines.find(m => m.id === medicineId);
    if (!medicine || medicine.quantity < quantity) {
      alert('Insufficient stock or medicine not found.');
      return;
    }
    setCurrentBillItems([...currentBillItems, {
      medicineId: medicine.id, itemType: medicine.itemType, medicineName: medicine.name, quantity,
      unitPrice: medicine.unitPrice, subtotal: medicine.unitPrice * quantity,
    }]);
  };

  const removeItemFromBill = (index: number) => {
    const next = [...currentBillItems];
    next.splice(index, 1);
    setCurrentBillItems(next);
  };

  const finalizeBill = (billData: Omit<Bill, 'billId' | 'items'>) => {
    if (currentBillItems.length === 0) { alert('No items in the bill.'); return; }
    (async () => {
      try {
        const res = await fetch(`${PHARM}/sales`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toSaleBody({ ...billData, items: currentBillItems })),
        });
        if (!res.ok) throw new Error(await res.text());
        setCurrentBillItems([]);
        await refresh(true);
      } catch (e) {
        console.error('[Pharmacy] finalize failed', e);
        alert('Failed to save bill. Check stock availability.');
      }
    })();
  };

  const cancelBill = () => setCurrentBillItems([]);

  const searchBillHistory = (query: string) => {
    const q = query.toLowerCase();
    return bills.filter(
      b => b.patientName.toLowerCase().includes(q) || b.billId.toLowerCase().includes(q) || b.date.includes(q)
    );
  };

  const refundBill = (billId: string) => {
    const saleId = saleIdFor(billId);
    if (!saleId) return;
    (async () => {
      try {
        await fetch(`${PHARM}/sales/${saleId}/refund`, { method: 'POST' });
        await refresh(true);
      } catch (e) { console.error('[Pharmacy] refund failed', e); }
    })();
  };

  // POS entry point — the bill's client billId is ignored; the server assigns
  // the authoritative bill number and decrements stock atomically.
  const addRetailBill = (bill: Bill) => {
    (async () => {
      try {
        const res = await fetch(`${PHARM}/sales`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toSaleBody(bill)),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'sale failed');
        }
        await refresh(true);
      } catch (e: any) {
        console.error('[Pharmacy] sale failed', e);
        alert(e.message === 'Insufficient stock for one or more items'
          ? 'Insufficient stock for one or more items.'
          : 'Failed to complete sale.');
      }
    })();
  };

  const updateBillStatus = (billId: string, status: string) => {
    const saleId = saleIdFor(billId);
    if (!saleId) return;
    (async () => {
      try {
        await fetch(`${PHARM}/sales/${saleId}/status`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentStatus: status }),
        });
        await refresh(true);
      } catch (e) { console.error('[Pharmacy] status update failed', e); }
    })();
  };

  const updateRetailBill = (updatedBill: Bill) => {
    setBills(bills.map(b => (b.billId === updatedBill.billId ? updatedBill : b)));
  };

  return (
    <PharmacyBillingContext.Provider
      value={{
        medicines, addMedicine, updateMedicine, deleteMedicine, searchMedicine,
        checkLowStock, checkExpiry, updateStock,
        bills, currentBillItems, createNewBill, addItemToBill, removeItemFromBill,
        finalizeBill, cancelBill, searchBillHistory, refundBill, addRetailBill,
        updateBillStatus, updateRetailBill, refresh, hasLoaded
      }}
    >
      {children}
    </PharmacyBillingContext.Provider>
  );
};

export const usePharmacyBilling = () => {
  const context = useContext(PharmacyBillingContext);
  if (!context) {
    throw new Error('usePharmacyBilling must be used within a PharmacyBillingProvider');
  }
  
  // Depend on the values actually used, not the context object: the provider
  
  // builds a new object every render, so [context] re-fired this effect on each
  
  // one. The ref stops a second request while the first is still in flight —
  
  // hasLoaded only flips once the fetches resolve, so it cannot guard that gap.
  
  const { hasLoaded, loading, refresh } = context as any;
  
  const requested = useRef(false);
  
  useEffect(() => {
  
    if (hasLoaded || loading || requested.current) return;
  
    requested.current = true;
  
    Promise.resolve(refresh?.()).finally(() => { requested.current = false; });
  
  }, [hasLoaded, loading, refresh]);

  return context;
};
