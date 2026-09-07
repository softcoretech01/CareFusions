import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, User, Phone, MapPin, Shield, Heart, AlertCircle,
  Loader2, Calendar, Stethoscope, Droplets, Mail
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL as string || 'http://localhost:8000/api/v1';

interface PatientQuickViewModalProps {
  uhid: string | null;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 font-medium shrink-0">{label}</span>
      <span className="text-xs font-semibold text-slate-700 text-right max-w-[60%]">{value || 'N/A'}</span>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

export const PatientQuickViewModal = ({ uhid, onClose }: PatientQuickViewModalProps) => {
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPatient = useCallback(async (u: string) => {
    setLoading(true);
    setError('');
    setPatient(null);
    try {
      const res = await fetch(`${API_BASE}/patients/uhid/${encodeURIComponent(u)}`);
      if (!res.ok) {
        if (res.status === 404) setError('Patient profile not found.');
        else setError('Failed to load patient data. Please try again.');
        return;
      }
      const data = await res.json();
      setPatient(data);
    } catch {
      setError('Network error. Unable to reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (uhid) fetchPatient(uhid);
    else { setPatient(null); setError(''); }
  }, [uhid, fetchPatient]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (uhid) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [uhid, onClose]);

  if (!uhid) return null;

  const initials = patient?.PatientName
    ? patient.PatientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const typeColor: Record<string, string> = {
    'Emergency': 'bg-red-100 text-red-700',
    'OP': 'bg-blue-100 text-blue-700',
    'IP': 'bg-indigo-100 text-indigo-700',
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0 border border-primary/20">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : initials}
          </div>
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-1.5">
                <div className="h-4 bg-slate-200 rounded animate-pulse w-48" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-32" />
              </div>
            ) : patient ? (
              <>
                <h2 className="text-lg font-bold text-slate-800 truncate">
                  {patient.Title ? `${patient.Title} ` : ''}{patient.PatientName}
                </h2>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="text-xs text-slate-500 font-medium">UHID: <span className="text-slate-700 font-bold">{patient.Uhid}</span></span>
                  {patient.PatientType && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColor[patient.PatientType] || 'bg-slate-100 text-slate-700'}`}>
                      {patient.PatientType}
                    </span>
                  )}
                </div>
              </>
            ) : error ? (
              <p className="text-sm font-semibold text-rose-600">{error}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-4 space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm font-medium">Loading patient profile...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <span className="text-sm font-medium text-rose-500">{error}</span>
            </div>
          )}

          {patient && !loading && (
            <>
              {/* Top Summary Bar */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex flex-wrap gap-3">
                {patient.Gender && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{patient.Gender}</span>
                  </div>
                )}
                {patient.Age && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{patient.Age} Yrs</span>
                    {patient.DateOfBirth && <span className="text-slate-400">({patient.DateOfBirth})</span>}
                  </div>
                )}
                {patient.BloodGroup && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Droplets className="w-3.5 h-3.5 text-rose-400" />
                    <span className="font-bold text-rose-600">{patient.BloodGroup}</span>
                  </div>
                )}
                {patient.MobileNumber && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{patient.MobileNumber}</span>
                  </div>
                )}
                {patient.Email && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{patient.Email}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Contact & Address */}
                <SectionCard icon={MapPin} title="Contact & Address" color="bg-blue-50 text-blue-700">
                  <InfoRow label="Mobile" value={patient.MobileNumber} />
                  <InfoRow label="Alt. Mobile" value={patient.AlternateMobile} />
                  <InfoRow label="Address" value={[patient.Address1, patient.Address2].filter(Boolean).join(', ')} />
                  <InfoRow label="City / State" value={[patient.City, patient.State].filter(Boolean).join(', ')} />
                  <InfoRow label="Pin Code" value={patient.PinCode} />
                </SectionCard>

                {/* Emergency Contact */}
                <SectionCard icon={AlertCircle} title="Emergency Contact" color="bg-orange-50 text-orange-700">
                  <InfoRow label="Name" value={patient.EmergencyContactName} />
                  <InfoRow label="Relation" value={patient.EmergencyRelationship} />
                  <InfoRow label="Phone" value={patient.EmergencyMobile} />
                  <InfoRow label="Address" value={patient.EmergencyAddress} />
                </SectionCard>

                {/* Insurance */}
                <SectionCard icon={Shield} title="Insurance Details" color="bg-emerald-50 text-emerald-700">
                  <InfoRow label="Required" value={patient.InsuranceRequired} />
                  {patient.InsuranceRequired === 'Yes' && (
                    <>
                      <InfoRow label="Provider" value={patient.InsuranceProvider} />
                      <InfoRow label="TPA" value={patient.Tpa} />
                      <InfoRow label="Policy No." value={patient.PolicyNumber} />
                      <InfoRow label="Valid Till" value={patient.ValidTill} />
                    </>
                  )}
                </SectionCard>

                {/* Medical Background */}
                <SectionCard icon={Heart} title="Medical Background" color="bg-rose-50 text-rose-700">
                  <InfoRow label="Allergies" value={patient.Allergies || 'None reported'} />
                  <InfoRow label="Chronic Diseases" value={patient.ChronicDiseases || 'None'} />
                  <InfoRow label="Current Medication" value={patient.CurrentMedication || 'None'} />
                  <InfoRow label="Marital Status" value={patient.MaritalStatus} />
                </SectionCard>
              </div>

              {/* Registration Info */}
              <SectionCard icon={Stethoscope} title="Registration Details" color="bg-slate-100 text-slate-600">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><p className="text-xs text-slate-400 mb-0.5">Reg. Date</p><p className="text-xs font-bold text-slate-700">{patient.RegistrationDate || 'N/A'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-0.5">Patient Type</p><p className="text-xs font-bold text-slate-700">{patient.PatientType || 'N/A'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-0.5">Primary Doctor</p><p className="text-xs font-bold text-slate-700">{patient.PrimaryDoctor || 'N/A'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-0.5">Department</p><p className="text-xs font-bold text-slate-700">{patient.Department || 'N/A'}</p></div>
                </div>
              </SectionCard>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
          <p className="text-xs text-slate-400">Click outside or press <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono text-[10px]">Esc</kbd> to close</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default PatientQuickViewModal;
