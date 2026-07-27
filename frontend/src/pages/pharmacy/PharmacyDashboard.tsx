import { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import type { Medicine } from '../../contexts/PharmacyBillingContext';
import { Button } from '../../components/ui/Button';
import { MedicineList } from '../../components/pharmacy/MedicineList';
import { AddMedicineForm } from '../../components/pharmacy/AddMedicineForm';
import { EditMedicineForm } from '../../components/pharmacy/EditMedicineForm';
import { StockAlert } from '../../components/pharmacy/StockAlert';
import { SearchMedicine } from '../../components/pharmacy/SearchMedicine';
import { Modal } from '../../components/ui/Modal';
import { AlertTriangle } from 'lucide-react';

export const PharmacyDashboard = () => {
  const { medicines, addMedicine, updateMedicine, deleteMedicine, searchMedicine } = usePharmacyBilling();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [deletingMedicineId, setDeletingMedicineId] = useState<string | null>(null);

  const displayedMedicines = searchQuery ? searchMedicine(searchQuery) : medicines;

  const handleAddSave = (data: Omit<Medicine, 'id'>) => {
    addMedicine(data);
    setIsAdding(false);
  };

  const handleEditSave = (id: string, data: Partial<Medicine>) => {
    updateMedicine(id, data);
    setEditingMedicine(null);
  };

  const confirmDelete = () => {
    if (deletingMedicineId) {
      deleteMedicine(deletingMedicineId);
      setDeletingMedicineId(null);
    }
  };

  if (isAdding) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Add New Medicine</h2>
            <p className="text-slate-500 text-sm">Enter details for a new inventory item</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
          <AddMedicineForm onSave={handleAddSave} onCancel={() => setIsAdding(false)} />
        </div>
      </div>
    );
  }

  const exportToCSV = () => {
    if (displayedMedicines.length === 0) return;
    
    const headers = ['Medicine Name', 'Category', 'Batch No', 'Quantity', 'Unit Price', 'Expiry Date', 'Manufacturer'];
    const rows = displayedMedicines.map(med => [
      med.name,
      med.category,
      med.batchNo,
      med.quantity.toString(),
      med.unitPrice.toFixed(2),
      new Date(med.expiryDate).toLocaleDateString(),
      med.manufacturer
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pharmacy_inventory.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (editingMedicine) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Edit Medicine</h2>
            <p className="text-slate-500 text-sm">Update details for {editingMedicine.name}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
          <EditMedicineForm medicine={editingMedicine} onSave={handleEditSave} onCancel={() => setEditingMedicine(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pharmacy Management</h2>
          <p className="text-slate-500 text-sm">Manage inventory and monitor stock levels</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={Download} onClick={exportToCSV}>Export List</Button>
          <Button variant="filled" color="primary" icon={Plus} onClick={() => setIsAdding(true)}>
            Add Medicine
          </Button>
        </div>
      </div>

      <StockAlert />

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4 items-center justify-between">
          <SearchMedicine onSearch={setSearchQuery} />
        </div>
        
        <MedicineList 
          medicines={displayedMedicines} 
          onEdit={setEditingMedicine}
          onDelete={setDeletingMedicineId}
        />
      </div>

      <Modal
        isOpen={!!deletingMedicineId}
        onClose={() => setDeletingMedicineId(null)}
        title="Confirm Deletion"
        maxWidth="sm"
      >
        <div className="p-1">
          <div className="flex items-center gap-4 mb-6 text-amber-600 bg-amber-50 p-4 rounded-xl">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <p className="text-sm font-medium">
              Are you sure you want to delete this medicine? 
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" color="secondary" onClick={() => setDeletingMedicineId(null)}>
              Cancel
            </Button>
            <Button variant="filled" color="danger" onClick={confirmDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
