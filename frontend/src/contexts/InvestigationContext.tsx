import { createContext, useContext, useState, useCallback, useEffect, type ReactNode, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;
const LAB = `${API_BASE}/lab`;

export interface InvestigationTest {
  id: string;
  name: string;
  testId?: number;
  testCode?: string;
  resultValue?: string;
  resultFile?: string;
  status: 'Pending' | 'Sample Collected' | 'Sample Accepted' | 'Processing' | 'Completed' | 'Verified';
  collectedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  normalRange?: string;
  unit?: string;
  isAbnormal?: boolean;
  isCritical?: boolean;
}

export interface InvestigationOrder {
  id: string;
  orderId?: number;
  type: 'OP' | 'IP';
  category: 'Lab' | 'Radiology';
  patientId: string;
  patientName: string;
  orderedBy: string;
  orderedAt: string;
  priority?: string;
  clinicalNotes?: string;
  // Carried on radiology orders, which come from their own backend.
  age?: string;
  gender?: string;
  mobileNumber?: string;
  tests: InvestigationTest[];
  status: 'Pending' | 'Sample Collected' | 'Sample Accepted' | 'Processing' | 'Partial' | 'Completed' | 'Verified';
}

export interface QCLog {
  id: string;
  date: string;
  machineName: string;
  testName: string;
  expectedValue: string;
  actualValue: string;
  deviation: string;
  status: 'Pass' | 'Fail';
  remarks?: string;
}

/** A test from the lab master, for order pickers. */
export interface CatalogueTest {
  testId: number;
  testCode: string;
  testName: string;
  category: string;
  department: string;
  sampleType: string;
  normalRange: string;
  unit: string;
  turnaroundTime: string;
  price: number;
  criticalValueAlert: boolean;
}

interface InvestigationContextType {
  orders: InvestigationOrder[];
  qcLogs: QCLog[];
  catalogue: CatalogueTest[];
  loading: boolean;
  hasLoaded: boolean;
  refresh: () => Promise<void>;
  addOrder: (order: InvestigationOrder) => void;
  updateTestResult: (orderId: string, testId: string, resultValue?: string, resultFile?: string, isCritical?: boolean) => void;
  updateTestStatus: (orderId: string, testId: string, status: InvestigationTest['status']) => void;
  verifyTest: (orderId: string, testId: string, verifiedBy: string) => void;
  acknowledgeAlert: (testId: string, acknowledgedBy?: string) => void;
  getOrdersByPatient: (patientId: string) => InvestigationOrder[];
  addQCLog: (log: QCLog) => void;
  // Radiology keeps its own backend and its own screens. Its orders and QC
  // logs are merged into the same arrays so the shared views see everything.
  fetchRadiologyOrders: () => Promise<void>;
  fetchRadiologyQCLogs: () => Promise<void>;
  acknowledgeRadiologyAlert: (testId: string) => Promise<void>;
  addRadiologyQCLog: (log: Omit<QCLog, 'id'>) => Promise<void>;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export const InvestigationProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<InvestigationOrder[]>([]);
  const [qcLogs, setQcLogs] = useState<QCLog[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Orders, results and QC logs are owned by the backend (hospital.Lab_*).
  // That table can hold Radiology rows too, but Radiology now has its own
  // backend and screens, so this asks for Lab only — leaving both paths
  // unfiltered would list every radiology order twice.
  const refresh = useCallback(async () => {
    if (hasLoaded) return;
    setLoading(true);
    const [o, q, c] = await Promise.allSettled([
      fetch(`${LAB}/orders?category=Lab`).then(r => r.json()),
      fetch(`${LAB}/qc?category=Lab`).then(r => r.json()),
      fetch(`${LAB}/tests`).then(r => r.json()),
    ]);
    // Radiology loads in parallel from its own backend and writes into these
    // same arrays, so replace only the rows this call owns — assigning the
    // whole array would drop whichever request happened to finish first.
    if (o.status === 'fulfilled' && Array.isArray(o.value)) {
      setOrders(prev => [...prev.filter(x => x.category === 'Radiology'), ...o.value]);
    } else {
      console.error('[Investigations] orders load failed', o);
    }
    if (q.status === 'fulfilled' && Array.isArray(q.value)) {
      setQcLogs(prev => [...prev.filter(x => x.id.startsWith('R-QC-')), ...q.value]);
    }
    if (c.status === 'fulfilled' && Array.isArray(c.value)) setCatalogue(c.value);
    setLoading(false);
    setHasLoaded(true);
  }, []);

  // Client-supplied order/test ids are ignored — the server assigns the
  // authoritative order number and test ids, and fills reference range/unit
  // from the test master.
  const addOrder = (order: InvestigationOrder) => {
    (async () => {
      try {
        const res = await fetch(`${LAB}/orders`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: order.category,
            visitType: order.type,
            uhid: order.patientId,
            patientName: order.patientName,
            orderedBy: order.orderedBy || null,
            priority: order.priority || 'Routine',
            clinicalNotes: order.clinicalNotes || null,
            tests: order.tests.map(t => ({
              testId: t.testId ?? null,
              testCode: t.testCode ?? null,
              testName: t.name,
              normalRange: t.normalRange ?? null,
              unit: t.unit ?? null,
            })),
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        await refresh();
      } catch (e) {
        console.error('[Investigations] create order failed', e);
      }
    })();
  };

  // Abnormal/critical flags are derived server-side from each test's own
  // reference range, so the client no longer guesses them.
  const updateTestResult = (_orderId: string, testId: string, resultValue?: string, resultFile?: string) => {
    (async () => {
      try {
        await fetch(`${LAB}/orders/tests/${testId}/result`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resultValue: resultValue ?? null, resultFile: resultFile ?? null }),
        });
        await refresh();
      } catch (e) { console.error('[Investigations] save result failed', e); }
    })();
  };

  const updateTestStatus = (_orderId: string, testId: string, status: InvestigationTest['status']) => {
    (async () => {
      try {
        await fetch(`${LAB}/orders/tests/${testId}/status`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        await refresh();
      } catch (e) { console.error('[Investigations] update status failed', e); }
    })();
  };

  const verifyTest = (_orderId: string, testId: string, verifiedBy: string) => {
    (async () => {
      try {
        await fetch(`${LAB}/orders/tests/${testId}/verify`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verifiedBy }),
        });
        await refresh();
      } catch (e) { console.error('[Investigations] verify failed', e); }
    })();
  };

  // Critical-alert acknowledgement is persisted now, instead of being
  // component state that vanished on refresh.
  const acknowledgeAlert = (testId: string, acknowledgedBy = 'Admin') => {
    (async () => {
      try {
        await fetch(`${LAB}/orders/tests/${testId}/acknowledge`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acknowledgedBy }),
        });
        await refresh();
      } catch (e) { console.error('[Investigations] acknowledge failed', e); }
    })();
  };

  // ── Radiology ──────────────────────────────────────────────
  // Radiology has its own backend (added on main alongside the Radiology
  // screens) with snake_case payloads. Its rows are folded into the same
  // `orders` / `qcLogs` arrays, replacing any radiology rows already there,
  // so the shared Investigations views show lab and radiology together.
  const fetchRadiologyOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/radiology/orders`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const radOrders: InvestigationOrder[] = data.map((order: any) => ({
        id: String(order.order_id),
        type: order.visit_type,
        category: order.category,
        patientId: order.uhid,
        patientName: order.patient_name,
        orderedBy: order.ordered_by || 'Unknown',
        orderedAt: order.ordered_at,
        status: order.status,
        age: order.age,
        gender: order.gender,
        mobileNumber: order.mobile_number,
        tests: (order.tests || []).map((test: any) => ({
          id: `TEST-${test.order_test_id}`,
          name: test.test_name,
          status: test.status,
          resultValue: test.result_value || '',
          resultFile: test.result_file || '',
          isCritical: test.is_critical,
          completedAt: test.completed_at,
          verifiedAt: test.verified_at,
          verifiedBy: test.verified_by,
          acknowledgedAt: test.acknowledged_at,
        })),
      }));
      setOrders(prev => [...prev.filter(o => o.category !== 'Radiology'), ...radOrders]);
    } catch (e) {
      console.error('[Investigations] radiology orders load failed', e);
    }
  }, []);

  const fetchLabOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/lab/orders`);
      const labOrders = response.data.map((order: any) => ({
        id: order.order_number,
        type: order.visit_type,
        category: order.category,
        patientId: order.uhid,
        patientName: order.patient_name,
        orderedBy: order.ordered_by || 'Unknown',
        orderedAt: order.ordered_at,
        status: order.status,
        age: order.age,
        gender: order.gender,
        mobileNumber: order.mobile_number,
        tests: order.tests.map((test: any) => ({
          id: `TEST-${test.order_test_id}`,
          name: test.test_name,
          status: test.status,
          resultValue: test.result_value || '',
          resultFile: test.result_file || '',
          isCritical: test.is_critical,
          completedAt: test.completed_at,
          verifiedAt: test.verified_at,
          verifiedBy: test.verified_by,
          acknowledgedAt: test.acknowledged_at
        }))
      }));
      setOrders(prev => {
        // Filter out existing lab orders (mock ones or old fetched ones)
        const nonLabOrders = prev.filter(o => o.category !== 'Lab');
        return [...nonLabOrders, ...labOrders];
      });
    } catch (error) {
      console.error('Failed to fetch lab orders', error);
    }
  };

  const fetchRadiologyQCLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/radiology/qc`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const radQc: QCLog[] = data.map((log: any) => ({
        id: log.qc_number,
        date: log.qc_date,
        machineName: log.machine_name,
        testName: log.test_name,
        expectedValue: String(log.expected_value),
        actualValue: String(log.actual_value),
        deviation: log.deviation > 0 ? `+${log.deviation}` : String(log.deviation),
        status: log.status,
        remarks: log.remarks || '',
      }));
      // Radiology QC numbers are prefixed R-QC-, which is how they are told
      // apart from the lab's own QC logs in the shared array.
      setQcLogs(prev => [...prev.filter(q => !q.id.startsWith('R-QC-')), ...radQc]);
    } catch (e) {
      console.error('[Investigations] radiology QC load failed', e);
    }
  }, []);

  useEffect(() => {
    fetchRadiologyOrders();
    fetchRadiologyQCLogs();
    fetchLabOrders();
  }, []);

  const addOrder = async (order: InvestigationOrder) => {
    setOrders(prev => [order, ...prev]);
    
    if (order.category === 'Lab') {
      try {
        await axios.post(`${API_URL}/lab/orders`, {
          category: order.category,
          visit_type: order.type,
          uhid: order.patientId,
          patient_name: order.patientName,
          ordered_by: order.orderedBy,
          priority: 'Routine',
          tests: order.tests.map(t => ({
            testName: t.name,
            testCode: t.name
          }))
        });
        fetchLabOrders();
      } catch (error) {
        console.error('Failed to create lab order', error);
      }
    } else if (order.category === 'Radiology') {
      try {
        await axios.post(`${API_URL}/radiology/orders`, {
          category: order.category,
          visit_type: order.type,
          uhid: order.patientId,
          patient_name: order.patientName,
          ordered_by: order.orderedBy,
          priority: 'Routine',
          tests: order.tests.map(t => ({
            testName: t.name,
            testCode: t.name
          }))
        });
        fetchRadiologyOrders();
      } catch (error) {
        console.error('Failed to create radiology order', error);
      }
    }
  };

  const addQCLog = (log: QCLog) => {
    setQcLogs(prev => [log, ...prev]);
  };

  const updateOrderStatusBasedOnTests = (updatedTests: InvestigationTest[]): InvestigationOrder['status'] => {
    const allCompleted = updatedTests.every(t => t.status === 'Completed' || t.status === 'Verified');
    const allVerified = updatedTests.every(t => t.status === 'Verified');
    const someCompleted = updatedTests.some(t => t.status === 'Completed' || t.status === 'Verified');
    
    if (allVerified) return 'Verified';
    if (allCompleted) return 'Completed';
    if (someCompleted) return 'Partial';
    
    const allCollected = updatedTests.every(t => t.status === 'Sample Collected' || t.status === 'Sample Accepted' || t.status === 'Processing');
    if (allCollected) return 'Sample Collected';
    
    return 'Pending';
  };

  const updateTestResult = async (orderId: string, testId: string, resultValue?: string, resultFile?: string, isCritical?: boolean) => {
    const order = orders.find(o => o.id === orderId);
    
    // Optimistic UI Update
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;

      const updatedTests = o.tests.map(test => {
        if (test.id !== testId) return test;
        return {
          ...test,
          resultValue,
          resultFile,
          isCritical,
          status: 'Completed' as const,
          completedAt: new Date().toISOString()
        };
      });

      return {
        ...o,
        tests: updatedTests,
        status: updateOrderStatusBasedOnTests(updatedTests)
      };
    }));

    if (order?.category === 'Radiology') {
      try {
        await axios.put(`${API_URL}/radiology/orders/${orderId}/tests/${testId}`, {
          result_value: resultValue,
          result_file: resultFile,
          is_critical: isCritical
        });
        // re-fetch to ensure sync with backend
        fetchRadiologyOrders();
      } catch (error) {
        console.error('Failed to update radiology test', error);
      }
    } else if (order?.category === 'Lab') {
      try {
        await axios.put(`${API_URL}/lab/orders/tests/${testId}/result`, {
          result_value: resultValue,
          result_file: resultFile,
          is_critical: isCritical
        });
        fetchLabOrders();
      } catch (error) {
        console.error('Failed to update lab test result', error);
      }
    }
  };

  const acknowledgeRadiologyAlert = async (testId: string) => {
    try {
      const res = await fetch(`${API_BASE}/radiology/orders/tests/${testId}/acknowledge`, { method: 'PUT' });
      if (!res.ok) throw new Error(await res.text());
      await fetchRadiologyOrders();
    } catch (e) {
      console.error('[Investigations] radiology acknowledge failed', e);
    }
  };

  const addRadiologyQCLog = async (log: Omit<QCLog, 'id'>) => {
    const res = await fetch(`${API_BASE}/radiology/qc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qc_number: `R-QC-${Math.floor(1000 + Math.random() * 9000)}`,
        qc_date: log.date,
        machine_name: log.machineName,
        test_name: log.testName,
        expected_value: parseFloat(log.expectedValue),
        actual_value: parseFloat(log.actualValue),
        deviation: parseFloat(log.deviation),
        status: log.status,
        remarks: log.remarks
      });
      fetchRadiologyQCLogs();
    } catch (error) {
      console.error('Failed to add radiology QC log', error);
      throw error;
    }
  };

  const updateTestStatus = async (orderId: string, testId: string, status: InvestigationTest['status']) => {
    const order = orders.find(o => o.id === orderId);

    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;

      const updatedTests = o.tests.map(test => {
        if (test.id !== testId) return test;
        const now = new Date().toISOString();
        return {
          ...test,
          status,
          collectedAt: status === 'Sample Collected' ? now : test.collectedAt,
          acceptedAt: status === 'Sample Accepted' ? now : test.acceptedAt,
        };
      });

      return {
        ...o,
        tests: updatedTests,
        status: updateOrderStatusBasedOnTests(updatedTests)
      };
    }));

    if (order?.category === 'Lab') {
      try {
        await axios.put(`${API_URL}/lab/orders/tests/${testId}/status`, {
          status: status
        });
        fetchLabOrders();
      } catch (error) {
        console.error('Failed to update lab test status', error);
      }
    }
  };

  const verifyTest = async (orderId: string, testId: string, verifiedBy: string) => {
    const order = orders.find(o => o.id === orderId);

    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;

      const updatedTests = o.tests.map(test => {
        if (test.id !== testId) return test;
        return {
          ...test,
          status: 'Verified' as const,
          verifiedAt: new Date().toISOString(),
          verifiedBy
        };
      });

      return {
        ...o,
        tests: updatedTests,
        status: updateOrderStatusBasedOnTests(updatedTests)
      };
    }));

    if (order?.category === 'Lab') {
      try {
        await axios.put(`${API_URL}/lab/orders/tests/${testId}/verify`);
        fetchLabOrders();
      } catch (error) {
        console.error('Failed to verify lab test', error);
      }
    }
  };

  const addQCLog = (log: QCLog) => {
    (async () => {
      try {
        await fetch(`${LAB}/qc`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qcDate: log.date,
            machineName: log.machineName,
            testName: log.testName,
            expectedValue: parseFloat(log.expectedValue) || 0,
            actualValue: parseFloat(log.actualValue) || 0,
            remarks: log.remarks || null,
          }),
        });
        await refresh();
      } catch (e) { console.error('[Investigations] save QC failed', e); }
    })();
  };

  return (
    <InvestigationContext.Provider
      value={{
        orders, qcLogs, catalogue, loading, hasLoaded, refresh,
        addOrder, updateTestResult, updateTestStatus, verifyTest, acknowledgeAlert,
        getOrdersByPatient, addQCLog,
        fetchRadiologyOrders, fetchRadiologyQCLogs, acknowledgeRadiologyAlert, addRadiologyQCLog,
      }}
    >
      {children}
    </InvestigationContext.Provider>
  );
};

export const useInvestigations = () => {
  const context = useContext(InvestigationContext);
  if (context === undefined) {
    throw new Error('useInvestigations must be used within an InvestigationProvider');
  }

  // Depend on the values actually used, not the context object: the provider

  // builds a new object every render, so [context] re-fired this effect on each

  // one. The ref stops a second request while the first is still in flight —

  // hasLoaded only flips once the fetches resolve, so it cannot guard that gap.

  const { hasLoaded, loading, refresh } = context as any;

  const requested = useRef(false);

  useEffect(() => {

    if (hasLoaded || loading || requested.current) return;

    requested.current = true;

    Promise.resolve(refresh?.()).finally(() => { requested.current = false; });

  }, [hasLoaded, loading, refresh]);

  return context;
};
