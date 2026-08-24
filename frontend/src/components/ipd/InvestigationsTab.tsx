import { useState, useEffect } from 'react';
import { FlaskConical, Plus, Loader2, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInvestigations } from '../../contexts/InvestigationContext';
import { OrderSourceTag, orderSource } from '../investigations/OrderSourceTag';

interface InvestigationsTabProps {
  admissionId: number;
  patientName: string;
  uhid: string;
}

const API_BASE = import.meta.env.VITE_API_URL as string;

interface RadiologyServiceOption {
  id: number;
  serviceName: string;
  status: string;
}

export const InvestigationsTab: React.FC<InvestigationsTabProps> = ({ patientName, uhid }) => {
  // Orders + lab catalogue come from the shared Investigation context — the
  // SAME source the Lab and Radiology menus read from, so an order placed here
  // shows up there too.
  const { catalogue, addOrder, getOrdersByPatient, loading } = useInvestigations();

  const [radiologyServices, setRadiologyServices] = useState<RadiologyServiceOption[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  const [selectedScans, setSelectedScans] = useState<string[]>([]);
  const [testBodyParts, setTestBodyParts] = useState<Record<string, string>>({});
  const [customTest, setCustomTest] = useState('');
  const [customTestBodyPart, setCustomTestBodyPart] = useState('');
  const [customScan, setCustomScan] = useState('');
  const [customScanBodyPart, setCustomScanBodyPart] = useState('');
  const [placing, setPlacing] = useState(false);

  // Radiology exam list comes from the Radiology Service master.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/radiology-services/`);
        if (res.ok) {
          const data = await res.json();
          setRadiologyServices(
            (Array.isArray(data) ? data : []).filter((s: RadiologyServiceOption) => s.status === 'Active')
          );
        }
      } catch { /* offline — picker just shows custom entry */ }
    })();
  }, []);

  // A patient admitted after OPD work carries that history with them, so this
  // list mixes both episodes. Each card is tagged with where it was requested
  // rather than hiding or reordering anything.
  const orders = getOrdersByPatient(uhid);

  const toggle = (list: string[], set: (v: string[]) => void, val: string) =>
    set(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);

  const handlePlaceOrder = async () => {
    // Resolve each picked name back to its catalogue row. testId/testCode are
    // what link the order line to Master_LabTest, and the master supplies the
    // NormalRange that drives abnormal/critical flagging — a name alone leaves
    // the line with no reference range. A free-typed custom test has no master
    // row, so it stays id-less by design.
    const fromCatalogue = (name: string) => catalogue.find(c => c.testName === name);
    const labTests = [...selectedLabs].map(name => {
      const c = fromCatalogue(name);
      return { name, testId: c?.testId, testCode: c?.testCode, bodyPart: testBodyParts[name] || '' };
    });
    if (customTest.trim()) labTests.push({ name: customTest.trim(), testId: undefined, testCode: undefined, bodyPart: customTestBodyPart.trim() });
    
    const scanTests = [...selectedScans].map(name => ({ name, bodyPart: testBodyParts[name] || '' }));
    if (customScan.trim()) scanTests.push({ name: customScan.trim(), bodyPart: customScanBodyPart.trim() });

    if (labTests.length === 0 && scanTests.length === 0) {
      toast.error('Please select at least one test to order.');
      return;
    }
    if (!uhid) {
      toast.error('Patient UHID missing — cannot place order.');
      return;
    }

    setPlacing(true);
    const now = new Date().toISOString();
    try {
      if (labTests.length > 0) {
        addOrder({
          id: `IPD-LAB-${Date.now()}`,
          type: 'IP',
          category: 'Lab',
          patientId: uhid,
          patientName,
          orderedBy: 'Doctor',
          orderedAt: now,
          tests: labTests.map((t, i) => ({
            id: `T-${Date.now()}-L${i}`,
            name: t.name,
            testId: t.testId,
            testCode: t.testCode,
            bodyPart: t.bodyPart,
            status: 'Pending' as const,
          })),
          status: 'Pending',
        });
      }
      if (scanTests.length > 0) {
        addOrder({
          id: `IPD-RAD-${Date.now()}`,
          type: 'IP',
          category: 'Radiology',
          patientId: uhid,
          patientName,
          orderedBy: 'Doctor',
          orderedAt: now,
          tests: scanTests.map((t, i) => ({ id: `T-${Date.now()}-R${i}`, name: t.name, bodyPart: t.bodyPart, status: 'Pending' })),
          status: 'Pending',
        });
      }
      toast.success('Investigation order placed — sent to Lab / Radiology.');
      setIsAdding(false);
      setSelectedLabs([]);
      setSelectedScans([]);
      setTestBodyParts({});
      setCustomTest('');
      setCustomTestBodyPart('');
      setCustomScan('');
      setCustomScanBodyPart('');
    } finally {
      setPlacing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Verified':          return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Processing':        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Sample Collected':
      case 'Sample Accepted':   return 'bg-purple-100 text-purple-700 border-purple-200';
      default:                  return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const renderOrderCard = (order: ReturnType<typeof getOrdersByPatient>[number]) => (
    <div key={order.id} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
      <div className="flex items-start justify-between mb-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-slate-500">ID: {order.id}</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
              order.category === 'Lab'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-purple-50 text-purple-600 border border-purple-200'
            }`}>
              {order.category}
            </span>
            <OrderSourceTag source={orderSource(order.type)} />
          </div>
          <div className="text-xs text-slate-500">Ordered on {new Date(order.orderedAt).toLocaleString()}</div>
        </div>
        <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border ${getStatusColor(order.status)}`}>
          {order.status === 'Completed' || order.status === 'Verified'
            ? <CheckCircle className="w-3.5 h-3.5" />
            : <Clock className="w-3.5 h-3.5" />}
          {order.status}
        </div>
      </div>

      <div className="space-y-2">
        {order.tests.map(test => (
          <div key={test.id} className="flex items-center justify-between text-sm py-1">
            <span className="font-medium text-slate-700">{test.name}</span>
            {test.status === 'Completed' || test.status === 'Verified' ? (
              <span className="text-green-600 font-bold text-xs flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> {test.resultValue ? `Result: ${test.resultValue}` : 'Completed'}
              </span>
            ) : (
              <span className="text-slate-400 text-xs">{test.status}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

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
            {/* Laboratory — from Lab Test master */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <h5 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">
                Laboratory Tests <span className="text-slate-400 font-normal">(from master)</span>
              </h5>
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                {catalogue.length === 0 ? (
                  <p className="text-xs text-slate-400">No lab tests in master. Use custom entry below.</p>
                ) : catalogue.map(t => (
                  <div key={t.testId} className="flex flex-col gap-1">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                        checked={selectedLabs.includes(t.testName)}
                        onChange={() => toggle(selectedLabs, setSelectedLabs, t.testName)}
                      />
                      {t.testName}
                    </label>
                    {selectedLabs.includes(t.testName) && (
                      <input
                        type="text"
                        placeholder="Body Part / Scan Area (optional)"
                        value={testBodyParts[t.testName] || ''}
                        onChange={(e) => setTestBodyParts({ ...testBodyParts, [t.testName]: e.target.value })}
                        className="ml-6 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-primary w-full max-w-[200px]"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="+ Add Custom Lab Test"
                  value={customTest}
                  onChange={e => setCustomTest(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                />
                {customTest.trim() && (
                  <input
                    type="text"
                    placeholder="Body Part / Scan Area (optional)"
                    value={customTestBodyPart}
                    onChange={e => setCustomTestBodyPart(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                  />
                )}
              </div>
            </div>

            {/* Radiology — from Radiology Service master */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <h5 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">
                Radiology / Scans <span className="text-slate-400 font-normal">(from master)</span>
              </h5>
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                {radiologyServices.length === 0 ? (
                  <p className="text-xs text-slate-400">No radiology services in master. Use custom entry below.</p>
                ) : radiologyServices.map(s => (
                  <div key={s.id} className="flex flex-col gap-1">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                        checked={selectedScans.includes(s.serviceName)}
                        onChange={() => toggle(selectedScans, setSelectedScans, s.serviceName)}
                      />
                      {s.serviceName}
                    </label>
                    {selectedScans.includes(s.serviceName) && (
                      <input
                        type="text"
                        placeholder="Body Part / Scan Area (optional)"
                        value={testBodyParts[s.serviceName] || ''}
                        onChange={(e) => setTestBodyParts({ ...testBodyParts, [s.serviceName]: e.target.value })}
                        className="ml-6 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-primary w-full max-w-[200px]"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="+ Add Custom Scan"
                  value={customScan}
                  onChange={e => setCustomScan(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                />
                {customScan.trim() && (
                  <input
                    type="text"
                    placeholder="Body Part / Scan Area (optional)"
                    value={customScanBodyPart}
                    onChange={e => setCustomScanBodyPart(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {placing ? 'Placing…' : 'Place Order'}
            </button>
          </div>
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium">
          <FlaskConical className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          No investigations ordered yet.
        </div>
      ) : (
        <div className="space-y-4">{orders.map(renderOrderCard)}</div>

      )}
    </div>
  );
};
