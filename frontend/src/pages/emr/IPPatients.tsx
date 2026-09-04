import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Printer, Eye, X, Loader2 } from 'lucide-react';
import { EMRPrintTemplate } from '../../components/emr/EMRPrintTemplate';
import EMRViewTemplate from '../../components/emr/EMRViewTemplate';
import { OPDPrintTemplate } from '../../components/emr/OPDPrintTemplate';
import { IPDPrintTemplate } from '../../components/emr/IPDPrintTemplate';
import type { EMRRecord } from '../../components/emr/EMRPrintTemplate';
import { DateFilter } from '../../components/ui/DateFilter';

const API_BASE = API_BASE_URL;

export const IPPatients = () => {
  const visitType = 'IP' as const;
  const title = 'Inpatient (IP) Records';

  const [records, setRecords] = useState<EMRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [viewRecord, setViewRecord] = useState<EMRRecord | null>(null);
  const [printRecord, setPrintRecord] = useState<EMRRecord | null>(null);

  const defaultHospitalInfo = {
    name: 'Care Fusions Hospital',
    address: '123 Healthcare Avenue, City',
    phone: '+1-800-CARE-XXX',
    email: 'info@carefusions.com',
    website: 'www.carefusions.com',
    generatedBy: 'CareFusions EMR System',
    logoText: 'CF',
  };

  const renderPrintTemplate = (record: EMRRecord) => {
    if (record.visitType === 'OP') {
      return <OPDPrintTemplate hospital={defaultHospitalInfo} record={record} />;
    }
    if (record.visitType === 'IP') {
      return <IPDPrintTemplate hospital={defaultHospitalInfo} record={record} />;
    }
    return <EMRPrintTemplate record={record} />;
  };

  useEffect(() => {
    if (!printRecord) return;
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [printRecord]);

  useEffect(() => {
    const handleAfterPrint = () => setPrintRecord(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  useEffect(() => {
    const fetchRecords = async () => {
      setIsLoading(true);
      try {
        const [res, billsRes] = await Promise.all([
          fetch(`${API_BASE}/ipd-visits/schedule`),
          fetch(`${API_BASE}/ip-billing/`).catch(() => ({ ok: false, json: () => [] } as any))
        ]);

        let ipBills: any[] = [];
        if (billsRes.ok) {
          ipBills = await billsRes.json();
        }

        if (res.ok) {
          const data = await res.json();
          const mapped: EMRRecord[] = data.map((d: any) => {
            const patientBills = ipBills
              .filter((b: any) => b.Uhid === d.uhid)
              .sort((a: any, b: any) => new Date(b.BillDate).getTime() - new Date(a.BillDate).getTime());
            
            const latestBill = patientBills.length > 0 ? patientBills[0] : null;

            return {
              uhid: d.uhid,
              patientName: d.patientName,
              age: d.age || 0,
              gender: d.gender || 'Unknown',
              bloodGroup: 'Unknown',
              contact: '',
              visitType: 'IP',
              visitId: String(d.admissionId || d.id),
              visitDate: d.admissionDate || '',
              visitDateValue: d.admissionDate || '',
              doctor: d.doctorName || 'Unknown',
              specialty: d.department || 'Unknown',
              department: d.department,
              billingStatus: latestBill ? latestBill.PaymentStatus : (d.billingStatus || 'Pending'),
              chiefComplaint: '',
              diagnosis: '',
              clinicalNotes: '',
              operations: d.operations || [],
            };
          });
          setRecords(mapped);
        }
      } catch (e) {
        console.error("Failed to fetch IP EMR records", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecords();
  }, []);

  const fetchFullRecord = async (record: EMRRecord): Promise<EMRRecord> => {
    try {
      const res = await fetch(`${API_BASE}/ipd-visits/${record.visitId}/details`);
      if (res.ok) {
        const details = await res.json();
        if (details.status === "NOT_FOUND") return record;
        
        const adm = details.admissionInfo || {};
        const vitals = (details.vitals || [])[0]; // Get most recent vitals
        const rounds = details.rounds || [];
        const meds = details.medications || [];
        const invs = details.investigations || [];

        return {
          ...record,
          admissionDate: adm.AdmissionDate,
          dischargeDate: adm.DischargeDate,
          dischargeStatus: adm.Status === 'Discharged' ? 'Discharged' : 'Admitted',
          chiefComplaint: adm.admissionReason || '',
          diagnosis: adm.admissionReason || '',
          clinicalNotes: rounds.map((r:any) => `${r.DoctorName}: ${r.Note}`).join('\n\n') || '',
          vitals: vitals ? {
            bp: vitals.BloodPressure || '',
            pulse: vitals.Pulse || '',
            temp: vitals.Temperature || '',
            spo2: vitals.SpO2 || '',
            weight: '',
            height: '',
          } : undefined,
          investigations: invs.map((i: any) => ({ 
            test: i.TestName, 
            result: i.Result || i.Status || 'Ordered', 
            summary: i.ResultSummary || '',
            normalRange: i.NormalRange || '' 
          })),
          prescriptions: meds.map((m: any) => ({
             medicine: m.MedicineName || '',
             dosage: m.Dosage || '',
             frequency: m.Frequency || '',
             duration: '',
             instructions: m.Route || ''
          }))
        };
      }
    } catch (e) {
      console.error("Failed to fetch full record details", e);
    }
    return record;
  };

  const filtered = records
    .filter(r => {
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const matchesSearch =
        normalizedSearch === '' ||
        r.patientName.toLowerCase().includes(normalizedSearch) ||
        r.uhid.toLowerCase().includes(normalizedSearch) ||
        r.visitId.toLowerCase().includes(normalizedSearch) ||
        r.doctor.toLowerCase().includes(normalizedSearch) ||
        r.department?.toLowerCase().includes(normalizedSearch) ||
        r.gender.toLowerCase().includes(normalizedSearch);

      const visitDate = new Date(r.visitDateValue || r.visitDate);
      const startDate = fromDate ? new Date(fromDate) : null;
      const endDate = toDate ? new Date(toDate) : null;
      if (endDate) endDate.setHours(23, 59, 59, 999);
      const matchesFrom = !startDate || visitDate >= startDate;
      const matchesTo = !endDate || visitDate <= endDate;

      return matchesSearch && matchesFrom && matchesTo;
    })
    .sort((a, b) => {
      const aDate = new Date(a.visitDateValue || a.visitDate);
      const bDate = new Date(b.visitDateValue || b.visitDate);
      if (!Number.isNaN(aDate.getTime()) && !Number.isNaN(bDate.getTime())) {
        return bDate.getTime() - aDate.getTime();
      }
      return a.patientName.localeCompare(b.patientName);
    });

  const handleClearFilters = () => {
    setSearchText('');
    setSearchQuery('');
    setFromDate('');
    setToDate('');
  };

  const handleView = async (record: EMRRecord) => {
    const fullRecord = await fetchFullRecord(record);
    setViewRecord(fullRecord);
  };

  const handlePrint = async (record: EMRRecord) => {
    if (printRecord?.visitId === record.visitId) {
      setPrintRecord(null);
      setTimeout(async () => {
        const fullRecord = await fetchFullRecord(record);
        setPrintRecord(fullRecord);
      }, 50);
      return;
    }
    const fullRecord = await fetchFullRecord(record);
    setPrintRecord(fullRecord);
  };

  const badgeColors: Record<string, string> = {
    OP: 'bg-blue-100 text-blue-700 border-blue-200',
    IP: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    Emergency: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
        </div>
        <span className={`px-4 py-1.5 text-sm font-bold rounded-xl border ${badgeColors[visitType]}`}>
          {filtered.length} Patient{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-13rem)]">
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2 justify-between bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2 min-w-[200px] max-w-[520px]">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, UHID, department, doctor, or gender..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') setSearchQuery(searchText); }}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <DateFilter
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={() => setSearchQuery(searchText)}
            onReset={handleClearFilters}
          />
        </div>

        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 shadow-sm z-10 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Patient Details</th>
                  <th className="px-6 py-4">UHID</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Doctor</th>
                  <th className="px-6 py-4">Visit Date</th>
                  <th className="px-6 py-4">Billing Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(record => (
                    <tr key={record.visitId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{record.patientName}</p>
                        <p className="text-xs text-slate-500">{record.age}y / {record.gender}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">{record.uhid}</td>
                      <td className="px-6 py-4 text-slate-700 font-medium text-sm">{record.department || '—'}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-700">{record.doctor}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium text-sm">
                        {new Date(record.visitDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${record.billingStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {record.billingStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleView(record)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View EMR"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrint(record)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Print EMR"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewRecord(null)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{viewRecord.patientName}</h2>
                <p className="text-xs text-slate-500">{viewRecord.uhid} &bull; {viewRecord.visitId}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint(viewRecord)}
                  className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={() => setViewRecord(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">{viewRecord && <EMRViewTemplate record={viewRecord} />}</div>
          </div>
        </div>
      )}

      {printRecord && typeof document !== 'undefined' && createPortal(
        <div id="emr-print-area" className="hidden print:block">{renderPrintTemplate(printRecord)}</div>,
        document.body
      )}

      <style>{`
        @media print {
          body > * { display: none !important; }
          #emr-print-area { display: block !important; position: absolute; inset: 0; width: 100%; visibility: visible !important; }
          #emr-print-area * { visibility: visible !important; }
          .print-section { page-break-inside: avoid; break-inside: avoid; }
          .print-page-break { page-break-after: always; break-after: page; }
        }
      `}</style>
    </div>
  );
};
