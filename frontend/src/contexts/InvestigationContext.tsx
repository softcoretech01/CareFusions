import { createContext, useContext, useState, useCallback, useEffect, type ReactNode, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL as string;
const LAB = `${API_BASE}/lab`;

export interface InvestigationTest {
  id: string;
  name: string;
  testId?: number;
  testCode?: string;
  bodyPart?: string;
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
  /** Resolves true when the order reached the backend, false when it did not. */
  addOrder: (order: InvestigationOrder) => Promise<boolean>;
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
      const labOrders = o.value.map((order: any) => ({
        id: order.order_number || order.id,
        type: order.visit_type || order.type,
        category: order.category,
        patientId: order.uhid || order.patientId,
        patientName: order.patient_name || order.patientName,
        orderedBy: order.ordered_by || order.orderedBy || 'Unknown',
        orderedAt: order.ordered_at || order.orderedAt,
        status: order.status,
        age: order.age,
        gender: order.gender,
        mobileNumber: order.mobile_number || order.mobileNumber,
        tests: (order.tests || []).map((test: any) => ({
          id: test.order_test_id ? `TEST-${test.order_test_id}` : (test.id || ''),
          name: test.test_name || test.name,
          status: test.status,
          bodyPart: test.body_part || test.bodyPart || '',
          resultValue: test.result_value || test.resultValue || '',
          resultFile: test.result_file || test.resultFile || '',
          isCritical: test.is_critical || test.isCritical,
          completedAt: test.completed_at || test.completedAt,
          verifiedAt: test.verified_at || test.verifiedAt,
          verifiedBy: test.verified_by || test.verifiedBy,
          acknowledgedAt: test.acknowledged_at || test.acknowledgedAt
        }))
      }));
      setOrders(prev => [...prev.filter(x => x.category === 'Radiology'), ...labOrders]);
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

  // Abnormal/critical flags are derived server-side from each test's own
  // reference range, so the client no longer guesses them.
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
          bodyPart: test.body_part || '',   // ← carry the specific area/note from the doctor
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


  // Lab orders are loaded by refresh() (called in the mount effect below), so a
  // separate fetchLabOrders is redundant — removed to keep one source of truth.

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
  };

  useEffect(() => {
    fetchRadiologyOrders();
    fetchRadiologyQCLogs();
    refresh();
  }, []);

  /**
   * Place an investigation order.
   *
   * Returns false if the backend rejected it. This used to be fire-and-forget:
   * the optimistic row was added, the POST failure was swallowed by a
   * console.error, and the caller reported success — so a doctor could finalise
   * a visit believing the lab had the order when nothing had been sent. The
   * optimistic row is now rolled back and the caller is told.
   */
  const addOrder = async (order: InvestigationOrder): Promise<boolean> => {
    setOrders(prev => [order, ...prev]);
    const rollback = () => setOrders(prev => prev.filter(o => o.id !== order.id));

    if (order.category === 'Lab') {
      try {
        await axios.post(`${API_BASE}/lab/orders`, {
          category: order.category,
          visitType: order.type,
          uhid: order.patientId,
          patientName: order.patientName,
          orderedBy: order.orderedBy,
          priority: 'Routine',
          // testId is the master link; testCode must be the real code, not the
          // test name. Sending the name as the code meant SpLabOrder could not
          // find the master row, so NormalRange/Unit arrived empty and results
          // were verified against nothing.
          tests: order.tests.map(t => ({
            testId: t.testId ?? null,
            testName: t.name,
            testCode: t.testCode ?? t.name,
            bodyPart: t.bodyPart || null,
          }))
        });
        refresh();
        return true;
      } catch (error) {
        console.error('Failed to create lab order', error);
        rollback();
        return false;
      }
    } else if (order.category === 'Radiology') {
      try {
        await axios.post(`${API_BASE}/radiology/orders`, {
          category: order.category,
          visit_type: order.type,
          uhid: order.patientId,
          patient_name: order.patientName,
          ordered_by: order.orderedBy,
          priority: 'Routine',
          tests: order.tests.map(t => ({
            testName: t.name,
            testCode: t.testCode || t.name,
            body_part: t.bodyPart || null,   // ← pass the specific scan area the doctor entered
          }))
        });
        fetchRadiologyOrders();
        return true;
      } catch (error) {
        console.error('Failed to create radiology order', error);
        rollback();
        return false;
      }
    }
    return true;
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
        await axios.put(`${API_BASE}/radiology/orders/${orderId}/tests/${testId}`, {
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
        await axios.put(`${API_BASE}/lab/orders/tests/${testId}/result`, {
          resultValue: resultValue,
          resultFile: resultFile
        });
        refresh();
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
    try {
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
        })
      });
      if (!res.ok) throw new Error(`radiology QC save → ${res.status}`);
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
        await axios.patch(`${API_BASE}/lab/orders/tests/${testId}/status`, {
          status: status
        });
        refresh();
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
        await axios.post(`${API_BASE}/lab/orders/tests/${testId}/verify`, {
          verifiedBy: verifiedBy
        });
        refresh();
      } catch (error) {
        console.error('Failed to verify lab test', error);
      }
    }
  };

  const getOrdersByPatient = (patientId: string) => {
    return orders.filter(o => o.patientId === patientId);
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
