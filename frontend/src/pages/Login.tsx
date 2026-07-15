import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Check, LayoutDashboard, Stethoscope, Pill, MoreHorizontal, User as UserIcon, Cloud, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { setCredentials } from '../redux/slices/authSlice';

const roles = [
  { id: 'admin', label: 'Admin', icon: UserIcon },
  { id: 'doctor', label: 'Doctor', icon: Stethoscope },
  { id: 'nurse', label: 'Nurse', icon: Shield },
  { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
  { id: 'registration', label: 'Registration', icon: UserPlus },
  { id: 'others', label: 'Others', icon: MoreHorizontal },
];

export const Login = () => {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleRoleSelection = (roleId: string) => {
    setSelectedRole(roleId);
    // Auto-fill credentials based on role
    setEmail(`${roleId}@carefusions.com`);
    setPassword(`pass_${roleId}_123`);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy login logic
    dispatch(setCredentials({
      user: {
        id: '1',
        name: selectedRole === 'admin' ? 'Priya Sharma' : `Test ${selectedRole}`,
        role: selectedRole,
        hospitalId: 'h1',
        branchId: 'b1'
      },
      token: 'dummy_token_123'
    }));
    
    if (selectedRole === 'registration') {
      navigate('/registration');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex p-4 md:p-6 lg:p-8">
      {/* Left Side - Branding (Hidden on mobile) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex w-1/2 relative bg-white rounded-3xl overflow-hidden shadow-sm"
      >
        <div className="absolute inset-0 p-12 flex flex-col z-10 bg-gradient-to-b from-white via-white/90 to-transparent h-1/2">
          <div className="flex items-center gap-2 text-primary">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold tracking-tight">CareFusions <span className="text-secondary text-sm block mt-[-4px] tracking-widest uppercase">ERP</span></span>
          </div>

          <div className="mt-16 max-w-md">
            <h1 className="text-5xl font-bold text-slate-900 leading-tight">
              One Platform.<br />
              Complete <span className="text-primary">Healthcare.</span>
            </h1>
            <p className="mt-6 text-slate-600 text-lg leading-relaxed">
              CareFusions ERP streamlines hospital operations, enhances patient care, and empowers healthcare excellence.
            </p>

            <div className="flex gap-4 mt-10">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center min-w-[90px]">
                <UserIcon className="w-8 h-8 text-primary mb-2" />
                <span className="text-xs font-semibold text-center">Patient<br />Centric</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center min-w-[90px]">
                <Shield className="w-8 h-8 text-secondary mb-2" />
                <span className="text-xs font-semibold text-center">Secure &<br />Compliant</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center min-w-[90px]">
                <LayoutDashboard className="w-8 h-8 text-success mb-2" />
                <span className="text-xs font-semibold text-center">Smart<br />Analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Hospital Image Background */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?q=80&w=2000&auto=format&fit=crop"
            alt="Modern Hospital"
            className="w-full h-full object-cover object-center"
          />
          {/* Additional subtle overlay to make text pop */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Welcome <span className="text-primary">Back!</span></h2>
            <p className="text-slate-500 mt-2">Sign in to access your CareFusions ERP account</p>
          </div>

          <div className="mb-8">
            <p className="text-sm font-semibold text-slate-700 mb-4">Select Your Role</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {roles.map(role => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleSelection(role.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${isSelected
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 hover:border-primary/50 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    <Icon className="w-6 h-6 mb-2" />
                    <span className="text-[10px] font-semibold">{role.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-xs text-slate-400 uppercase tracking-wide">or continue with credentials</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 mt-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username / Email</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-slate-700"
                  placeholder="Enter your username or email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-slate-700"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${rememberMe ? 'bg-primary border-primary' : 'border-2 border-slate-300 group-hover:border-primary'}`}>
                  {rememberMe && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                <span className="text-sm font-semibold text-slate-700">Remember me</span>
              </label>
              <a href="#" className="text-sm font-semibold text-primary hover:text-primary-hover">Forgot Password?</a>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl mt-4 flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors shadow-lg shadow-primary/30"
            >
              Sign In
              <span className="text-xl leading-none">→</span>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-secondary" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Need help? <a href="#" className="text-primary font-semibold hover:underline">Contact Support</a></p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
