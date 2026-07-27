import { useState } from 'react';
import { BillHistory as BillHistoryComponent } from '../../components/billing/BillHistory';
import { InvoicePreview } from '../../components/billing/InvoicePreview';

export const BillingHistory = () => {
  const [previewBillId, setPreviewBillId] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Bill History</h2>
        <p className="text-slate-500 text-sm">View past bills, process refunds, and print invoices</p>
      </div>

      <div className="flex-1 overflow-hidden">
        <BillHistoryComponent onViewInvoice={setPreviewBillId} />
      </div>

      <InvoicePreview 
        billId={previewBillId} 
        isOpen={!!previewBillId} 
        onClose={() => setPreviewBillId(null)} 
      />
    </div>
  );
};
