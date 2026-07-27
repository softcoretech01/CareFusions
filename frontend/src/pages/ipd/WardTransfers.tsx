import { useState, useMemo } from 'react';
import { useIPD } from '../../contexts/IPDContext';
import { Search, Plus, Eye, Pencil, X, ArrowRightLeft } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { DateFilter } from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';

interface TransferWithPatient {
  id: string;
  patientId: number;
  patientName: string;
  uhid: string;
  fromWardId: number;
  toWardId: number;
  fromBedId: number;
  toBedId: number;
  transferDate: string;
  transferReason: string;
  // Patient basic details for view
  age?: number;
  gender?: string;
  admittingDoctor?: string;
  specialty?: string;
  provisionalDiagnosis?: string;
}

export const WardTransfers = () => {
  const { patients, wards, beds, allocateBed } = useIPD();

  // Search state for main history table
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);
  const [appliedSearch, setAppliedSearch] = useState('');

  // New Transfer Modal
  const [showModal, setShowModal] = useState(false);

  // View Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTransfer, setViewTransfer] = useState<TransferWithPatient | null>(null);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTransfer, setEditTransfer] = useState<TransferWithPatient | null>(null);
  const [editReason, setEditReason] = useState('');

  // Transfer form state (inside modal)
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [transferForm, setTransferForm] = useState({
    targetWardId: '',
    targetBedId: '',
    reason: ''
  });

  // Calculate global transfer history
  const allTransfers: TransferWithPatient[] = useMemo(() => {
    const transfers: TransferWithPatient[] = [];
    patients.forEach(p => {
      if (p.wardTransferHistory) {
        p.wardTransferHistory.forEach(t => {
          transfers.push({
            ...t,
            patientId: p.id,
            patientName: p.patientName,
            uhid: p.uhid,
            age: p.age,
            gender: p.gender,
            admittingDoctor: p.admittingDoctor,
            specialty: p.specialty,
            provisionalDiagnosis: p.provisionalDiagnosis,
          });
        });
      }
    });
    return transfers.sort((a, b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime());
  }, [patients]);

  // Filter global history based on search
  const filteredTransfers = allTransfers.filter(t => {
    const matchesSearch = t.patientName.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      t.uhid.toLowerCase().includes(appliedSearch.toLowerCase());
    let matchesDate = true;
    if (appliedDateFrom && appliedDateTo) {
      const tDate = new Date(t.transferDate).toISOString().split('T')[0];
      matchesDate = tDate >= appliedDateFrom && tDate <= appliedDateTo;
    }
    return matchesSearch && matchesDate;
  });

  const handleSearch = () => {
    setAppliedSearch(search);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleReset = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setAppliedSearch('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
  };

  // Modal logic
  const activePatients = patients.filter(p => p.status === 'Admitted');
  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const currentWard = wards.find(w => w.id === selectedPatient?.currentWardId);
  const currentBed = beds.find(b => b.id === selectedPatient?.currentBedId);
  const availableBeds = beds.filter(b => b.wardId === Number(transferForm.targetWardId) && b.status === 'Available');

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !transferForm.targetBedId) {
      toast.error('Please select a patient and a new bed.');
      return;
    }
    allocateBed(selectedPatientId, Number(transferForm.targetBedId), transferForm.reason);
    toast.success('Patient transferred successfully!');
    setSelectedPatientId(null);
    setTransferForm({ targetWardId: '', targetBedId: '', reason: '' });
    setShowModal(false);
  };

  const openViewModal = (t: TransferWithPatient) => {
    setViewTransfer(t);
    setShowViewModal(true);
  };

  const openEditModal = (t: TransferWithPatient) => {
    setEditTransfer(t);
    setEditReason(t.transferReason);
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    toast.success('Transfer reason updated.');
    setShowEditModal(false);
    setEditTransfer(null);
  };

  const inputCls = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Ward Transfers</h1>
        </div>
        <button
          onClick={() => {
            setSelectedPatientId(null);
            setTransferForm({ targetWardId: '', targetBedId: '', reason: '' });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-primary text-white font-bold rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" /> New Transfer
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50 flex-wrap">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <DateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 shadow-sm z-10 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left">Date &amp; Time</th>
                <th className="px-6 py-4 text-left">Patient Details</th>
                <th className="px-6 py-4 text-left">From Ward/Bed</th>
                <th className="px-6 py-4 text-left">To Ward/Bed</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No transfer history found.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(transfer => {
                  const fromWard = wards.find(w => w.id === transfer.fromWardId);
                  const toWard = wards.find(w => w.id === transfer.toWardId);
                  const fromBed = beds.find(b => b.id === transfer.fromBedId);
                  const toBed = beds.find(b => b.id === transfer.toBedId);

                  return (
                    <tr key={transfer.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-slate-700">{new Date(transfer.transferDate).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-500">{new Date(transfer.transferDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{transfer.patientName}</p>
                        <p className="text-xs text-slate-500">{transfer.uhid}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-700">{fromWard?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">Bed: {fromBed?.bedNumber || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{toWard?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-600">Bed: {toBed?.bedNumber || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openViewModal(transfer)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View transfer details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(transfer)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit transfer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Initiate Ward Transfer" maxWidth="md">
        <form onSubmit={handleTransfer} className="space-y-5 p-1">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Patient</label>
            <select
              value={selectedPatientId || ''}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              className={inputCls}
              required
            >
              <option value="">-- Select Patient --</option>
              {activePatients.map(p => (
                <option key={p.id} value={p.id}>{p.patientName} (UHID: {p.uhid})</option>
              ))}
            </select>
          </div>

          {selectedPatient && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">Current Location</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{currentWard?.name}</p>
              <p className="text-xs font-bold text-indigo-600">Bed {currentBed?.bedNumber} • Room {currentBed?.roomNumber}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Ward</label>
            <select
              value={transferForm.targetWardId}
              onChange={e => setTransferForm({ ...transferForm, targetWardId: e.target.value, targetBedId: '' })}
              className={inputCls}
              required
            >
              <option value="">Select Target Ward</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name} ({w.type})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Bed</label>
            <select
              value={transferForm.targetBedId}
              onChange={e => setTransferForm({ ...transferForm, targetBedId: e.target.value })}
              className={inputCls}
              required
              disabled={!transferForm.targetWardId}
            >
              <option value="">Select Bed</option>
              {availableBeds.map(b => <option key={b.id} value={b.id}>{b.bedNumber} (Room {b.roomNumber})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reason for Transfer</label>
            <textarea
              rows={3}
              value={transferForm.reason}
              onChange={e => setTransferForm({ ...transferForm, reason: e.target.value })}
              className={inputCls}
              placeholder="e.g. Condition deteriorated, moving to ICU"
              required
            />
          </div>

          <div className="flex justify-end pt-2 gap-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              Execute Transfer
            </button>
          </div>
        </form>
      </Modal>

      {/* View Transfer Details Modal */}
      {showViewModal && viewTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Transfer Details</h2>
                  <p className="text-xs text-slate-500">{new Date(viewTransfer.transferDate).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Patient Basic Info */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Patient Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="font-bold text-slate-800">{viewTransfer.patientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">UHID</p>
                    <p className="font-bold text-slate-700">{viewTransfer.uhid}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Age / Gender</p>
                    <p className="font-semibold text-slate-700">{viewTransfer.age} yrs / {viewTransfer.gender}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Specialty</p>
                    <p className="font-semibold text-slate-700">{viewTransfer.specialty}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Admitting Doctor</p>
                    <p className="font-semibold text-slate-700">{viewTransfer.admittingDoctor}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500">Diagnosis</p>
                    <p className="font-semibold text-slate-700">{viewTransfer.provisionalDiagnosis}</p>
                  </div>
                </div>
              </div>
              {/* Transfer Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                  <p className="text-xs font-bold text-red-400 uppercase mb-1">From</p>
                  <p className="font-bold text-slate-800">{wards.find(w => w.id === viewTransfer.fromWardId)?.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">Bed: {beds.find(b => b.id === viewTransfer.fromBedId)?.bedNumber || 'N/A'}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                  <p className="text-xs font-bold text-green-500 uppercase mb-1">To</p>
                  <p className="font-bold text-slate-800">{wards.find(w => w.id === viewTransfer.toWardId)?.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">Bed: {beds.find(b => b.id === viewTransfer.toBedId)?.bedNumber || 'N/A'}</p>
                </div>
              </div>
              {/* Reason */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-xs font-bold text-amber-500 uppercase mb-1">Transfer Reason</p>
                <p className="text-sm text-slate-700">{viewTransfer.transferReason || 'No reason provided.'}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-5 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transfer Modal */}
      {showEditModal && editTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Edit Transfer</h2>
                  <p className="text-xs text-slate-500">{editTransfer.patientName} — {editTransfer.uhid}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-0.5">From</p>
                  <p className="font-bold text-slate-700">{wards.find(w => w.id === editTransfer.fromWardId)?.name}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-0.5">To</p>
                  <p className="font-bold text-slate-700">{wards.find(w => w.id === editTransfer.toWardId)?.name}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transfer Reason</label>
                <textarea
                  rows={4}
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  className={inputCls}
                  placeholder="Enter reason for transfer"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-5 py-2 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="px-5 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
