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
}

const PharmacyBillingContext = createContext<PharmacyBillingContextType | undefined>(undefined);

export const PharmacyBillingProvider = ({ children }: { children: ReactNode }) => {
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
      const saved = localStorage.getItem('pharmacyBills_v2');
      return saved ? JSON.parse(saved) : [
        {
          billId: 'BILL-0001',
          patientName: 'John Doe',
          patientId: 'UHID-2026-0001',
          date: new Date().toISOString(),
          items: [{ medicineId: '1', medicineName: 'Consultation', quantity: 1, unitPrice: 500, subtotal: 500 }],
          totalAmount: 500,
          discount: 0,
          tax: 0,
          netAmount: 500,
          paymentMode: 'Cash',
          paymentStatus: 'Paid'
        },
        {
          billId: 'BILL-0002',
          patientName: 'Jane Smith',
          patientId: 'UHID-2026-0002',
          date: new Date().toISOString(),
          items: [{ medicineId: '2', medicineName: 'Paracetamol', quantity: 2, unitPrice: 20, subtotal: 40 }],
          totalAmount: 40,
          discount: 0,
          tax: 0,
          netAmount: 40,
          paymentMode: 'Card',
          paymentStatus: 'Paid'
        },
        {
          billId: 'BILL-0003',
          patientName: 'Robert Johnson',
          patientId: 'UHID-2026-0003',
          date: new Date().toISOString(),
          items: [{ medicineId: '3', medicineName: 'Blood Test', quantity: 1, unitPrice: 650, subtotal: 650 }],
          totalAmount: 650,
          discount: 0,
          tax: 0,
          netAmount: 650,
          paymentMode: 'Pending',
          paymentStatus: 'Unpaid'
        },
        {
          billId: 'BILL-0004',
          patientName: 'Maria Garcia',
          patientId: 'UHID-2026-0004',
          date: new Date().toISOString(),
          items: [{ medicineId: '4', medicineName: 'Emergency Consultation', quantity: 1, unitPrice: 800, subtotal: 800 }],
          totalAmount: 800,
          discount: 0,
          tax: 0,
          netAmount: 800,
          paymentMode: 'Card',
          paymentStatus: 'Paid'
        },
        {
          billId: 'BILL-0005',
          patientName: 'William Taylor',
          patientId: 'UHID-2026-0005',
          date: new Date().toISOString(),
          items: [{ medicineId: '5', medicineName: 'Eye Drops', quantity: 1, unitPrice: 150, subtotal: 150 }],
          totalAmount: 150,
          discount: 0,
          tax: 0,
          netAmount: 150,
          paymentMode: 'Cash',
          paymentStatus: 'Unpaid'
        }
      ];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('pharmacyBills_v2', JSON.stringify(bills));
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
    <PharmacyBillingContext.Provider
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
    </PharmacyBillingContext.Provider>
  );
};

export const usePharmacyBilling = () => {
  const context = useContext(PharmacyBillingContext);
  if (context === undefined) {
    throw new Error('usePharmacyBilling must be used within a PharmacyBillingProvider');
  }
  return context;
};
