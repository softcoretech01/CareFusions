<<<<<<< HEAD
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;
const LAB = `${API_BASE}/lab`;
=======
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';
>>>>>>> origin/main

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
  acknowledgedAt?: string;
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
  tests: InvestigationTest[];
  status: 'Pending' | 'Sample Collected' | 'Sample Accepted' | 'Processing' | 'Partial' | 'Completed' | 'Verified';
  age?: string;
  gender?: string;
  mobileNumber?: string;
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
  acknowledgeRadiologyAlert: (testId: string) => void;
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
  // Lab and Radiology share those tables, separated by `category`.
  const refresh = useCallback(async () => {
    if (hasLoaded) return;
    setLoading(true);
    const [o, q, c] = await Promise.allSettled([
      fetch(`${LAB}/orders`).then(r => r.json()),
      fetch(`${LAB}/qc`).then(r => r.json()),
      fetch(`${LAB}/tests`).then(r => r.json()),
    ]);
    if (o.status === 'fulfilled' && Array.isArray(o.value)) setOrders(o.value);
    else console.error('[Investigations] orders load failed', o);
    if (q.status === 'fulfilled' && Array.isArray(q.value)) setQcLogs(q.value);
    if (c.status === 'fulfilled' && Array.isArray(c.value)) setCatalogue(c.value);
    setLoading(false);
    setHasLoaded(true);
  }, []);

<<<<<<< HEAD
  // Client-supplied order/test ids are ignored — the server assigns the
  // authoritative order number and test ids, and fills reference range/unit
  // from the test master.
=======
  const fetchRadiologyOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/radiology/orders`);
      const radOrders = response.data.map((order: any) => ({
        id: order.order_id.toString(),
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
        // Filter out existing radiology orders (mock ones or old fetched ones)
        const nonRadOrders = prev.filter(o => o.category !== 'Radiology');
        return [...nonRadOrders, ...radOrders];
      });
    } catch (error) {
      console.error('Failed to fetch radiology orders', error);
    }
  };

  const fetchRadiologyQCLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/radiology/qc`);
      const radQc = response.data.map((log: any) => ({
        id: log.qc_number,
        date: log.qc_date,
        machineName: log.machine_name,
        testName: log.test_name,
        expectedValue: log.expected_value.toString(),
        actualValue: log.actual_value.toString(),
        deviation: log.deviation > 0 ? `+${log.deviation}` : log.deviation.toString(),
        status: log.status,
        remarks: log.remarks || ''
      }));
      setQcLogs(prev => {
        // Assume QC logs starting with 'R-QC-' are from the radiology backend
        const nonRadQc = prev.filter(q => !q.id.startsWith('R-QC-'));
        return [...nonRadQc, ...radQc];
      });
    } catch (error) {
      console.error('Failed to fetch radiology QC logs', error);
    }
  };

  useEffect(() => {
    fetchRadiologyOrders();
    fetchRadiologyQCLogs();
  }, []);

>>>>>>> origin/main
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

  const getOrdersByPatient = (patientId: string) =>
    orders.filter(o => o.patientId === patientId);

  const addQCLog = (log: QCLog) => {
<<<<<<< HEAD
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
      }}
    >
=======
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
    }
  };

  const acknowledgeRadiologyAlert = async (testId: string) => {
    try {
      await axios.put(`${API_URL}/radiology/orders/tests/${testId}/acknowledge`);
      fetchRadiologyOrders();
    } catch (error) {
      console.error('Failed to acknowledge radiology alert', error);
    }
  };

  const addRadiologyQCLog = async (log: Omit<QCLog, 'id'>) => {
    try {
      await axios.post(`${API_URL}/radiology/qc`, {
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

  const updateTestStatus = (orderId: string, testId: string, status: InvestigationTest['status']) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;

      const updatedTests = order.tests.map(test => {
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
        ...order,
        tests: updatedTests,
        status: updateOrderStatusBasedOnTests(updatedTests)
      };
    }));
  };

  const verifyTest = (orderId: string, testId: string, verifiedBy: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;

      const updatedTests = order.tests.map(test => {
        if (test.id !== testId) return test;
        return {
          ...test,
          status: 'Verified' as const,
          verifiedAt: new Date().toISOString(),
          verifiedBy
        };
      });

      return {
        ...order,
        tests: updatedTests,
        status: updateOrderStatusBasedOnTests(updatedTests)
      };
    }));
  };

  const getOrdersByPatient = (patientId: string) => {
    return orders.filter(o => o.patientId === patientId);
  };

  return (
    <InvestigationContext.Provider value={{ 
      orders, 
      qcLogs,
      addOrder, 
      updateTestResult, 
      updateTestStatus,
      verifyTest,
      getOrdersByPatient,
      addQCLog,
      acknowledgeRadiologyAlert,
      addRadiologyQCLog
    }}>
>>>>>>> origin/main
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
