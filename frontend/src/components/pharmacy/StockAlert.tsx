
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import { AlertTriangle, Clock } from 'lucide-react';

export const StockAlert = () => {
  const { checkLowStock, checkExpiry } = usePharmacyBilling();
  
  const lowStockMedicines = checkLowStock();
  const expiringMedicines = checkExpiry();

  if (lowStockMedicines.length === 0 && expiringMedicines.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {lowStockMedicines.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Low Stock Alert</h4>
            <p className="text-sm mt-1">
              {lowStockMedicines.length} medicine(s) are running below minimum stock levels.
            </p>
          </div>
        </div>
      )}
      {expiringMedicines.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3">
          <Clock className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Expiry Alert</h4>
            <p className="text-sm mt-1">
              {expiringMedicines.length} medicine(s) are expiring within 30 days.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
