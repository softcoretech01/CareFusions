import { useState, useEffect } from 'react';
import { FlaskConical, Plus, Loader2, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export interface InvestigationOrder {
  id: string;
  type: 'Lab' | 'Radiology';
  testId: number;
  testName: string;
  status: 'Ordered' | 'Sample Collected' | 'In Progress' | 'Completed';
  result?: string;
  normalRange?: string;
  orderDate: string;
  priority: 'Routine' | 'Urgent' | 'STAT';
}

interface InvestigationsTabProps {
  admissionId: number;
  patientName: string;
}

const API_BASE = import.meta.env.VITE_API_URL as string;

export const InvestigationsTab: React.FC<InvestigationsTabProps> = ({ admissionId }) => {
  const [orders, setOrders] = useState<InvestigationOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  const [selectedScans, setSelectedScans] = useState<string[]>([]);
  const [customTest, setCustomTest] = useState('');
  const [customScan, setCustomScan] = useState('');

  const commonLabs = [
    'Complete Blood Count (CBC)',
    'Liver Function Test (LFT)',
    'Kidney Function Test (KFT)',
    'Urine Routine',
    'Lipid Profile',
    'Thyroid Profile'
  ];

  const commonScans = [
    'X-Ray Chest (PA View)',
    'USG Abdomen',
    'CT Scan Head',
    'MRI Brain',
    '2D Echo'
  ];
  
  const fetchInvestigations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ipd-visits/${admissionId}/details`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.investigations) {
          const mapped = data.investigations.map((i: any) => ({
            id: String(i.InvestigationId),
            type: (i.TestName || '').includes('X-Ray') || (i.TestName || '').includes('CT') || (i.TestName || '').includes('MRI') || (i.TestName || '').includes('USG') || (i.TestName || '').includes('Echo') ? 'Radiology' : 'Lab',
            testId: i.InvestigationId,
            testName: i.TestName,
            status: i.Status || 'Ordered',
            result: i.Result || '',
            normalRange: i.NormalRange || '',
            orderDate: i.RecordedAt,
            priority: 'Routine'
          }));
          setOrders(mapped);
        }
      }
    } catch (e) {
      toast.error('Failed to load investigations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, [admissionId]);

  const handleToggleLab = (lab: string) => {
    setSelectedLabs(prev => prev.includes(lab) ? prev.filter(l => l !== lab) : [...prev, lab]);
  };

  const handleToggleScan = (scan: string) => {
    setSelectedScans(prev => prev.includes(scan) ? prev.filter(s => s !== scan) : [...prev, scan]);
  };

  const handlePlaceOrder = async () => {
    const labTests = [...selectedLabs];
    if (customTest.trim()) labTests.push(customTest.trim());

    const scanTests = [...selectedScans];
    if (customScan.trim()) scanTests.push(customScan.trim());

    const allTests = [...labTests, ...scanTests];

    if (allTests.length === 0) {
      toast.error('Please select at least one test to order.');
      return;
    }

    try {
      let successCount = 0;
      for (const test of allTests) {
        const payload = {
          admissionId: admissionId,
          investigation: {
            testName: test,
            status: 'Ordered'
          }
        };
        const res = await fetch(`${API_BASE}/ipd-visits/save-clinical`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) successCount++;
      }
      
      if (successCount > 0) {
        toast.success(`Ordered ${successCount} investigation(s) successfully`);
        setIsAdding(false);
        setSelectedLabs([]);
        setSelectedScans([]);
        setCustomTest('');
        setCustomScan('');
        fetchInvestigations();
      } else {
        toast.error('Failed to order tests');
      }
    } catch (e) {
      toast.error('Failed to order tests');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Sample Collected': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" /> Investigations
        </h3>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-primary hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> Order Investigation
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
          <h4 className="font-bold text-slate-800 mb-4">New Investigation Order</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Laboratory Section */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <h5 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">Laboratory Tests</h5>
              <div className="space-y-2">
                {commonLabs.map(lab => (
                  <label key={lab} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                      checked={selectedLabs.includes(lab)}
                      onChange={() => handleToggleLab(lab)}
                    />
                    {lab}
                  </label>
                ))}
              </div>
              <div className="pt-2">
                <input 
                  type="text" 
                  placeholder="+ Add Custom Lab Test"
                  value={customTest}
                  onChange={e => setCustomTest(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Radiology Section */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <h5 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">Radiology / Scans</h5>
              <div className="space-y-2">
                {commonScans.map(scan => (
                  <label key={scan} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                      checked={selectedScans.includes(scan)}
                      onChange={() => handleToggleScan(scan)}
                    />
                    {scan}
                  </label>
                ))}
              </div>
              <div className="pt-2">
                <input 
                  type="text" 
                  placeholder="+ Add Custom Scan"
                  value={customScan}
                  onChange={e => setCustomScan(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-300 transition-colors">Cancel</button>
            <button onClick={handlePlaceOrder} className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors">Place Order</button>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium">
          <FlaskConical className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          No investigations ordered yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
              <div className="flex items-start justify-between mb-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-500">ID: {order.id}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                      order.type === 'Lab' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-purple-50 text-purple-600 border border-purple-200'
                    }`}>
                      {order.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">Ordered on {new Date(order.orderDate).toLocaleString()}</div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border ${getStatusColor(order.status)}`}>
                  {order.status === 'Completed' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {order.status}
                </div>
              </div>

              <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm py-1">
                    <span className="font-medium text-slate-700">{order.testName}</span>
                    {order.status === 'Completed' ? (
                      <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Result Available: {order.result}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">Pending</span>
                    )}
                  </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
