import { useState } from 'react';
import { FlaskConical, Plus, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInvestigations } from '../../contexts/InvestigationContext';

interface InvestigationsTabProps {
  patientId: string;
  patientName: string;
}

export const InvestigationsTab: React.FC<InvestigationsTabProps> = ({ patientId, patientName }) => {
  const { orders, addOrder } = useInvestigations();
  const patientOrders = orders.filter(o => o.patientId === patientId);

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

  const handleToggleLab = (lab: string) => {
    setSelectedLabs(prev => prev.includes(lab) ? prev.filter(l => l !== lab) : [...prev, lab]);
  };

  const handleToggleScan = (scan: string) => {
    setSelectedScans(prev => prev.includes(scan) ? prev.filter(s => s !== scan) : [...prev, scan]);
  };

  const handlePlaceOrder = () => {
    const labTests = [...selectedLabs];
    if (customTest.trim()) labTests.push(customTest.trim());

    const scanTests = [...selectedScans];
    if (customScan.trim()) scanTests.push(customScan.trim());

    if (labTests.length === 0 && scanTests.length === 0) {
      toast.error('Please select at least one test to order.');
      return;
    }

    if (labTests.length > 0) {
      addOrder({
        id: `LAB-${Date.now().toString().slice(-6)}`,
        type: 'IP',
        category: 'Lab',
        patientId,
        patientName,
        orderedBy: 'Dr. Sarah Smith',
        orderedAt: new Date().toISOString(),
        tests: labTests.map(t => ({ id: crypto.randomUUID(), name: t, status: 'Pending' })),
        status: 'Pending'
      });
    }

    if (scanTests.length > 0) {
      addOrder({
        id: `RAD-${Date.now().toString().slice(-6)}`,
        type: 'IP',
        category: 'Radiology',
        patientId,
        patientName,
        orderedBy: 'Dr. Sarah Smith',
        orderedAt: new Date().toISOString(),
        tests: scanTests.map(t => ({ id: crypto.randomUUID(), name: t, status: 'Pending' })),
        status: 'Pending'
      });
    }

    toast.success('Investigation orders placed successfully.');
    setIsAdding(false);
    setSelectedLabs([]);
    setSelectedScans([]);
    setCustomTest('');
    setCustomScan('');
  };

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

      {patientOrders.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium">
          <FlaskConical className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          No investigations ordered yet.
        </div>
      ) : (
        <div className="space-y-4">
          {patientOrders.map(order => (
            <div key={order.id} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
              <div className="flex items-start justify-between mb-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-500">{order.id}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                      order.category === 'Lab' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-purple-50 text-purple-600 border border-purple-200'
                    }`}>
                      {order.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">Ordered by {order.orderedBy} on {new Date(order.orderedAt).toLocaleString()}</div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                  order.status === 'Completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                  order.status === 'Partial' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-slate-50 text-slate-600 border border-slate-200'
                }`}>
                  {order.status === 'Completed' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {order.status}
                </div>
              </div>

              <div className="space-y-2">
                {order.tests.map(test => (
                  <div key={test.id} className="flex items-center justify-between text-sm py-1">
                    <span className="font-medium text-slate-700">{test.name}</span>
                    {test.status === 'Completed' ? (
                      <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Result Available</span>
                    ) : (
                      <span className="text-slate-400 text-xs">Pending</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
