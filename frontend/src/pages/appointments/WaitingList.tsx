
import { Clock, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const WaitingList = () => {
  const dummyWaiting = [
    { id: 1, name: 'Alice Walker', requestedDoc: 'Dr. Sarah Jenkins', date: '2023-10-25', added: '2 hours ago', priority: 'High' },
    { id: 2, name: 'Tom Hardy', requestedDoc: 'Dr. Michael Chen', date: '2023-10-25', added: '4 hours ago', priority: 'Normal' },
  ];

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Waiting List</h1>
          <p className="text-slate-500 mt-1">Patients waiting for a cancellation slot.</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold sticky top-0">
              <tr>
                <th className="px-6 py-4">Patient Name</th>
                <th className="px-6 py-4">Requested Doctor</th>
                <th className="px-6 py-4">Preferred Date</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Wait Time</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dummyWaiting.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-6 py-4 text-slate-600">{item.requestedDoc}</td>
                  <td className="px-6 py-4 text-slate-600">{item.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {item.added}
                  </td>
                  <td className="px-6 py-4">
                    <Button size="sm" variant="outline" color="primary" icon={CheckCircle}>Assign Slot</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
