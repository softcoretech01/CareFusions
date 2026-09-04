import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useEffect } from 'react';
import { Pill, Plus, Check, Loader2, Trash2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { MedicineSearch, loadMedicines, medicineLabel, type MasterMedicine } from '../ui/MedicineSearch';


export interface MarMedication {
  id: string;
  medicineId: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  route: string;
  administrations: Record<string, boolean>; // e.g. "Morning": true
}

interface MarGridProps {
  patientId: number; // AdmissionId
}

const API_BASE = API_BASE_URL;

export const MarGrid: React.FC<MarGridProps> = ({ patientId }) => {
  const [medications, setMedications] = useState<MarMedication[]>([]);
  const [medicines, setMedicines] = useState<MasterMedicine[]>([]);   // from /medicines master
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    medicineId: '',
    dosage: '',
    frequencyType: 'Scheduled' as 'Scheduled' | 'SOS' | 'STAT',
    scheduledSlots: {
      Morning: false,
      Afternoon: false,
      Evening: false,
      Night: false
    } as Record<string, boolean>,
    route: 'Oral'
  });
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!isPrinting) return;
    const timer = window.setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, [isPrinting]);

  useEffect(() => {
    const clearPrint = () => setIsPrinting(false);
    window.addEventListener('afterprint', clearPrint);
    return () => window.removeEventListener('afterprint', clearPrint);
  }, []);

  const fetchMedications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ipd-visits/${patientId}/details`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.medications) {
          const mapped = data.medications.map((m: any) => ({
            id: String(m.MedicationId),
            medicineId: m.MedicineId || m.MedicationId,
            medicineName: m.MedicineName,
            dosage: m.Dosage,
            frequency: m.Frequency,
            route: m.Route,
            administrations: m.Administrations || {}
          }));
          setMedications(mapped);
        }
      }
    } catch (e) {
      toast.error('Failed to load medications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, [patientId]);

  // Medicine list comes from the Medicine master (Active only), through the
  // same cache the OPD and discharge pickers use.
  useEffect(() => {
    let alive = true;
    loadMedicines()
      .then(list => { if (alive) setMedicines(list); })
      .catch(() => { /* offline — the picker shows its own error */ });
    return () => { alive = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicineId || !formData.dosage) {
      toast.error('Please fill all required fields');
      return;
    }

    const med = medicines.find(m => m.id === Number(formData.medicineId));
    if (!med) return;

    const isScheduled = formData.frequencyType === 'Scheduled';
    const activeSlots = Object.keys(formData.scheduledSlots).filter(k => formData.scheduledSlots[k]);
    if (isScheduled && activeSlots.length === 0) {
      toast.error('Please select at least one time slot');
      return;
    }

    const finalFrequency = isScheduled ? activeSlots.join(', ') : formData.frequencyType;

    // A brand-new MAR entry has no administrations yet. Crucially we must NOT
    // send `administrations` here: the backend treats a present administrations
    // object as an "update the admin checkboxes on an existing med" call, so an
    // empty {} made the new medication silently not insert.
    const payload = {
      admissionId: patientId,
      medication: {
        medicineId: med.id,
        medicineName: medicineLabel(med),
        dosage: formData.dosage,
        frequency: finalFrequency,
        route: formData.route,
      }
    };

    try {
      const res = await fetch(`${API_BASE}/ipd-visits/save-clinical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Medication added to MAR');
        setIsAdding(false);
        setFormData({ 
          medicineId: '', 
          dosage: '', 
          frequencyType: 'Scheduled',
          scheduledSlots: { Morning: false, Afternoon: false, Evening: false, Night: false },
          route: 'Oral' 
        });
        fetchMedications();
      } else {
        toast.error('Failed to add medication');
      }
    } catch (e) {
      toast.error('Failed to add medication');
    }
  };

  const toggleAdministration = async (medId: string, medicineId: number, slot: string) => {
    const med = medications.find(m => m.id === medId);
    if (!med) return;

    const newAdmin = { ...med.administrations, [slot]: !med.administrations[slot] };

    setMedications(meds => meds.map(m => {
      if (m.id === medId) {
        return { ...m, administrations: newAdmin };
      }
      return m;
    }));

    const payload = {
      admissionId: patientId,
      medication: {
        medicineId: medicineId,
        medicineName: med.medicineName,
        dosage: med.dosage,
        frequency: med.frequency,
        route: med.route,
        administrations: newAdmin
      }
    };

    try {
      await fetch(`${API_BASE}/ipd-visits/save-clinical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      toast.error('Failed to sync administration');
    }
  };

  // Delete removes the row from hospital.IpdMedication by MedicationId — the same
  // table save-clinical writes to — so a med added here can also be removed here.
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/ipd/medications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Medication removed');
      fetchMedications();
    } catch (e) {
      console.error('[MAR] delete failed', e);
      toast.error('Failed to remove medication');
    }
  };

  const timeSlots = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white';

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <Pill className="w-5 h-5 text-primary" /> Medication Administration Record (MAR)
        </h3>
        {!isAdding && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrinting(true)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-primary hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Medication
            </button>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <h4 className="font-bold text-slate-800 mb-3">Add to MAR</h4>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Medication</label>
                <MedicineSearch
                  value={formData.medicineId ? Number(formData.medicineId) : ''}
                  onSelect={m => setFormData({ ...formData, medicineId: m ? String(m.id) : '' })}
                  placeholder="Search medicine…"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dosage</label>
                <input required type="text" placeholder="e.g. 500mg" value={formData.dosage} onChange={e => setFormData({ ...formData, dosage: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Route</label>
                <select value={formData.route} onChange={e => setFormData({ ...formData, route: e.target.value })} className={inputCls}>
                  <option value="Oral">Oral</option>
                  <option value="IV">IV</option>
                  <option value="IM">IM</option>
                  <option value="SC">Subcutaneous</option>
                  <option value="Topical">Topical</option>
                  <option value="Drops">Drops</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Schedule</label>
              <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={formData.frequencyType === 'Scheduled'} onChange={() => setFormData({ ...formData, frequencyType: 'Scheduled' })} className="text-primary focus:ring-primary" />
                  <span className="text-sm font-bold text-slate-700">Scheduled Times</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={formData.frequencyType === 'SOS'} onChange={() => setFormData({ ...formData, frequencyType: 'SOS' })} className="text-primary focus:ring-primary" />
                  <span className="text-sm font-bold text-slate-700">SOS (As needed)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={formData.frequencyType === 'STAT'} onChange={() => setFormData({ ...formData, frequencyType: 'STAT' })} className="text-primary focus:ring-primary" />
                  <span className="text-sm font-bold text-slate-700">STAT (Immediately)</span>
                </label>
              </div>

              {formData.frequencyType === 'Scheduled' && (
                <div className="mt-3 flex items-center gap-4 flex-wrap bg-primary/5 p-3 rounded-xl border border-primary/10">
                  {timeSlots.map(slot => (
                    <label key={slot} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.scheduledSlots[slot]}
                        onChange={(e) => setFormData({
                          ...formData,
                          scheduledSlots: { ...formData.scheduledSlots, [slot]: e.target.checked }
                        })}
                        className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary"
                      />
                      <span className="text-sm font-bold text-slate-700">{slot}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-300 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors">Save to MAR</button>
            </div>
          </form>
        </div>
      )}

      {medications.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium">
          <Pill className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          No active medications for this patient.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold">Medication</th>
                <th className="px-4 py-3 font-bold">Dose/Route</th>
                <th className="px-4 py-3 font-bold">Freq</th>
                {timeSlots.map(slot => (
                  <th key={slot} className="px-2 py-3 font-bold text-center w-24">{slot}</th>
                ))}
                <th className="px-2 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {medications.map(med => (
                <tr key={med.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{med.medicineName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{med.dosage}</span>
                    <span className="text-slate-400 ml-1">({med.route})</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {med.frequency}
                    </span>
                  </td>
                  {timeSlots.map(slot => {
                    const isGiven = med.administrations?.[slot];
                    const isScheduledStyle = timeSlots.some(s => med.frequency.includes(s));
                    const isActionable = isScheduledStyle ? med.frequency.includes(slot) : true;
                    
                    return (
                      <td key={slot} className="px-2 py-3 text-center">
                        {isActionable ? (
                          <button
                            onClick={() => toggleAdministration(med.id, med.medicineId, slot)}
                            className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-colors border ${
                              isGiven
                                ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-300 hover:border-emerald-300 hover:text-emerald-400'
                            }`}
                            title={isGiven ? `Given in ${slot}` : `Mark given in ${slot}`}
                          >
                            {isGiven && <Check className="w-5 h-5" />}
                          </button>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-3 text-right">
                    <button
                      onClick={() => handleDelete(med.id)}
                      title="Remove medication"
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* HIDDEN PRINT AREA */}
      {isPrinting && (
        <div id="ipd-mar-print" className="hidden print:block print-isolated bg-white w-full h-full text-black print:p-0">
          <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center border-b-2 border-slate-800 pb-6 mb-8">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">CAREFUSIONS HOSPITAL</h1>
              <p className="text-sm text-slate-600 mt-1">123 Healthcare Ave, Medical District • Ph: (555) 123-4567</p>
              <h2 className="text-xl font-bold text-slate-800 mt-4 uppercase tracking-widest">Medication Administration Record (MAR)</h2>
            </div>
            
            {/* Patient Info */}
            <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <p className="text-sm text-slate-500">Admission ID</p>
                <p className="font-bold text-slate-900">{patientId}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Date Printed</p>
                <p className="font-bold text-slate-900">{new Date().toLocaleString()}</p>
              </div>
            </div>

            {/* MAR List */}
            <div className="space-y-6">
              {medications.length === 0 ? (
                <p className="text-slate-500 italic">No medications recorded.</p>
              ) : (
                <table className="w-full text-sm text-left border-collapse border border-slate-300">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-300 px-4 py-2 font-bold text-slate-800">Medication</th>
                      <th className="border border-slate-300 px-4 py-2 font-bold text-slate-800 text-center">Dosage</th>
                      <th className="border border-slate-300 px-4 py-2 font-bold text-slate-800 text-center">Route</th>
                      <th className="border border-slate-300 px-4 py-2 font-bold text-slate-800 text-center">Freq</th>
                      {timeSlots.map(slot => (
                        <th key={slot} className="border border-slate-300 px-2 py-2 font-bold text-slate-800 text-center">{slot}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map(med => (
                      <tr key={med.id}>
                        <td className="border border-slate-300 px-4 py-2 font-medium text-slate-900">{med.medicineName}</td>
                        <td className="border border-slate-300 px-4 py-2 text-center text-slate-700">{med.dosage}</td>
                        <td className="border border-slate-300 px-4 py-2 text-center text-slate-700">{med.route}</td>
                        <td className="border border-slate-300 px-4 py-2 text-center font-bold text-slate-800">{med.frequency}</td>
                        {timeSlots.map(slot => {
                          const isGiven = med.administrations[slot];
                          const isScheduledStyle = timeSlots.some(s => med.frequency.includes(s));
                          const isActionable = isScheduledStyle ? med.frequency.includes(slot) : true;
                          return (
                            <td key={slot} className="border border-slate-300 px-2 py-2 text-center font-bold">
                              {isActionable ? (isGiven ? '✓' : '') : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-end text-sm text-slate-500">
              <p>Generated by CareFusions ERP</p>
              <div className="text-center">
                <div className="w-48 border-b border-slate-400 mb-2"></div>
                <p>Nurse Signature</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
