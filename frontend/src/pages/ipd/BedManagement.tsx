import { useState } from 'react';
import { useIPD } from '../../contexts/IPDContext';
import type { IPDPatient, Bed } from '../../contexts/IPDContext';
import { Activity, Stethoscope, X, User, Calendar, BedDouble, Clock } from 'lucide-react';
import { IpdErrorBanner } from './IpdErrorBanner';

export const BedManagement = () => {
  const { wards, beds, patients } = useIPD();
  const [selectedWard, setSelectedWard] = useState<number | 'All'>('All');

  // Patient detail popup
  const [popupPatient, setPopupPatient] = useState<IPDPatient | null>(null);
  const [popupBed, setPopupBed] = useState<Bed | null>(null);

  const filteredWards = selectedWard === 'All' ? wards : wards.filter(w => w.id === selectedWard);

  const handleBedClick = (bed: Bed) => {
    if (bed.status !== 'Occupied') return;
    const patient = patients.find(p => p.currentBedId === bed.id && p.status === 'Admitted');
    if (patient) {
      setPopupPatient(patient);
      setPopupBed(bed);
    }
  };

  return (
    <div className="space-y-4">
      <IpdErrorBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bed Management</h1>
        </div>
        <select
          className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-primary"
          value={selectedWard}
          onChange={(e) => setSelectedWard(e.target.value === 'All' ? 'All' : Number(e.target.value))}
        >
          <option value="All">All Wards</option>
          {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      <div className="space-y-8">
        {filteredWards.map(ward => {
          const wardBeds = beds.filter(b => b.wardId === ward.id);
          const occupiedCount = wardBeds.filter(b => b.status === 'Occupied').length;
          const isOT = ward.type === 'OT';

          return (
            <div
              key={ward.id}
              className={`bg-white rounded-3xl border p-6 shadow-sm ${
                isOT ? 'border-purple-200 ring-1 ring-purple-100' : 'border-slate-100'
              }`}
            >
              {/* Ward header */}
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  {isOT ? (
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-purple-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-slate-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{ward.name}</h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {isOT ? 'OT Complex' : `Type: ${ward.type}`} &bull; {occupiedCount}/{ward.capacity}{' '}
                      {isOT ? 'Tables Occupied' : 'Occupied'}
                    </p>
                  </div>
                </div>
                {isOT && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 uppercase tracking-wide">
                    Operation Theater
                  </span>
                )}
              </div>

              {/* Rooms grid */}
              <div className="space-y-4">
                {Object.entries(
                  wardBeds.reduce((acc, bed) => {
                    const room = bed.roomNumber || 'Unknown Room';
                    if (!acc[room]) acc[room] = [];
                    acc[room].push(bed);
                    return acc;
                  }, {} as Record<string, typeof beds>)
                ).map(([room, roomBeds]) => (
                  <div key={room} className={`rounded-2xl p-4 border ${isOT ? 'bg-purple-50/40 border-purple-100' : 'bg-slate-50 border-slate-100'}`}>
                    <h4 className={`text-sm font-bold mb-4 border-b pb-2 ${isOT ? 'text-purple-700 border-purple-200' : 'text-slate-600 border-slate-200'}`}>
                      {isOT ? `🏥 ${room}` : `Room no: ${room}`}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {roomBeds.map(bed => {
                        const patient = patients.find(p => p.currentBedId === bed.id && p.status === 'Admitted');
                        const isOccupied = bed.status === 'Occupied';

                        const cardCls = isOccupied
                          ? isOT
                            ? 'border-purple-300 bg-purple-50 hover:shadow-lg cursor-pointer'
                            : 'border-indigo-200 bg-indigo-50/30 hover:shadow-lg cursor-pointer hover:border-indigo-400'
                          : bed.status === 'Cleaning'
                          ? 'border-amber-200 bg-amber-50/20 cursor-default'
                          : isOT
                          ? 'border-purple-200/60 bg-white hover:border-purple-400/50 cursor-default'
                          : 'border-slate-200 bg-white hover:border-primary/40 cursor-default';

                        const dotCls = isOccupied
                          ? isOT ? 'bg-purple-500' : 'bg-indigo-500'
                          : bed.status === 'Cleaning'
                          ? 'bg-amber-500'
                          : 'bg-green-500';

                        return (
                          <div
                            key={bed.id}
                            onClick={() => handleBedClick(bed)}
                            className={`relative p-4 rounded-2xl border transition-all ${cardCls}`}
                            title={isOccupied ? 'Click to view patient details' : bed.status}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-slate-700 text-sm">{bed.bedNumber}</span>
                              <span className={`w-2.5 h-2.5 rounded-full ${dotCls}`} />
                            </div>

                            {isOccupied && patient ? (
                              <div>
                                <p className="text-xs font-bold text-slate-800 truncate">{patient.patientName}</p>
                                <p className="text-[10px] text-slate-500 truncate">{patient.uhid}</p>
                              </div>
                            ) : (
                              <p className={`text-xs font-medium ${isOT && bed.status === 'Available' ? 'text-purple-400' : 'text-slate-400'}`}>
                                {bed.status}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Patient Detail Popup */}
      {popupPatient && popupBed && (() => {
        const ward = wards.find(w => w.id === popupPatient.currentWardId);
        const los = Math.max(0, Math.floor((Date.now() - new Date(popupPatient.admissionDate).getTime()) / 86400000));

        return (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => { setPopupPatient(null); setPopupBed(null); }}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-primary flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{popupPatient.patientName}</h2>
                    <p className="text-indigo-200 text-sm">{popupPatient.uhid} &bull; {popupPatient.age}y / {popupPatient.gender}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setPopupPatient(null); setPopupBed(null); }}
                  className="text-white/70 hover:text-white transition-colors mt-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Bed info */}
                <div className="flex items-center gap-3 bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                  <BedDouble className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div>
                    <p className="text-xs text-indigo-500 font-bold uppercase">Current Bed</p>
                    <p className="font-bold text-slate-800 text-sm">{popupBed.bedNumber} &bull; {ward?.name}</p>
                    <p className="text-xs text-slate-500">Room no: {popupBed.roomNumber}</p>
                  </div>
                </div>

                {/* Grid info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-0.5">Blood Group</p>
                    <p className="font-bold text-slate-800">{popupPatient.bloodGroup}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-0.5">Priority</p>
                    <p className={`font-bold text-sm ${popupPatient.priority === 'Emergency' ? 'text-red-600' : 'text-slate-800'}`}>
                      {popupPatient.priority}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-0.5">Specialty</p>
                    <p className="font-bold text-slate-800 text-sm">{popupPatient.specialty}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-0.5">Insurance</p>
                    <p className="font-bold text-slate-800 text-sm">{popupPatient.insuranceStatus}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-400 font-bold uppercase mb-0.5">Admitting Doctor</p>
                  <p className="font-bold text-slate-800">{popupPatient.admittingDoctor}</p>
                </div>

                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-xs text-amber-500 font-bold uppercase mb-0.5">Diagnosis</p>
                  <p className="font-semibold text-slate-700 text-sm">{popupPatient.provisionalDiagnosis}</p>
                </div>

                {/* Footer dates */}
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Admitted: {new Date(popupPatient.admissionDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    LOS: {los} day{los !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
