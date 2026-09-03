/**
 * Read-only detail panel for one PRO service order.
 *
 * The Approvals & Release list shows a patient's name and three status chips,
 * which is enough to sort a queue and not enough to act on one: the PRO desk
 * could not see what was actually ordered, what it was priced at, what the
 * patient had paid, or why a service was still blocked without leaving for
 * another screen.
 *
 * Everything comes from GET /pro/orders/{id}/detail in a single call, including
 * the per-item release decision, so this panel shows the same verdict the
 * backend would enforce rather than inferring one from status columns.
 */
import React, { useEffect, useState } from 'react';
import {
  X, Loader, User, FileText, IndianRupee, ShieldCheck, History,
  AlertTriangle, CheckCircle2, Stethoscope, BedDouble,
} from 'lucide-react';

const API = (import.meta.env.VITE_API_URL as string || 'http://localhost:8000/api/v1') + '/pro';

const money = (v: any) =>
  v === null || v === undefined || v === ''
    ? '—'
    : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const day = (v?: string | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  PARTIALLY_APPROVED: 'bg-emerald-50 text-emerald-600',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-red-50 text-red-500',
  RELEASED: 'bg-teal-100 text-teal-700',
  IN_PROGRESS: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-slate-200 text-slate-600',
  NOT_RELEASED: 'bg-red-50 text-red-500',
  UNPAID: 'bg-orange-100 text-orange-700',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  CLEARED: 'bg-emerald-100 text-emerald-700',
  PARTIALLY_CLEARED: 'bg-amber-100 text-amber-700',
  NOT_CLEARED: 'bg-red-50 text-red-500',
  NOT_REQUIRED: 'bg-slate-100 text-slate-500',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  REVOKED: 'bg-red-100 text-red-700',
};

const Badge = ({ status }: { status?: string | null }) =>
  !status ? <span className="text-slate-300">—</span> : (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${BADGE[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {String(status).replace(/_/g, ' ')}
    </span>
  );

const Section = ({ icon: Icon, title, children, right }: any) => (
  <section className="bg-white rounded-2xl border border-slate-100 shadow-sm">
    <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <Icon className="w-4 h-4 text-[#086450]" />
        {title}
      </h3>
      {right}
    </header>
    <div className="p-5">{children}</div>
  </section>
);

/** A label/value pair. Renders a dash rather than an empty gap for missing data. */
const Field = ({ label, value, wide }: { label: string; value: any; wide?: boolean }) => (
  <div className={wide ? 'sm:col-span-2 lg:col-span-3' : ''}>
    <dt className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</dt>
    <dd className="text-sm text-slate-700 mt-0.5 break-words">
      {value === null || value === undefined || value === '' ? <span className="text-slate-300">—</span> : value}
    </dd>
  </div>
);

interface Props {
  orderId: number | null;
  onClose: () => void;
}

export const OrderDetailDrawer: React.FC<Props> = ({ orderId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) { setData(null); setError(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/orders/${orderId}/detail`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.detail ?? `Failed to load order ${orderId}`);
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  // Escape closes, matching every other overlay in the app.
  useEffect(() => {
    if (!orderId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [orderId, onClose]);

  if (!orderId) return null;

  const order = data?.Order ?? {};
  const patient = data?.Patient ?? {};
  const items: any[] = data?.Items ?? [];
  const advance = data?.Advance;
  const payments: any[] = data?.Payments ?? [];
  const auths: any[] = data?.Authorizations ?? [];
  const audit: any[] = data?.Audit ?? [];

  const age = patient.Age ?? patient.ApproximateAge;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Service order details"
        className="relative w-full max-w-4xl bg-slate-50 h-full shadow-2xl flex flex-col animate-[slideIn_.2s_ease-out]"
      >
        {/* Header */}
        <div className="bg-[#086450] text-white px-6 py-4 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">
              {order.OrderNo ?? `Order #${orderId}`}
            </p>
            <h2 className="text-xl font-bold truncate">
              {patient.PatientName ?? order.PatientName ?? 'Unknown patient'}
            </h2>
            <p className="text-sm text-emerald-100">
              {order.UHID}
              {order.OrderType ? ` · ${order.OrderType}` : ''}
              {order.SourceModule ? ` · ${order.SourceModule}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg hover:bg-white/15 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="ml-3 text-slate-400 text-sm">Loading order…</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* ── Order summary ─────────────────────────────────── */}
              <Section icon={FileText} title="Order">
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
                  <Field label="Order No" value={order.OrderNo} />
                  <Field label="Order Date" value={day(order.OrderDate)} />
                  <Field label="Type" value={order.OrderType} />
                  <Field label="Raised From" value={order.SourceModule} />
                  <Field label="Ordering Doctor" value={order.DoctorName} />
                  <Field label="Department" value={order.DepartmentName} />
                  <Field label="PRO Status" value={<Badge status={order.PROStatus} />} />
                  <Field label="Payment" value={<Badge status={order.PaymentStatus} />} />
                  <Field label="Financial" value={<Badge status={order.FinancialStatus} />} />
                  <Field label="Service Status" value={<Badge status={order.ServiceStatus} />} />
                  <Field label="Authorization" value={<Badge status={data?.AuthorizationStatus} />} />
                  <Field label="Reviewed By" value={order.ReviewedBy} />
                  {order.RejectionReason && (
                    <Field label="Rejection Reason" value={order.RejectionReason} wide />
                  )}
                </dl>
              </Section>

              {/* ── Patient ───────────────────────────────────────── */}
              <Section
                icon={User}
                title="Patient Details"
                right={(
                  <div className="flex items-center gap-2">
                    {/* The record is still shown when it has been soft-deleted --
                        it is who this order belongs to -- but never silently, or
                        the desk would act on a registration that no longer stands. */}
                    {!!patient.IsDeleted && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5">
                        <AlertTriangle className="w-3 h-3" /> DELETED RECORD
                      </span>
                    )}
                    {patient.RegistrationMode && (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
                        {String(patient.RegistrationMode).replace(/_/g, ' ')} REGISTRATION
                      </span>
                    )}
                  </div>
                )}
              >
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
                  <Field label="Name" value={[patient.Title, patient.PatientName].filter(Boolean).join(' ')} />
                  <Field label="UHID" value={patient.Uhid ?? order.UHID} />
                  <Field label="Gender" value={patient.Gender} />
                  <Field label="Age" value={age ? `${age}` : null} />
                  <Field label="Date of Birth" value={patient.DateOfBirth ? day(patient.DateOfBirth).split(',')[0] : null} />
                  <Field label="Blood Group" value={patient.BloodGroup} />
                  <Field label="Mobile" value={patient.MobileNumber} />
                  <Field label="Alternate Mobile" value={patient.AlternateMobile} />
                  <Field label="Email" value={patient.Email} />
                  <Field label="Marital Status" value={patient.MaritalStatus} />
                  <Field label="Nationality" value={patient.Nationality} />
                  <Field label="Occupation" value={patient.Occupation} />
                  <Field
                    label="Address"
                    wide
                    value={[patient.Address1, patient.Address2, patient.City, patient.District,
                            patient.State, patient.Country, patient.PinCode]
                      .filter(Boolean).join(', ') || null}
                  />
                  <Field label="Emergency Contact" value={patient.EmergencyContactName} />
                  <Field label="Relationship" value={patient.EmergencyRelationship} />
                  <Field label="Emergency Mobile" value={patient.EmergencyMobile} />
                  <Field label="Allergies" value={patient.Allergies} />
                  <Field label="Chronic Diseases" value={patient.ChronicDiseases} />
                  <Field label="Current Medication" value={patient.CurrentMedication} />
                  <Field label="Registered On" value={patient.RegistrationDate ? day(patient.RegistrationDate).split(',')[0] : null} />
                  <Field label="Patient Type" value={patient.PatientType} />
                  <Field label="Primary Doctor" value={patient.PrimaryDoctor} />
                </dl>

                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 font-bold mb-3">Insurance on file</p>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
                    <Field label="Insurance Required" value={patient.InsuranceRequired} />
                    <Field label="Provider" value={patient.InsuranceProvider} />
                    <Field label="TPA" value={patient.Tpa} />
                    <Field label="Policy Number" value={patient.PolicyNumber} />
                    <Field label="Valid Till" value={patient.ValidTill ? day(patient.ValidTill).split(',')[0] : null} />
                  </dl>
                </div>
              </Section>

              {/* ── Admission ─────────────────────────────────────── */}
              {data?.Admission && (
                <Section icon={BedDouble} title="Admission">
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
                    <Field label="Admission No" value={data.Admission.AdmissionNumber} />
                    <Field label="Admitted On" value={day(data.Admission.AdmissionDate)} />
                    <Field label="Discharged On" value={data.Admission.DischargeDate ? day(data.Admission.DischargeDate) : null} />
                    <Field label="Admitting Doctor" value={data.Admission.AdmittingDoctor} />
                    <Field label="Specialty" value={data.Admission.Specialty} />
                    <Field label="Status" value={<Badge status={data.Admission.Status} />} />
                  </dl>
                </Section>
              )}

              {/* ── Ordered tests / services ──────────────────────── */}
              <Section
                icon={Stethoscope}
                title="Ordered Tests & Services"
                right={<span className="text-xs font-semibold text-slate-500">{items.length} item(s)</span>}
              >
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-sm min-w-[820px]">
                    <thead>
                      <tr className="text-slate-500 text-[11px] uppercase tracking-wide border-b border-slate-100">
                        <th className="py-2 pr-3 text-left font-semibold">Service</th>
                        <th className="py-2 px-2 text-center font-semibold">Qty</th>
                        <th className="py-2 px-2 text-right font-semibold">Master</th>
                        <th className="py-2 px-2 text-right font-semibold">PRO Price</th>
                        <th className="py-2 px-2 text-right font-semibold">Discount</th>
                        <th className="py-2 px-2 text-right font-semibold">Net</th>
                        <th className="py-2 px-2 text-right font-semibold">Insurance</th>
                        <th className="py-2 px-2 text-right font-semibold">Patient</th>
                        <th className="py-2 px-2 text-left font-semibold">PRO</th>
                        <th className="py-2 pl-2 text-left font-semibold">Service</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 && (
                        <tr><td colSpan={10} className="py-6 text-center text-slate-400">No items on this order.</td></tr>
                      )}
                      {items.map(it => (
                        <React.Fragment key={it.ServiceOrderItemId}>
                          <tr className="border-b border-slate-50">
                            <td className="py-2.5 pr-3">
                              <div className="font-medium text-slate-700">{it.ItemName}</div>
                              <div className="text-[11px] text-slate-400">{it.ItemType}</div>
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-600">{it.Quantity}</td>
                            <td className="py-2.5 px-2 text-right text-slate-500">{money(it.MasterPrice)}</td>
                            <td className="py-2.5 px-2 text-right text-slate-700">{money(it.PROPrice)}</td>
                            <td className="py-2.5 px-2 text-right text-slate-500">{money(it.AuthorizedDiscount)}</td>
                            <td className="py-2.5 px-2 text-right text-slate-700">{money(it.NetAmount)}</td>
                            <td className="py-2.5 px-2 text-right text-slate-500">{money(it.InsuranceCoveredAmount)}</td>
                            <td className="py-2.5 px-2 text-right font-semibold text-slate-800">{money(it.PatientResponsibility)}</td>
                            <td className="py-2.5 px-2"><Badge status={it.PROStatus} /></td>
                            <td className="py-2.5 pl-2"><Badge status={it.ServiceStatus} /></td>
                          </tr>
                          {it.RejectionReason && (
                            <tr><td colSpan={10} className="pb-2 pl-1 text-xs text-red-600">
                              Rejected: {it.RejectionReason}
                            </td></tr>
                          )}
                          {/* The gate's own verdict. A completed item needs no
                              release, so only unreleased items show blockers. */}
                          {!it.CanRelease && it.Blockers?.length > 0 &&
                            !['RELEASED', 'IN_PROGRESS', 'COMPLETED'].includes(it.ServiceStatus) && (
                            <tr>
                              <td colSpan={10} className="pb-3 pl-1">
                                <div className="flex gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                  <span>{it.Blockers.join(' ')}</span>
                                </div>
                              </td>
                            </tr>
                          )}
                          {it.CanRelease && (
                            <tr>
                              <td colSpan={10} className="pb-3 pl-1">
                                <div className="flex gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                  <span>Cleared for release.</span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* ── Financials ────────────────────────────────────── */}
              <Section icon={IndianRupee} title="Financials">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {[
                    ['Patient Responsibility', data?.PatientResponsibility, 'text-slate-800'],
                    ['Collected', data?.AmountPaid, 'text-emerald-700'],
                    ['Outstanding', data?.Outstanding, (data?.Outstanding ?? 0) > 0 ? 'text-red-600' : 'text-emerald-700'],
                    ['Authorized Insurance', data?.AuthorizedInsuranceCap, 'text-slate-800'],
                  ].map(([label, value, tone]: any) => (
                    <div key={label} className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
                      <p className={`text-lg font-bold mt-0.5 ${tone}`}>{money(value)}</p>
                    </div>
                  ))}
                </div>

                {advance ? (
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 pb-4 border-b border-slate-100">
                    <Field label="Advance Bill" value={advance.AdvanceNo} />
                    <Field label="Billed" value={money(advance.TotalAmount)} />
                    <Field label="Paid" value={money(advance.PaidAmount)} />
                    <Field label="Refunded" value={money(advance.RefundedAmount)} />
                    <Field label="Outstanding" value={money(advance.Outstanding)} />
                    <Field label="Status" value={<Badge status={advance.Status} />} />
                  </dl>
                ) : (
                  <p className="text-sm text-slate-400 pb-4 border-b border-slate-100">
                    No advance bill has been raised for this order.
                  </p>
                )}

                <p className="text-[11px] uppercase tracking-wide text-slate-400 font-bold mt-4 mb-2">Receipts</p>
                {payments.length === 0 ? (
                  <p className="text-sm text-slate-400">No payments recorded.</p>
                ) : (
                  <div className="overflow-x-auto -mx-5 px-5">
                    <table className="w-full text-sm min-w-[620px]">
                      <thead>
                        <tr className="text-slate-500 text-[11px] uppercase tracking-wide border-b border-slate-100">
                          <th className="py-2 pr-3 text-left font-semibold">Receipt</th>
                          <th className="py-2 px-2 text-left font-semibold">Date</th>
                          <th className="py-2 px-2 text-left font-semibold">Mode</th>
                          <th className="py-2 px-2 text-left font-semibold">Reference</th>
                          <th className="py-2 px-2 text-right font-semibold">Amount</th>
                          <th className="py-2 px-2 text-left font-semibold">Collected By</th>
                          <th className="py-2 pl-2 text-left font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(p => (
                          <tr key={p.ReceiptNo} className="border-b border-slate-50">
                            <td className="py-2 pr-3 font-medium text-slate-700">{p.ReceiptNo}</td>
                            <td className="py-2 px-2 text-slate-500">{day(p.PaymentDate)}</td>
                            <td className="py-2 px-2 text-slate-600">{p.PaymentMode}</td>
                            <td className="py-2 px-2 text-slate-500">{p.PaymentReference || '—'}</td>
                            <td className="py-2 px-2 text-right font-semibold text-slate-800">{money(p.AllocatedAmount)}</td>
                            <td className="py-2 px-2 text-slate-500">{p.CollectedBy}</td>
                            <td className="py-2 pl-2"><Badge status={p.Status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              {/* ── Insurance authorization ───────────────────────── */}
              <Section icon={ShieldCheck} title="Insurance Authorization">
                {auths.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No pre-authorization is linked to this order, so insurance cannot
                    absorb any part of it and the patient owes the full net amount.
                  </p>
                ) : (
                  <div className="overflow-x-auto -mx-5 px-5">
                    <table className="w-full text-sm min-w-[620px]">
                      <thead>
                        <tr className="text-slate-500 text-[11px] uppercase tracking-wide border-b border-slate-100">
                          <th className="py-2 pr-3 text-left font-semibold">Pre-Auth No</th>
                          <th className="py-2 px-2 text-left font-semibold">Insurer</th>
                          <th className="py-2 px-2 text-right font-semibold">Requested</th>
                          <th className="py-2 px-2 text-right font-semibold">Approved</th>
                          <th className="py-2 px-2 text-left font-semibold">Status</th>
                          <th className="py-2 pl-2 text-left font-semibold">Decided</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auths.map(a => (
                          <tr key={a.PreAuthId} className="border-b border-slate-50">
                            <td className="py-2 pr-3 font-medium text-slate-700">{a.PreAuthNumber}</td>
                            <td className="py-2 px-2 text-slate-600">{a.InsurerName}</td>
                            <td className="py-2 px-2 text-right text-slate-500">{money(a.RequestedAmount)}</td>
                            <td className="py-2 px-2 text-right font-semibold text-slate-800">{money(a.ApprovedAmount)}</td>
                            <td className="py-2 px-2"><Badge status={a.Status} /></td>
                            <td className="py-2 pl-2 text-slate-500">{a.DecisionDate ? day(a.DecisionDate) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              {/* ── Audit ─────────────────────────────────────────── */}
              <Section icon={History} title="Audit Trail">
                {audit.length === 0 ? (
                  <p className="text-sm text-slate-400">No activity recorded on this order.</p>
                ) : (
                  <ol className="space-y-3">
                    {audit.map(a => (
                      <li key={a.LogId} className="flex gap-3">
                        <div className="w-1.5 rounded-full bg-emerald-100 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700">
                            {a.Action.replace(/_/g, ' ')}
                            {a.PreviousValue != null && a.NewValue != null && (
                              <span className="font-normal text-slate-500">
                                {' '}· {a.PreviousValue} → {a.NewValue}
                              </span>
                            )}
                          </p>
                          {a.Reason && <p className="text-xs text-slate-500 mt-0.5">{a.Reason}</p>}
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {a.ChangedBy}{a.ChangedByRole ? ` (${a.ChangedByRole})` : ''} · {day(a.CreatedAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
};

export default OrderDetailDrawer;
