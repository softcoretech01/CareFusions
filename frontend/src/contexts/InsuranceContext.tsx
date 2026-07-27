import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Claim = {
  id: string;
  patient: string;
  uhid: string;
  insurer: string;
  diagnosis: string;
  amount: number;
  balance: number;
  date: string;
  status: string;
};

type Appeal = {
  id: string;
  claimId: string;
  patient: string;
  uhid: string;
  insurer: string;
  amount: number;
  denialReason: string;
  date: string;
  status: string;
};

type PreAuth = {
  id: string;
  patient: string;
  uhid: string;
  insurer: string;
  amount: number;
  date: string;
  status: string;
};

type Settlement = {
  id: string;
  claimId: string;
  patient: string;
  insurer: string;
  billedAmt: number;
  approvedAmt: number;
  tds: number;
  date: string;
  status: string;
};

interface InsuranceContextType {
  claims: Claim[];
  appeals: Appeal[];
  settlements: Settlement[];
  preAuths: PreAuth[];
  addClaim: (claim: Claim) => void;
  markClaimDenied: (claimId: string) => void;
  markClaimSettled: (claimId: string, approvedAmt: number) => void;
  fileAppeal: (appealId: string) => void;
  updatePreAuthStatus: (id: string, status: string) => void;
  deleteClaim: (id: string) => void;
  updateClaim: (claim: Claim) => void;
  deletePreAuth: (id: string) => void;
  updatePreAuth: (preAuth: PreAuth) => void;
  resolveAppeal: (appealId: string, approvedAmt: number) => void;
  reconcileSettlement: (settlementId: string) => void;
  addPreAuth: (preAuth: PreAuth) => void;
}

const InsuranceContext = createContext<InsuranceContextType | undefined>(undefined);

export const InsuranceProvider = ({ children }: { children: ReactNode }) => {
  const [claims, setClaims] = useState<Claim[]>(() => {
    const saved = localStorage.getItem('insurance_claims_v2');
    return saved ? JSON.parse(saved) : [
      { id: 'CLM-2026-001', patient: 'Priya Sharma', uhid: 'UHID-2026-0006', insurer: 'Star Health', diagnosis: 'Viral Fever', amount: 8700, balance: 0, date: 'Jul 21, 2026', status: 'Settled' },
      { id: 'CLM-2026-002', patient: 'Rahul Verma', uhid: 'UHID-2026-0007', insurer: 'HDFC ERGO', diagnosis: 'Acute MI', amount: 20300, balance: 20300, date: 'Jul 20, 2026', status: 'Submitted' },
      { id: 'CLM-2026-003', patient: 'Sneha Gupta', uhid: 'UHID-2026-0008', insurer: 'Care Health', diagnosis: 'Observation', amount: 11600, balance: 11600, date: 'Jul 22, 2026', status: 'Denied' },
      { id: 'CLM-2026-004', patient: 'John Doe', uhid: 'UHID-2026-0001', insurer: 'Star Health', diagnosis: 'Consultation', amount: 1500, balance: 1500, date: 'Jul 23, 2026', status: 'In Process' },
    ];
  });

  const [appeals, setAppeals] = useState<Appeal[]>(() => {
    const saved = localStorage.getItem('insurance_appeals_v2');
    return saved ? JSON.parse(saved) : [
      { id: 'APP-2026-001', claimId: 'CLM-2026-003', patient: 'Sneha Gupta', uhid: 'UHID-2026-0008', insurer: 'Care Health', amount: 11600, denialReason: 'Non-disclosure of pre-existing condition', date: 'Jul 23, 2026', status: 'Appealing' },
    ];
  });

  const [settlements, setSettlements] = useState<Settlement[]>(() => {
    const saved = localStorage.getItem('insurance_settlements_v2');
    return saved ? JSON.parse(saved) : [
      { id: 'SET-2026-001', claimId: 'CLM-2026-001', patient: 'Priya Sharma', insurer: 'Star Health', billedAmt: 8700, approvedAmt: 8700, tds: 870, date: 'Jul 21, 2026', status: 'Reconciled' },
    ];
  });

  const [preAuths, setPreAuths] = useState<PreAuth[]>(() => {
    const saved = localStorage.getItem('insurance_preauths_v2');
    return saved ? JSON.parse(saved) : [
      { id: 'AUTH-2026-001', patient: 'Amit Patel', uhid: 'UHID-2026-0009', insurer: 'HDFC ERGO', amount: 14500, date: 'Jul 19, 2026', status: 'Approved' },
      { id: 'AUTH-2026-002', patient: 'Anjali Desai', uhid: 'UHID-2026-0010', insurer: 'Care Health', amount: 29000, date: 'Jul 15, 2026', status: 'Pending' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('insurance_claims_v2', JSON.stringify(claims));
  }, [claims]);

  useEffect(() => {
    localStorage.setItem('insurance_appeals_v2', JSON.stringify(appeals));
  }, [appeals]);

  useEffect(() => {
    localStorage.setItem('insurance_settlements_v2', JSON.stringify(settlements));
  }, [settlements]);

  useEffect(() => {
    localStorage.setItem('insurance_preauths_v2', JSON.stringify(preAuths));
  }, [preAuths]);

  const addClaim = (claim: Claim) => {
    setClaims([claim, ...claims]);
  };

  const markClaimDenied = (claimId: string) => {
    setClaims(claims.map(c => c.id === claimId ? { ...c, status: 'Denied' } : c));
    const claim = claims.find(c => c.id === claimId);
    if (claim && !appeals.find(a => a.claimId === claimId)) {
      const newAppeal = {
        id: `APP-${Math.floor(10000 + Math.random() * 90000)}`,
        claimId: claim.id,
        patient: claim.patient,
        uhid: claim.uhid,
        insurer: claim.insurer,
        amount: claim.amount,
        denialReason: 'Pending review of medical necessity (Simulated)',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Denied'
      };
      setAppeals([newAppeal, ...appeals]);
    }
  };

  const markClaimSettled = (claimId: string, approvedAmt: number) => {
    setClaims(claims.map(c => c.id === claimId ? { ...c, status: 'Settled', balance: c.amount - approvedAmt } : c));
    const claim = claims.find(c => c.id === claimId);
    if (claim && !settlements.find(s => s.claimId === claimId)) {
      const newSettlement = {
        id: `SET-${Math.floor(1000 + Math.random() * 9000)}`,
        claimId: claim.id,
        patient: claim.patient,
        insurer: claim.insurer,
        billedAmt: claim.amount,
        approvedAmt: approvedAmt,
        tds: approvedAmt * 0.1, // 10% TDS
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Pending'
      };
      setSettlements([newSettlement, ...settlements]);
    }
  };

  const fileAppeal = (appealId: string) => {
    setAppeals(appeals.map(a => a.id === appealId ? { ...a, status: 'Appealing' } : a));
  };

  const resolveAppeal = (appealId: string, approvedAmt: number) => {
    setAppeals(appeals.map(a => a.id === appealId ? { ...a, status: 'Resolved' } : a));
    const appeal = appeals.find(a => a.id === appealId);
    if (appeal) {
      markClaimSettled(appeal.claimId, approvedAmt);
    }
  };

  const reconcileSettlement = (settlementId: string) => {
    setSettlements(settlements.map(s => s.id === settlementId ? { ...s, status: 'Reconciled' } : s));
  };

  const addPreAuth = (preAuth: PreAuth) => {
    setPreAuths([preAuth, ...preAuths]);
  };

  const updatePreAuthStatus = (id: string, status: string) => {
    setPreAuths(preAuths.map(p => p.id === id ? { ...p, status } : p));
  };

  const deleteClaim = (id: string) => {
    setClaims(claims.filter(c => c.id !== id));
  };

  const updateClaim = (updatedClaim: Claim) => {
    setClaims(claims.map(c => c.id === updatedClaim.id ? updatedClaim : c));
  };

  const deletePreAuth = (id: string) => {
    setPreAuths(preAuths.filter(p => p.id !== id));
  };

  const updatePreAuth = (updatedPreAuth: PreAuth) => {
    setPreAuths(preAuths.map(p => p.id === updatedPreAuth.id ? updatedPreAuth : p));
  };

  return (
    <InsuranceContext.Provider value={{
      claims, appeals, settlements, preAuths, addClaim, markClaimDenied, markClaimSettled, fileAppeal, resolveAppeal, reconcileSettlement, addPreAuth, updatePreAuthStatus, deleteClaim, updateClaim, deletePreAuth, updatePreAuth
    }}>
      {children}
    </InsuranceContext.Provider>
  );
};

export const useInsurance = () => {
  const context = useContext(InsuranceContext);
  if (!context) {
    throw new Error('useInsurance must be used within an InsuranceProvider');
  }
  return context;
};
