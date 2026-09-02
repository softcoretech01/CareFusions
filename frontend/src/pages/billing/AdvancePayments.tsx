import React, { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle, CreditCard, DollarSign } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import clsx from 'clsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface AdvanceBill {
  AdvanceId: number;
  AdvanceNo: string;
  ServiceOrderId: number;
  UHID: string;
  TotalAmount: number;
  Status: string;
  CreatedAt: string;
}

const AdvancePayments = () => {
  const [bills, setBills] = useState<AdvanceBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<number | null>(null);

  const fetchBills = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/billing/advance/pending`);
      setBills(data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch advance bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handlePay = async (bill: AdvanceBill) => {
    setPaying(bill.AdvanceId);
    try {
      await axios.post(`${API_URL}/billing/advance/${bill.AdvanceId}/pay`, {
        Amount: bill.TotalAmount,
        PaymentMode: "CASH",
        PaymentReference: "TXN-" + Math.floor(Math.random() * 100000)
      });
      toast.success(`Advance Bill ${bill.AdvanceNo} Paid successfully. Services are now unlocked!`);
      fetchBills();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to process payment');
    } finally {
      setPaying(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Advance Payments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage PRO approved orders pending for advance payment.</p>
        </div>
        <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 border border-amber-200">
          <DollarSign className="w-4 h-4" />
          {bills.length} Bills Pending Payment
        </div>
      </div>

      {bills.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Advance Payments Pending</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            There are currently no PRO approved orders waiting for advance payment. When a PRO approves an order with a patient responsibility, it will automatically appear here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bills.map((bill) => (
            <Card key={bill.AdvanceId} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
              <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="font-bold text-slate-800 text-lg">{bill.AdvanceNo}</h3>
                          <p className="text-sm text-slate-500 mt-1">UHID: <span className="font-medium text-slate-700">{bill.UHID}</span></p>
                          <p className="text-sm text-slate-500">Service Order ID: #{bill.ServiceOrderId}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(bill.CreatedAt).toLocaleString()}</p>
                      </div>
                      <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
                          PENDING
                      </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between mb-6 border border-slate-100">
                      <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Amount Due</p>
                          <p className="text-2xl font-black text-slate-800">₹{bill.TotalAmount}</p>
                      </div>
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                          <CreditCard className="w-6 h-6 text-slate-400" />
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <Button 
                        onClick={() => handlePay(bill)}
                        disabled={paying === bill.AdvanceId}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-sm shadow-blue-600/20"
                      >
                        {paying === bill.AdvanceId ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <DollarSign className="w-5 h-5 mr-2" />}
                        Process Payment
                      </Button>
                  </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvancePayments;
