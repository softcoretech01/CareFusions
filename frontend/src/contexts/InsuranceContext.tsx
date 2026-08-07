import { createContext, useContext, useState, useCallback, useEffect, type ReactNode, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;
const INS = `${API_BASE}/insurance`;

type Claim = {
  id: string;            // ClaimNumber, e.g. CLM-20260001
  claimId?: number;      // server PK
  patient: string;
  uhid: string;
  insurer: string;
  providerId?: number;
  preAuthId?: number;
  admissionId?: number;
  diagnosis: string;
  amount: number;        // total billed
  preAuth?: number;
  claimedAmount?: number;
  approvedAmount?: number;
  balance: number;
  date: string;
  status: string;
};

type Appeal = {
  id: string;
  appealId?: number;
  claimId: string;
  patient: string;
  uhid: string;
  insurer: string;
  amount: number;
  denialReason: string;
  denialCode?: string;
  appealReason?: string;
  date: string;
  status: string;
};

type PreAuth = {
  id: string;
  preAuthId?: number;
  patient: string;
  uhid: string;
  insurer: string;
  providerId?: number;
  diagnosis?: string;
  amount: number;
  approvedAmount?: number;
  decisionReason?: string;
  date: string;
  status: string;
};

type Settlement = {
  id: string;
  settlementId?: number;
  claimId: string;
  patient: string;
  insurer: string;
  billedAmt: number;
  approvedAmt: number;
  tds: number;
  netReceivable?: number;
  date: string;
  status: string;
};

export type Provider = {
  providerId: number;
  providerCode: string;
  providerName: string;
  cashlessFacility: boolean;
  preAuthRequired: boolean;
  claimSettlementDays: number | null;
};

export type Policy = {
  policyId: number;
  uhid: string;
  patientName: string;
  policyNumber: string;
  providerId?: number | null;
  insurerName: string;
  planName: string;
  status: string;
  validUntil: string | null;
  sumInsured: number;
  balanceAmount: number;
  networkHospital: boolean;
  copayPercentage: number;
  deductible: number;
};

interface InsuranceContextType {
  claims: Claim[];
  appeals: Appeal[];
  settlements: Settlement[];
  preAuths: PreAuth[];
  providers: Provider[];
  policies: Policy[];
  loading: boolean;
  hasLoaded: boolean;
  refresh: () => Promise<void>;
  addClaim: (claim: Claim) => void;
  markClaimDenied: (claimId: string, reason?: string) => void;
  markClaimSettled: (claimId: string, approvedAmt: number) => void;
  fileAppeal: (appealId: string, appealReason?: string) => void;
  updatePreAuthStatus: (id: string, status: string, approvedAmount?: number, decisionReason?: string) => void;
  deleteClaim: (id: string) => void;
  updateClaim: (claim: Claim) => void;
  deletePreAuth: (id: string) => void;
  updatePreAuth: (preAuth: PreAuth) => void;
  resolveAppeal: (appealId: string, approvedAmt: number) => void;
  reconcileSettlement: (settlementId: string) => void;
  addPreAuth: (preAuth: PreAuth) => void;
  savePolicy: (policy: Partial<Policy> & {
    uhid: string; patientName: string; policyNumber: string; insurerName: string;
  }) => Promise<boolean>;
  searchPolicy: (query: string) => Promise<Policy | null>;
}

const InsuranceContext = createContext<InsuranceContextType | undefined>(undefined);

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const InsuranceProvider = ({ children }: { children: ReactNode }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [preAuths, setPreAuths] = useState<PreAuth[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // All insurance records are owned by the backend (hospital.Ins_*). Denying a
  // claim raises its appeal and settling one raises its settlement, server-side.
  const refresh = useCallback(async () => {
    setLoading(true);
    const [c, a, s, p, pr, po] = await Promise.allSettled([
      fetch(`${INS}/claims`).then(r => r.json()),
      fetch(`${INS}/appeals`).then(r => r.json()),
      fetch(`${INS}/settlements`).then(r => r.json()),
      fetch(`${INS}/pre-auths`).then(r => r.json()),
      fetch(`${INS}/providers`).then(r => r.json()),
      fetch(`${INS}/policies`).then(r => r.json()),
    ]);
    if (c.status === 'fulfilled' && Array.isArray(c.value)) setClaims(c.value);
    else console.error('[Insurance] claims load failed', c);
    if (a.status === 'fulfilled' && Array.isArray(a.value)) setAppeals(a.value);
    if (s.status === 'fulfilled' && Array.isArray(s.value)) setSettlements(s.value);
    if (p.status === 'fulfilled' && Array.isArray(p.value)) setPreAuths(p.value);
    if (pr.status === 'fulfilled' && Array.isArray(pr.value)) setProviders(pr.value);
    if (po.status === 'fulfilled' && Array.isArray(po.value)) setPolicies(po.value);
    setLoading(false);
    setHasLoaded(true);
  }, []);

  // Screens address records by document number; resolve that to the server PK.
  const claimPk = (id: string) => claims.find(c => c.id === id)?.claimId;
  const preAuthPk = (id: string) => preAuths.find(p => p.id === id)?.preAuthId;
  const appealPk = (id: string) => appeals.find(a => a.id === id)?.appealId;
  const settlementPk = (id: string) => settlements.find(s => s.id === id)?.settlementId;

  const run = (fn: () => Promise<Response>, label: string) => {
    (async () => {
      try {
        const res = await fn();
        if (!res.ok) throw new Error(await res.text());
        await refresh();
      } catch (e) { console.error(`[Insurance] ${label} failed`, e); }
    })();
  };

  // The server assigns the claim number (the prototype generated
  // `CLM-2023-<random>` client-side, with a hardcoded year and no uniqueness).
  const addClaim = (claim: Claim) => run(() => fetch(`${INS}/claims`, {
    method: 'POST', headers: JSON_HEADERS,
    body: JSON.stringify({
      uhid: claim.uhid, patientName: claim.patient,
      providerId: claim.providerId ?? null, insurerName: claim.insurer,
      preAuthId: claim.preAuthId ?? null, admissionId: claim.admissionId ?? null,
      diagnosis: claim.diagnosis || null,
      billedAmount: claim.amount, preAuthAmount: claim.preAuth ?? 0,
      claimedAmount: claim.claimedAmount ?? 0,
    }),
  }), 'create claim');

  const updateClaim = (claim: Claim) => {
    const pk = claim.claimId ?? claimPk(claim.id);
    if (!pk) return;
    const current = claims.find(c => c.id === claim.id);
    run(() => fetch(`${INS}/claims/${pk}`, {
      method: 'PUT', headers: JSON_HEADERS,
      body: JSON.stringify({
        uhid: claim.uhid, patientName: claim.patient,
        providerId: claim.providerId ?? null, insurerName: claim.insurer,
        diagnosis: claim.diagnosis || null, billedAmount: claim.amount,
        preAuthAmount: claim.preAuth ?? 0, claimedAmount: claim.claimedAmount ?? 0,
      }),
    }), 'update claim');
    // A status change goes through the status endpoint so the settlement /
    // appeal side effects fire — editing a claim to Settled or Denied did
    // nothing in the prototype.
    if (current && current.status !== claim.status) {
      run(() => fetch(`${INS}/claims/${pk}/status`, {
        method: 'PATCH', headers: JSON_HEADERS,
        body: JSON.stringify({ status: claim.status, approvedAmount: claim.claimedAmount ?? null }),
      }), 'claim status');
    }
  };

  const deleteClaim = (id: string) => {
    const pk = claimPk(id);
    if (pk) run(() => fetch(`${INS}/claims/${pk}`, { method: 'DELETE' }), 'delete claim');
  };

  const markClaimDenied = (claimId: string, reason?: string) => {
    const pk = claimPk(claimId);
    if (pk) run(() => fetch(`${INS}/claims/${pk}/status`, {
      method: 'PATCH', headers: JSON_HEADERS,
      body: JSON.stringify({ status: 'Denied', reason: reason ?? null }),
    }), 'deny claim');
  };

  const markClaimSettled = (claimId: string, approvedAmt: number) => {
    const pk = claimPk(claimId);
    if (pk) run(() => fetch(`${INS}/claims/${pk}/status`, {
      method: 'PATCH', headers: JSON_HEADERS,
      body: JSON.stringify({ status: 'Settled', approvedAmount: approvedAmt }),
    }), 'settle claim');
  };

  const addPreAuth = (p: PreAuth) => run(() => fetch(`${INS}/pre-auths`, {
    method: 'POST', headers: JSON_HEADERS,
    body: JSON.stringify({
      uhid: p.uhid, patientName: p.patient, providerId: p.providerId ?? null,
      insurerName: p.insurer, diagnosis: p.diagnosis || null, requestedAmount: p.amount,
    }),
  }), 'create pre-auth');

  const updatePreAuth = (p: PreAuth) => {
    const pk = p.preAuthId ?? preAuthPk(p.id);
    if (!pk) return;
    run(() => fetch(`${INS}/pre-auths/${pk}`, {
      method: 'PUT', headers: JSON_HEADERS,
      body: JSON.stringify({
        uhid: p.uhid, patientName: p.patient, providerId: p.providerId ?? null,
        insurerName: p.insurer, diagnosis: p.diagnosis || null,
        requestedAmount: p.amount, status: p.status,
      }),
    }), 'update pre-auth');
  };

  const updatePreAuthStatus = (id: string, status: string, approvedAmount?: number, decisionReason?: string) => {
    const pk = preAuthPk(id);
    if (pk) run(() => fetch(`${INS}/pre-auths/${pk}/status`, {
      method: 'PATCH', headers: JSON_HEADERS,
      body: JSON.stringify({
        status,
        approvedAmount: approvedAmount ?? null,
        decisionReason: decisionReason ?? null,
      }),
    }), 'pre-auth status');
  };

  const deletePreAuth = (id: string) => {
    const pk = preAuthPk(id);
    if (pk) run(() => fetch(`${INS}/pre-auths/${pk}`, { method: 'DELETE' }), 'delete pre-auth');
  };

  const fileAppeal = (appealId: string, appealReason?: string) => {
    const pk = appealPk(appealId);
    if (pk) run(() => fetch(`${INS}/appeals/${pk}/file`, {
      method: 'POST', headers: JSON_HEADERS,
      body: JSON.stringify({ appealReason: appealReason ?? null }),
    }), 'file appeal');
  };

  const resolveAppeal = (appealId: string, approvedAmt: number) => {
    const pk = appealPk(appealId);
    if (pk) run(() => fetch(`${INS}/appeals/${pk}/resolve`, {
      method: 'POST', headers: JSON_HEADERS,
      body: JSON.stringify({ approvedAmount: approvedAmt }),
    }), 'resolve appeal');
  };

  const reconcileSettlement = (settlementId: string) => {
    const pk = settlementPk(settlementId);
    if (pk) run(() => fetch(`${INS}/settlements/${pk}/reconcile`, {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({}),
    }), 'reconcile settlement');
  };

  // Eligibility records are persisted now — the prototype kept them in a
  // component useState that was lost on every reload.
  const savePolicy: InsuranceContextType['savePolicy'] = async (policy) => {
    try {
      const res = await fetch(`${INS}/policies`, {
        method: 'POST', headers: JSON_HEADERS,
        body: JSON.stringify({
          uhid: policy.uhid, patientName: policy.patientName,
          policyNumber: policy.policyNumber, insurerName: policy.insurerName,
          providerId: policy.providerId ?? null,
          planName: policy.planName ?? 'Standard Plan',
          status: policy.status ?? 'Active',
          validUntil: policy.validUntil ?? null,
          sumInsured: policy.sumInsured ?? 0,
          balanceAmount: policy.balanceAmount ?? null,
          networkHospital: policy.networkHospital ?? true,
          copayPercentage: policy.copayPercentage ?? 0,
          deductible: policy.deductible ?? 0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
      return true;
    } catch (e) {
      console.error('[Insurance] save policy failed', e);
      return false;
    }
  };

  const searchPolicy = async (query: string): Promise<Policy | null> => {
    try {
      const res = await fetch(`${INS}/policies/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  return (
    <InsuranceContext.Provider
      value={{
        claims, appeals, settlements, preAuths, providers, policies, loading, hasLoaded, refresh,
        addClaim, markClaimDenied, markClaimSettled, fileAppeal, updatePreAuthStatus,
        deleteClaim, updateClaim, deletePreAuth, updatePreAuth, resolveAppeal,
        reconcileSettlement, addPreAuth, savePolicy, searchPolicy,
      }}
    >
      {children}
    </InsuranceContext.Provider>
  );
};

export const useInsurance = () => {
  const context = useContext(InsuranceContext);
  if (!context) {
    throw new Error('useInsurance must be used within an InsuranceProvider');
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
