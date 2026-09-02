import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loader2, CheckCircle, Clock } from 'lucide-react';
import clsx from 'clsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface PROOrderItem {
  ServiceOrderItemId: int;
  ItemName: string;
  Quantity: number;
  MasterPrice: number;
  PROPrice: number;
  AuthorizedDiscount: number;
  InsuranceCoveredAmount: number;
  PatientResponsibility: number;
  PROStatus: string;
}

interface PROOrder {
  ServiceOrderId: number;
  OrderNo: string;
  OrderType: string;
  UHID: string;
  OrderDate: string;
  Items: PROOrderItem[];
}

export const PRODashboard = () => {
  const [orders, setOrders] = useState<PROOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/pro/orders/pending`);
      setOrders(data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch pending orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateItem = (orderId: number, itemId: number, field: keyof PROOrderItem, value: number) => {
    setOrders(prev => prev.map(order => {
      if (order.ServiceOrderId !== orderId) return order;
      
      const newItems = order.Items.map(item => {
        if (item.ServiceOrderItemId !== itemId) return item;
        
        const updated = { ...item, [field]: value };
        
        // Auto-calculate logic if needed for UI convenience
        if (field === 'PROPrice' || field === 'AuthorizedDiscount') {
            const net = updated.PROPrice - updated.AuthorizedDiscount;
            // Defaults to putting everything in PatientResponsibility if not mapped
            if (updated.InsuranceCoveredAmount === 0) {
                updated.PatientResponsibility = net;
            }
        }
        
        if (field === 'InsuranceCoveredAmount') {
            const net = updated.PROPrice - updated.AuthorizedDiscount;
            updated.PatientResponsibility = net - value;
        }
        
        return updated;
      });
      return { ...order, Items: newItems };
    }));
  };

  const approveOrder = async (order: PROOrder) => {
    setSaving(order.ServiceOrderId);
    try {
      // Validate locally first
      for (const item of order.Items) {
        const net = item.PROPrice - item.AuthorizedDiscount;
        const sum = item.InsuranceCoveredAmount + item.PatientResponsibility;
        if (Math.abs(net - sum) > 0.01) {
          toast.error(`Math Error on ${item.ItemName}: Net (${net}) != Ins (${item.InsuranceCoveredAmount}) + Pat (${item.PatientResponsibility})`);
          setSaving(null);
          return;
        }
      }

      await axios.post(`${API_URL}/pro/orders/${order.ServiceOrderId}/approve`, {
        Items: order.Items.map(item => ({
          ServiceOrderItemId: item.ServiceOrderItemId,
          PROPrice: item.PROPrice,
          AuthorizedDiscount: item.AuthorizedDiscount,
          InsuranceCoveredAmount: item.InsuranceCoveredAmount,
          PatientResponsibility: item.PatientResponsibility
        }))
      });
      toast.success(`Order ${order.OrderNo} Approved successfully`);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to approve order');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pending Approvals</h1>
          <p className="text-slate-500 mt-1">Review and approve price details for service orders.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {orders.length} Orders Pending
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">All Caught Up!</h3>
          <p className="text-slate-500">There are no pending orders requiring your approval.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.ServiceOrderId} className="overflow-hidden border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-3">
                    {order.OrderNo}
                    <span className={clsx(
                      "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                      order.OrderType === 'LAB' ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700"
                    )}>
                      {order.OrderType}
                    </span>
                  </h3>
                  <div className="flex gap-4 mt-1 text-sm text-slate-500">
                    <span>UHID: <span className="font-medium text-slate-700">{order.UHID}</span></span>
                    <span>Date: {new Date(order.OrderDate).toLocaleString()}</span>
                  </div>
                </div>
                <Button 
                  onClick={() => approveOrder(order)}
                  disabled={saving === order.ServiceOrderId}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                >
                  {saving === order.ServiceOrderId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Approve Order
                </Button>
              </div>
              <div className="p-0">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-white uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Service Name</th>
                      <th className="px-6 py-4 w-32">Master Price</th>
                      <th className="px-6 py-4 w-32">PRO Price</th>
                      <th className="px-6 py-4 w-32">Discount</th>
                      <th className="px-6 py-4 w-32">Insurance</th>
                      <th className="px-6 py-4 w-32">Patient</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.Items.map((item) => (
                      <tr key={item.ServiceOrderItemId} className="bg-white hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-700">{item.ItemName}</td>
                        <td className="px-6 py-4 text-slate-500">₹{item.MasterPrice}</td>
                        <td className="px-6 py-4">
                          <input 
                            type="number"
                            className="w-full border-slate-200 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                            value={item.PROPrice}
                            onChange={(e) => handleUpdateItem(order.ServiceOrderId, item.ServiceOrderItemId, 'PROPrice', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="number"
                            className="w-full border-slate-200 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                            value={item.AuthorizedDiscount}
                            onChange={(e) => handleUpdateItem(order.ServiceOrderId, item.ServiceOrderItemId, 'AuthorizedDiscount', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="number"
                            className="w-full border-slate-200 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                            value={item.InsuranceCoveredAmount}
                            onChange={(e) => handleUpdateItem(order.ServiceOrderId, item.ServiceOrderItemId, 'InsuranceCoveredAmount', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="number"
                            className="w-full border-slate-200 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                            value={item.PatientResponsibility}
                            readOnly
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
