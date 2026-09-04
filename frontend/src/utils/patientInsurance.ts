const API_ROOT = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api/v1';

/**
 * A patient's insurance can live in three places:
 *
 *  1. The IPD Admission record's CoverageType — the authoritative source for IPD
 *     stays. The admission desk asks the patient directly at the time of admission
 *     and sets "Insurance" or "Self Pay". This overrides everything else for IPD.
 *  2. The Insurance module's policy register (Insurance > Policies). Richer —
 *     sum insured, remaining balance, co-pay, network status — and it is what
 *     claims are raised against.
 *  3. The provider / TPA / policy number reception types into the patient
 *     registration form. No sum insured or balance, but for most patients it is
 *     the only record that exists, because nobody has opened a formal policy yet.
 *
 * For IPD orders, the admission desk's Financial Coverage selection is the source
 * of truth. If the desk chose "Self Pay", this function returns null even if a
 * global insurance record exists elsewhere.
 */
export interface PatientCover {
  source: 'policy' | 'registration' | 'admission';
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

/**
 * Looks up the patient's active IPD admission and returns:
 *   - A PatientCover from the admission's saved insurance fields if CoverageType === 'Insurance'
 *   - A sentinel { source: 'self-pay' } if CoverageType === 'Self Pay'
 *   - null if no active admission is found
 */
async function fetchIPDAdmissionCover(uhid: string): Promise<(PatientCover & { _selfPay?: true }) | null> {
  try {
    const res = await fetch(`${API_ROOT}/ipd/admissions`);
    if (!res.ok) return null;
    const admissions: any[] = await res.json();

    // Most-recently-admitted active record for this UHID
    const active = admissions
      .filter(a =>
        (a.uhid === uhid || a.Uhid === uhid) &&
        (a.status === 'Admitted' || a.status === 'Discharge Requested')
      )
      .sort((a, b) =>
        new Date(b.admissionDate || b.AdmissionDate || 0).getTime() -
        new Date(a.admissionDate || a.AdmissionDate || 0).getTime()
      )[0];

    if (!active) return null;

    const coverageType = active.coverageType || active.CoverageType || 'Self Pay';

    if (coverageType !== 'Insurance') {
      // Admission desk explicitly chose Self Pay — sentinel to suppress global insurance
      return { source: 'admission', _selfPay: true } as any;
    }

    // Build PatientCover from the admission's insurance fields
    const insurerName = active.insuranceCompany || active.InsuranceCompany || undefined;
    const policyNumber = active.policyNumber || active.PolicyNumber || undefined;
    const tpaName = active.tpa || active.TPA || undefined;
    const validUntil = active.policyEndDate || active.PolicyEndDate || undefined;
    const coPay = active.coPay ?? active.CoPay ?? null;
    const deductible = active.deductible ?? active.Deductible ?? null;

    return {
      source: 'admission',
      insurerName,
      tpaName,
      policyNumber,
      validUntil: validUntil ? String(validUntil).slice(0, 10) : undefined,
      copayPercentage: coPay != null ? Number(coPay) : undefined,
      deductible: deductible != null ? Number(deductible) : undefined,
      status: 'Active',
    };
  } catch {
    return null;
  }
}

export async function fetchPatientCover(uhid: string, module?: string): Promise<PatientCover | null> {
  const id = (uhid || '').trim();
  if (!id) return null;

  // ── IPD: Admission desk is the authoritative source of truth ────────────────
  if (module === 'IPD') {
    const admissionCover = await fetchIPDAdmissionCover(id);
    if (admissionCover !== null) {
      if ((admissionCover as any)._selfPay) return null; // Self Pay override
      return admissionCover;
    }
    // No active IPD admission found — fall through to global lookup
  }

  // ── Global fallback (OPD, and IPD without an active admission) ──────────────

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
