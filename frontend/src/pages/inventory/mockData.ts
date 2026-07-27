
export const mockStores = [
  { id: 'ST-001', name: 'Central Medical Store', type: 'Main' },
  { id: 'ST-002', name: 'Pharmacy Store', type: 'Sub' },
  { id: 'ST-003', name: 'Surgical Store', type: 'Sub' },
  { id: 'ST-004', name: 'General Store', type: 'Sub' },
];

export const mockDepartments = [
  { id: 'DPT-001', name: 'Operation Theatre' },
  { id: 'DPT-002', name: 'Emergency (ICU)' },
  { id: 'DPT-003', name: 'Cardiology' },
  { id: 'DPT-004', name: 'Orthopedics' },
  { id: 'DPT-005', name: 'Pathology Lab' },
];

export const mockVendors = [
  { id: 'VND-001', name: 'Apollo Medical Suppliers' },
  { id: 'VND-002', name: 'Medline Industries' },
  { id: 'VND-003', name: 'Johnson & Johnson' },
  { id: 'VND-004', name: 'PharmaCore Logistics' },
];

export const mockCategories = [
  { id: 'CAT-001', name: 'Medicines' },
  { id: 'CAT-002', name: 'Surgical Items' },
  { id: 'CAT-003', name: 'Medical Consumables' },
  { id: 'CAT-004', name: 'Laboratory Supplies' },
  { id: 'CAT-005', name: 'Medical Equipment' },
];

export const mockItems = Array.from({ length: 50 }).map((_, i) => {
  const categories = ['Medical Consumables', 'Surgical Items', 'Medicines', 'Laboratory Supplies'];
  const subCategories = ['Syringes', 'Scalpels', 'IV Fluids', 'Chemicals'];
  const brands = ['BD', 'Ethicon', 'Baxter', 'Roche'];
  const manufacturers = ['Becton Dickinson', 'Johnson & Johnson', 'Baxter Intl', 'Roche Diagnostics'];
  const uoms = ['Each', 'Box', 'Vial', 'Bottle'];
  
  const categoryIdx = i % 4;
  
  return {
    id: `ITM-10${i + 1}`,
    name: `${['Disposable Syringe 5ml', 'Surgical Scalpel No. 11', 'Normal Saline 500ml', 'Glucose Test Strip', 'Cotton Roll 500g', 'Surgical Gloves Size 7', 'IV Cannula 20G', 'Paracetamol 500mg', 'Amoxicillin 250mg', 'Digital Thermometer'][i % 10]} - V${i}`,
    category: categories[categoryIdx],
    subCategory: subCategories[categoryIdx],
    brand: brands[categoryIdx],
    manufacturer: manufacturers[categoryIdx],
    uom: uoms[categoryIdx],
    gst: [12, 5, 18, 12][categoryIdx],
    reorderLevel: (i % 3 + 1) * 100,
    maxStock: (i % 3 + 5) * 1000
  };
});

export const generateStockRecords = () => {
  return mockItems.slice(0, 25).map((item, i) => {
    const store = mockStores[i % mockStores.length].name;
    const dept = mockDepartments[i % mockDepartments.length].name;
    
    // Calculate dates
    const mfgDate = new Date();
    mfgDate.setMonth(mfgDate.getMonth() - (i % 12));
    
    const expDate = new Date();
    expDate.setMonth(expDate.getMonth() + (i % 24) + 1); // 1 to 24 months in future
    
    const availableStock = Math.floor(Math.random() * 2000) + 50; // Random stock
    
    return {
      id: `STK-${1000 + i}`,
      itemCode: item.id,
      itemName: item.name,
      category: item.category,
      subCategory: item.subCategory,
      department: dept,
      store: store,
      brand: item.brand,
      manufacturer: item.manufacturer,
      batchNo: `${item.brand.substring(0,2).toUpperCase()}${mfgDate.getFullYear()}${(mfgDate.getMonth()+1).toString().padStart(2, '0')}0${i+1}`,
      mfgDate: mfgDate.toISOString().split('T')[0],
      expiryDate: expDate.toISOString().split('T')[0],
      availableQty: availableStock,
      reservedQty: Math.floor(availableStock * 0.1),
      reorderLevel: item.reorderLevel,
      maxStock: item.maxStock,
      uom: item.uom,
      status: availableStock < item.reorderLevel ? 'Low Stock' : 'In Stock',
      lastUpdated: new Date(Date.now() - Math.random() * 10000000000).toISOString().split('T')[0]
    };
  });
};

export const initialStock = generateStockRecords();

export const generateStockInRecords = () => {
  return Array.from({ length: 20 }).map((_, i) => ({
    id: `SIN-25${i.toString().padStart(3, '0')}`,
    grnNo: `GRN-25${(i + 5).toString().padStart(3, '0')}`,
    poNo: `PO-25${(i + 2).toString().padStart(3, '0')}`,
    vendor: mockVendors[i % mockVendors.length].name,
    store: mockStores[i % mockStores.length].name,
    receivedDate: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
    totalItems: (i % 5) + 1,
    status: ['Received', 'Quality Check', 'Putaway'][i % 3]
  }));
};

export const generateStockIssueRecords = () => {
  return Array.from({ length: 20 }).map((_, i) => ({
    id: `ISS-25${i.toString().padStart(3, '0')}`,
    issueDate: new Date(Date.now() - i * 46400000).toISOString().split('T')[0],
    department: mockDepartments[i % mockDepartments.length].name,
    store: mockStores[i % mockStores.length].name,
    requestedBy: ['Dr. Smith', 'Nurse Joy', 'Dr. Adams', 'Admin Staff'][i % 4],
    approvedBy: ['Dr. House', 'Head Nurse', 'Manager'][i % 3],
    itemsCount: (i % 3) + 1,
    status: ['Draft', 'Pending Approval', 'Issued', 'Rejected'][i % 4]
  }));
};

export const generateStockTransferRecords = () => {
  return Array.from({ length: 20 }).map((_, i) => ({
    id: `TRF-25${i.toString().padStart(3, '0')}`,
    transferDate: new Date(Date.now() - i * 56400000).toISOString().split('T')[0],
    fromStore: mockStores[i % mockStores.length].name,
    toStore: mockStores[(i + 1) % mockStores.length].name,
    requestedBy: ['Dr. Smith', 'Nurse Joy', 'Store Manager', 'Admin'][i % 4],
    status: ['Pending', 'In Transit', 'Completed', 'Rejected'][i % 4],
    itemsCount: (i % 4) + 1
  }));
};

export const generateStockAdjustmentRecords = () => {
  return Array.from({ length: 15 }).map((_, i) => ({
    id: `ADJ-25${i.toString().padStart(3, '0')}`,
    adjustmentDate: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
    store: mockStores[i % mockStores.length].name,
    reason: ['Physical Count', 'Damage', 'Expiry', 'Lost', 'Correction'][i % 5],
    approvedBy: ['Dr. House', 'Store Manager', 'Auditor'][i % 3],
    status: ['Draft', 'Pending Approval', 'Approved', 'Rejected'][i % 4],
    itemsCount: (i % 3) + 1
  }));
};

export const initialStockIn = generateStockInRecords();
export const initialStockIssue = generateStockIssueRecords();
export const initialStockTransfer = generateStockTransferRecords();
export const initialStockAdjustment = generateStockAdjustmentRecords();

export const generateStockReturnRecords = () => {
  return Array.from({ length: 15 }).map((_, i) => ({
    id: `RET-25${i.toString().padStart(3, '0')}`,
    returnDate: new Date(Date.now() - i * 66400000).toISOString().split('T')[0],
    source: mockDepartments[i % mockDepartments.length].name,
    returnTo: mockStores[0].name, // Usually returning to central/main store
    returnedBy: ['Dr. Smith', 'Nurse Joy', 'Store Manager', 'Admin'][i % 4],
    reason: ['Expired', 'Excess', 'Damaged', 'Wrong Item', 'Patient Discharged'][i % 5],
    status: ['Pending', 'Received'][i % 2],
    itemsCount: (i % 3) + 1
  }));
};
export const initialStockReturn = generateStockReturnRecords();
export const generateDepartmentConsumptionRecords = () => {
  return Array.from({ length: 30 }).map((_, i) => ({
    id: `CNS-25${i.toString().padStart(3, '0')}`,
    month: ['January', 'February', 'March', 'April', 'May'][i % 5],
    department: mockDepartments[i % mockDepartments.length].name,
    category: mockCategories[i % mockCategories.length].name,
    itemCount: (i % 5) + 2,
    totalQuantity: (i * 15) + 50,
    cost: (i * 1500) + 5000,
    status: 'Verified'
  }));
};

export const generateStockLedgerRecords = () => {
  let cumulativeValue = 0;
  return Array.from({ length: 100 }).reverse().map((_, reverseI) => {
    // Generate backwards so older dates are first, making cumulative calculation easier
    const i = 99 - reverseI;
    const type = ['IN', 'OUT', 'IN', 'OUT'][i % 4];
    const qtyChange = type === 'IN' ? (i % 50) + 10 : -((i % 20) + 5);
    const unitPrice = (i % 10) * 5 + 10; // Mock unit price
    const stockValue = qtyChange * unitPrice;
    cumulativeValue += stockValue;
    return {
      id: `LED-${1000 + i}`,
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0], // Every day back
      transactionType: type,
      referenceNo: `${type}-${1000 + i}`,
      itemName: mockItems[i % mockItems.length].name,
      store: mockStores[i % mockStores.length].name,
      qty: qtyChange,
      balanceQty: (i * 10) + 100, // This is mock balance
      unitPrice: unitPrice,
      stockValue: stockValue,
      cumulativeValue: cumulativeValue,
      user: ['Dr. Smith', 'Store Manager', 'Nurse Joy', 'Admin'][i % 4]
    };
  }).reverse(); // Reverse back to newest first
};

export const initialDepartmentConsumption = generateDepartmentConsumptionRecords();
export const initialStockLedger = generateStockLedgerRecords();
