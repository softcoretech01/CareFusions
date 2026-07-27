
import { Edit2, Trash2, AlertTriangle } from 'lucide-react';
import type { Medicine } from '../../contexts/PharmacyBillingContext';

interface MedicineListProps {
  medicines: Medicine[];
  onEdit: (medicine: Medicine) => void;
  onDelete: (id: string) => void;
}

export const MedicineList = ({ medicines, onEdit, onDelete }: MedicineListProps) => {
  return (
    <div className="flex-1 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">Medicine Name</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Batch No</th>
            <th className="px-4 py-3 font-medium text-right">Qty</th>
            <th className="px-4 py-3 font-medium text-right">Unit Price (₹)</th>
            <th className="px-4 py-3 font-medium">Expiry Date</th>
            <th className="px-4 py-3 font-medium">Manufacturer</th>
            <th className="px-4 py-3 font-medium text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {medicines.length > 0 ? (
            medicines.map((medicine) => (
              <tr key={medicine.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {medicine.name}
                  {medicine.quantity < medicine.minStockLevel && (
                    <span title="Low Stock"><AlertTriangle className="inline-block ml-2 w-4 h-4 text-amber-500" /></span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                    {medicine.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{medicine.batchNo}</td>
                <td className={`px-4 py-3 text-right font-medium ${medicine.quantity < medicine.minStockLevel ? 'text-amber-600' : 'text-slate-700'}`}>
                  {medicine.quantity}
                </td>
                <td className="px-4 py-3 text-right text-slate-700 font-medium">
                  {medicine.unitPrice.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-slate-600">{medicine.expiryDate}</td>
                <td className="px-4 py-3 text-slate-600">{medicine.manufacturer}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(medicine)}
                      className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(medicine.id)}
                      className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                No medicines found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
