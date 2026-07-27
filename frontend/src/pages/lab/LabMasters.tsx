
import { Beaker, FileText, Settings, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LabMasters = () => {
  const masterLinks = [
    {
      title: 'Test Master',
      description: 'Configure individual lab tests, normal ranges, and pricing.',
      icon: Beaker,
      path: '/admin/laboratory-masters/test-master',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Sample Type Master',
      description: 'Manage sample types, collection methods, and storage requirements.',
      icon: FileText,
      path: '/admin/laboratory-masters/sample-type-master',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Profile Master',
      description: 'Group multiple tests into profiles or panels with combined pricing.',
      icon: Settings,
      path: '/admin/laboratory-masters/profile-master',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    }
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Laboratory Masters</h2>
        <p className="text-slate-500 text-sm mt-1">Configure lab master data and test setups.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {masterLinks.map((link, idx) => (
          <Link key={idx} to={link.path} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group flex flex-col h-full">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${link.bgColor} ${link.color}`}>
              <link.icon className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{link.title}</h3>
            <p className="text-sm text-slate-500 flex-1">{link.description}</p>
            <div className="mt-6 flex items-center text-sm font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              Configure <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
