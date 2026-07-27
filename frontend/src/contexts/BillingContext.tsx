import { createContext, useState, useContext, type ReactNode, useEffect } from 'react';

export interface Medicine {
  id: string;
  name: string;
  category: string;
  batchNo: string;
  quantity: number;
  unitPrice: number;
  expiryDate: string;
  manufacturer: string;
  minStockLevel: number;
}

export interface BillItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Bill {
  billId: string;
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

interface BillingContextType {
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
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const BillingProvider = ({ children }: { children: ReactNode }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([
    {
      id: 'MED-001',
      name: 'Dolo 650 (Paracetamol)',
      category: 'Tablets',
      batchNo: 'B2023-01',
      quantity: 500,
      unitPrice: 30.0,
      expiryDate: '2025-12-31',
      manufacturer: 'Micro Labs Ltd',
      minStockLevel: 50
    },
    {
      id: 'MED-002',
      name: 'Amoxil (Amoxicillin)',
      category: 'Capsules',
      batchNo: 'B2023-02',
      quantity: 150,
      unitPrice: 125.0,
      expiryDate: '2024-06-30',
      manufacturer: 'GSK',
      minStockLevel: 20
    }
  ]);

  const [bills, setBills] = useState<Bill[]>(() => {
    try {
      const saved = localStorage.getItem('hospitalBills_v2');
      if (saved) return JSON.parse(saved);
      return [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('hospitalBills_v2', JSON.stringify(bills));
  }, [bills]);


  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([]);

  // --- Pharmacy Functions ---
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

  const checkLowStock = () => {
    return medicines.filter(m => m.quantity < m.minStockLevel);
  };

  const checkExpiry = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return medicines.filter(m => new Date(m.expiryDate) <= thirtyDaysFromNow);
  };

  const updateStock = (id: string, quantitySold: number) => {
    setMedicines(prev =>
      prev.map(m =>
        m.id === id ? { ...m, quantity: m.quantity - quantitySold } : m
      )
    );
  };

  // --- Billing Functions ---
  const createNewBill = () => {
    setCurrentBillItems([]);
  };

  const addItemToBill = (medicineId: string, quantity: number) => {
    const medicine = medicines.find(m => m.id === medicineId);
    if (!medicine || medicine.quantity < quantity) {
      alert('Insufficient stock or medicine not found.');
      return;
    }
    const newItem: BillItem = {
      medicineId: medicine.id,
      medicineName: medicine.name,
      quantity,
      unitPrice: medicine.unitPrice,
      subtotal: medicine.unitPrice * quantity
    };
    setCurrentBillItems([...currentBillItems, newItem]);
  };

  const removeItemFromBill = (index: number) => {
    const newItems = [...currentBillItems];
    newItems.splice(index, 1);
    setCurrentBillItems(newItems);
  };

  const finalizeBill = (billData: Omit<Bill, 'billId' | 'items'>) => {
    if (currentBillItems.length === 0) {
      alert('No items in the bill.');
      return;
    }

    // Deduct stock
    currentBillItems.forEach(item => {
      updateStock(item.medicineId, item.quantity);
    });

    const newBill: Bill = {
      ...billData,
      billId: `BILL${String(bills.length + 1).padStart(4, '0')}`,
      items: [...currentBillItems]
    };

    setBills([...bills, newBill]);
    setCurrentBillItems([]);
  };

  const cancelBill = () => {
    setCurrentBillItems([]);
  };

  const searchBillHistory = (query: string) => {
    const q = query.toLowerCase();
    return bills.filter(
      b => b.patientName.toLowerCase().includes(q) || b.billId.toLowerCase().includes(q) || b.date.includes(q)
    );
  };

  const refundBill = (billId: string) => {
    const bill = bills.find(b => b.billId === billId);
    if (!bill) return;

    // Restore stock
    bill.items.forEach(item => {
      updateStock(item.medicineId, -item.quantity);
    });

    // Update bill status
    setBills(bills.map(b => (b.billId === billId ? { ...b, paymentStatus: 'Refunded' } : b)));
  };

  const addRetailBill = (bill: Bill) => {
    // Deduct stock for each item
    bill.items.forEach(item => {
      updateStock(item.medicineId, item.quantity);
    });
    setBills([bill, ...bills]);
  };

  const updateBillStatus = (billId: string, status: string) => {
    setBills(bills.map(b => b.billId === billId ? { ...b, paymentStatus: status } : b));
  };

  const updateRetailBill = (updatedBill: Bill) => {
    setBills(bills.map(b => b.billId === updatedBill.billId ? updatedBill : b));
  };

  return (
    <BillingContext.Provider
      value={{
        medicines,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        searchMedicine,
        checkLowStock,
        checkExpiry,
        updateStock,
        bills,
        currentBillItems,
        createNewBill,
        addItemToBill,
        removeItemFromBill,
        finalizeBill,
        cancelBill,
        searchBillHistory,
        refundBill,
        addRetailBill,
        updateBillStatus,
        updateRetailBill
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
};
