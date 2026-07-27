import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface InvestigationTest {
  id: string;
  name: string;
  resultValue?: string;
  resultFile?: string; // Mock filename or base64
  status: 'Pending' | 'Sample Collected' | 'Sample Accepted' | 'Processing' | 'Completed' | 'Verified';
  collectedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  normalRange?: string;
  unit?: string;
  isCritical?: boolean;
}

export interface InvestigationOrder {
  id: string;
  type: 'OP' | 'IP';
  category: 'Lab' | 'Radiology';
  patientId: string;
  patientName: string;
  orderedBy: string;
  orderedAt: string;
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

interface InvestigationContextType {
  orders: InvestigationOrder[];
  qcLogs: QCLog[];
  addOrder: (order: InvestigationOrder) => void;
  updateTestResult: (orderId: string, testId: string, resultValue?: string, resultFile?: string, isCritical?: boolean) => void;
  updateTestStatus: (orderId: string, testId: string, status: InvestigationTest['status']) => void;
  verifyTest: (orderId: string, testId: string, verifiedBy: string) => void;
  getOrdersByPatient: (patientId: string) => InvestigationOrder[];
  addQCLog: (log: QCLog) => void;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export const InvestigationProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<InvestigationOrder[]>(() => {
    const saved = localStorage.getItem('investigationOrders_v2');
    if (saved) return JSON.parse(saved);
    return [
      {
      id: 'ORD-2023-001',
      type: 'OP',
      category: 'Lab',
      patientId: 'UHID-2026-0001',
      patientName: 'John Doe',
      orderedBy: 'Dr. Smith',
      orderedAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
      status: 'Pending',
      tests: [
        {
          id: 'TEST-001',
          name: 'Complete Blood Count (CBC)',
          status: 'Pending',
        },
        {
          id: 'TEST-002',
          name: 'Lipid Profile',
          status: 'Pending',
        }
      ]
    },
    {
      id: 'ORD-2023-002',
      type: 'IP',
      category: 'Lab',
      patientId: 'UHID-2026-0002',
      patientName: 'Jane Smith',
      orderedBy: 'Dr. Adams',
      orderedAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
      status: 'Partial',
      tests: [
        {
          id: 'TEST-003',
          name: 'Hemoglobin',
          status: 'Completed',
          resultValue: '6.5',
          isCritical: true,
          completedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
          normalRange: '12.0 - 15.5'
        },
        {
          id: 'TEST-004',
          name: 'Fasting Blood Sugar',
          status: 'Sample Accepted',
          acceptedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        }
      ]
    },
    {
      id: 'ORD-2023-003',
      type: 'OP',
      category: 'Lab',
      patientId: 'UHID-2026-0003',
      patientName: 'Robert Johnson',
      orderedBy: 'Dr. Lee',
      orderedAt: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
      status: 'Verified',
      tests: [
        {
          id: 'TEST-005',
          name: 'Serum Creatinine',
          status: 'Verified',
          resultValue: '1.1',
          completedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          verifiedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          verifiedBy: 'Dr. Pathologist'
        }
      ]
    },
    {
      id: 'ORD-2026-004',
      type: 'IP',
      category: 'Lab',
      patientId: 'UHID-2026-0006',
      patientName: 'Priya Sharma',
      orderedBy: 'Dr. Sarah Jenkins',
      orderedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      status: 'Completed',
      tests: [
        {
          id: 'TEST-006',
          name: 'Complete Blood Count (CBC)',
          status: 'Completed',
          resultValue: 'Normal',
          completedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        },
        {
          id: 'TEST-007',
          name: 'Dengue NS1 Antigen',
          status: 'Completed',
          resultValue: 'Negative',
          completedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        }
      ]
    },
    {
      id: 'ORD-2026-005',
      type: 'IP',
      category: 'Lab',
      patientId: 'UHID-2026-0007',
      patientName: 'Rahul Verma',
      orderedBy: 'Dr. Michael Chen',
      orderedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      status: 'Partial',
      tests: [
        {
          id: 'TEST-008',
          name: 'Troponin I',
          status: 'Completed',
          resultValue: '3.8',
          isCritical: true,
          completedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
          normalRange: '0.0 - 0.4'
        },
        {
          id: 'TEST-009',
          name: 'ECG',
          status: 'Pending',
        }
      ]
    },
    {
      id: 'ORD-2026-006',
      type: 'IP',
      category: 'Radiology',
      patientId: 'UHID-2026-0008',
      patientName: 'Sneha Gupta',
      orderedBy: 'Dr. Emily Brown',
      orderedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      status: 'Verified',
      tests: [
        {
          id: 'TEST-010',
          name: 'Ultrasound Abdomen',
          status: 'Verified',
          resultValue: 'No abnormality detected',
          completedAt: new Date(Date.now() - 3600000 * 36).toISOString(),
          verifiedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          verifiedBy: 'Dr. Radiologist'
        }
      ]
    }
  ];
  });
  const [qcLogs, setQcLogs] = useState<QCLog[]>([
    {
      id: 'QC-001',
      date: new Date().toISOString().split('T')[0],
      machineName: 'Sysmex XN-1000',
      testName: 'Hemoglobin',
      expectedValue: '14.0',
      actualValue: '14.1',
      deviation: '+0.1',
      status: 'Pass',
      remarks: 'Daily control run'
    }
  ]);

  useEffect(() => {
    localStorage.setItem('investigationOrders_v2', JSON.stringify(orders));

  }, [orders]);

  const addOrder = (order: InvestigationOrder) => {
    setOrders(prev => [order, ...prev]);
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

  const updateTestResult = (orderId: string, testId: string, resultValue?: string, resultFile?: string, isCritical?: boolean) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;

      const updatedTests = order.tests.map(test => {
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
        ...order,
        tests: updatedTests,
        status: updateOrderStatusBasedOnTests(updatedTests)
      };
    }));
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
      addQCLog
    }}>
      {children}
    </InvestigationContext.Provider>
  );
};

export const useInvestigations = () => {
  const context = useContext(InvestigationContext);
  if (context === undefined) {
    throw new Error('useInvestigations must be used within an InvestigationProvider');
  }
  return context;
};
