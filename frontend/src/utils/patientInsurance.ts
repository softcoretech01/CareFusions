const API_ROOT = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api/v1';

/**
 * A patient's insurance can live in two places, and both count as "covered":
 *
 *  1. The Insurance module's policy register (Insurance > Policies). Richer —
 *     sum insured, remaining balance, co-pay, network status — and it is what
 *     claims are raised against.
 *  2. The provider / TPA / policy number reception types into the patient
 *     registration form. No sum insured or balance, but for most patients it is
 *     the only record that exists, because nobody has opened a formal policy yet.
 *
 * Reading only (1) made covered patients look self-paying. So prefer the policy
 * register when a row exists and fall back to registration otherwise, tagging
 * which one answered so the UI can say so.
 */
export interface PatientCover {
  source: 'policy' | 'registration';
  insurerName?: string;
  planName?: string;
  status?: string;
  tpaName?: string;
  policyNumber?: string;
  validUntil?: string;
  sumInsured?: number | null;
  balanceAmount?: number | null;
  copayPercentage?: number | null;
  deductible?: number | null;
  networkHospital?: boolean;
}

export async function fetchPatientCover(uhid: string): Promise<PatientCover | null> {
  const id = (uhid || '').trim();
  if (!id) return null;

  // 1 — the policy register.
  try {
    const res = await fetch(`${API_ROOT}/insurance/policies/search?q=${encodeURIComponent(id)}`);
    // A patient with no policy comes back as null, not an error.
    const policy = res.ok ? await res.json() : null;
    if (policy) return { ...policy, source: 'policy' };
  } catch {
    /* fall through to registration */
  }

  // 2 — what reception captured on the registration form.
  try {
    const res = await fetch(`${API_ROOT}/patients/`);
    if (!res.ok) return null;
    const patients = await res.json();
    const p = Array.isArray(patients) ? patients.find((r: any) => r.Uhid === id) : null;
    if (!p) return null;

    const wantsInsurance = String(p.InsuranceRequired ?? '').toLowerCase() === 'yes';
    // "Insurance required = Yes" with nothing filled in is not cover.
    if (!wantsInsurance || !(p.InsuranceProvider || p.PolicyNumber)) return null;

    return {
      source: 'registration',
      insurerName: p.InsuranceProvider || undefined,
      tpaName: p.Tpa || undefined,
      policyNumber: p.PolicyNumber || undefined,
      validUntil: p.ValidTill || undefined,
      status: 'Active',
    };
  } catch {
    return null;
  }
}
