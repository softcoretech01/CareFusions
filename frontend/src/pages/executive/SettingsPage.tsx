
import { Bell, Shield, Palette } from 'lucide-react';

export const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Portal Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure your executive dashboard experience.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Appearance */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800">Appearance</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Theme Preference</label>
              <select className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-primary">
                <option>Light Mode (Default)</option>
                <option>Dark Mode (Coming Soon)</option>
                <option>System Default</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Default Currency</label>
              <select className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-primary">
                <option>INR (₹)</option>
                <option>USD ($)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800">Notifications</h3>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-slate-700">Email Alerts (Critical)</span>
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-primary focus:ring-primary" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-slate-700">Daily Summary Email</span>
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-primary focus:ring-primary" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-slate-700">Push Notifications</span>
              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" />
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800">Security</h3>
          </div>
          <div className="space-y-4">
            <button className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
              Change Password
            </button>
            <button className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
              Enable Two-Factor (2FA)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
