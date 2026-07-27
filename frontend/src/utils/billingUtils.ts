export const calculateSubtotal = (quantity: number, unitPrice: number): number => {
  return Number((quantity * unitPrice).toFixed(2));
};

export const calculateTax = (subtotal: number, taxRate: number): number => {
  return Number(((subtotal * taxRate) / 100).toFixed(2));
};

export const applyDiscount = (subtotal: number, discountPercent: number): number => {
  return Number(((subtotal * discountPercent) / 100).toFixed(2));
};

export const calculateTotal = (subtotal: number, discount: number, tax: number): number => {
  return Number((subtotal - discount + tax).toFixed(2));
};

export const sortMedicines = <T,>(medicines: T[], field: keyof T, order: 'asc' | 'desc'): T[] => {
  return [...medicines].sort((a, b) => {
    if (a[field] < b[field]) return order === 'asc' ? -1 : 1;
    if (a[field] > b[field]) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

export const generateInvoiceData = (billId: string, bills: any[]) => {
  const bill = bills.find(b => b.billId === billId);
  if (!bill) return null;
  return bill;
};
