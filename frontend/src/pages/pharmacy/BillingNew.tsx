import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import { NewBillForm } from '../../components/billing/NewBillForm';

export const BillingNew = () => {
  const { createNewBill } = usePharmacyBilling();
  const navigate = useNavigate();

  // Initialize a new bill on mount
  useEffect(() => {
    createNewBill();
  }, []);

  const handleBillSuccess = () => {
    // Navigate back to history after successful bill creation
    navigate('/pharmacy/dispense-list');
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Create New Bill</h2>
        <p className="text-slate-500 text-sm">Generate a new pharmacy bill</p>
      </div>

      <div className="flex-1 overflow-hidden">
        <NewBillForm onSuccess={handleBillSuccess} />
      </div>
    </div>
  );
};
