import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Check, Stethoscope, Pill, Cloud, UserPlus, ShieldCheck, BarChart3, Heart, Plus, CalendarClock, BedDouble, ClipboardList, FlaskConical, ScanLine, ShoppingCart, Boxes, Sparkles, User, CheckCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { setCredentials } from '../redux/slices/authSlice';

const roles = [
  { id: 'admin', label: 'Admin', icon: User },
  { id: 'executive', label: 'CEO / Executive', icon: Sparkles },
  { id: 'registration', label: 'Registration', icon: UserPlus },
  { id: 'appointments', label: 'Appointments', icon: CalendarClock },
  { id: 'opd', label: 'OPD Doctor', icon: Stethoscope },
  { id: 'ipd', label: 'IPD Ward', icon: BedDouble },
  { id: 'emr', label: 'EMR Portal', icon: ClipboardList },
  { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
  { id: 'lab', label: 'Laboratory', icon: FlaskConical },
  { id: 'radiology', label: 'Radiology', icon: ScanLine },
  { id: 'billing', label: 'Billing', icon: BarChart3 },
  { id: 'insurance', label: 'Insurance', icon: ShieldCheck },
  { id: 'pro', label: 'PRO Portal', icon: CheckCircle },
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
];

const API_BASE = import.meta.env.VITE_API_URL as string;

// Landing page for each selected portal role.
const ROLE_ROUTES: Record<string, string> = {
  admin: '/admin',
  executive: '/executive',
  registration: '/registration',
  appointments: '/appointments',
  opd: '/opd',
  ipd: '/ipd',
  emr: '/emr',
  pharmacy: '/pharmacy',
  billing: '/billing',
  lab: '/lab',
  radiology: '/radiology',
  insurance: '/insurance',
  procurement: '/procurement',
  inventory: '/inventory',
  pro: '/pro',
};

export const Login = () => {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  // Where the module guard bounced us from, if anywhere. Used only when it
  // belongs to the portal the user actually selected — see landingRoute below.
  const redirectTo = (location.state as { from?: string } | null)?.from;

  // Role cards are a visual hint only — actual access comes from real credentials.
  const handleRoleSelection = (roleId: string) => {
    setSelectedRole(roleId);
  };

  // Quick-fill for the seeded demo accounts.
  const fillDemo = (u: string, p: string) => { setEmail(u); setPassword(p); setError(''); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email.trim(), password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data && typeof data.detail === 'string' ? data.detail : 'Login failed'));
        return;
      }
      dispatch(setCredentials({
        user: {
          id: String(data.user.id),
          name: data.user.employee || data.user.username,
          role: data.user.role,
          hospitalId: data.user.hospital || '',
          branchId: data.user.branch || '',
          username: data.user.username,
          department: data.user.department || '',
        },
        token: data.token,
        permissions: data.permissions,
        rememberMe,
      }));
      // The selected role decides where the user lands. `from` is only honoured
      // when it sits INSIDE that portal, so returning to an interrupted page
      // still works (session expires on /ipd/discharges -> log back in as IPD ->
      // land back on /ipd/discharges) while an explicit role choice is never
      // overridden. Previously `from` won unconditionally: being bounced off
      // /pharmacy and then logging in as Admin dropped you on Pharmacy.
      const roleHome = ROLE_ROUTES[selectedRole] || '/admin';
      const returnsToSamePortal =
        !!redirectTo && (redirectTo === roleHome || redirectTo.startsWith(`${roleHome}/`));

      navigate(returnsToSamePortal ? redirectTo! : roleHome, { replace: true });
    } catch {
      setError('Cannot reach the server. Please ensure the API is running.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="h-screen w-full flex bg-white overflow-hidden">
      {/* Left Side - Branding (Hidden on mobile) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex lg:w-[60%] relative h-full"
      >
        {/* Modern Hospital Image Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?q=80&w=2000&auto=format&fit=crop"
            alt="Modern Hospital"
            className="w-full h-full object-cover object-center"
          />
        </div>

        <div className="relative z-10 py-10 px-4 xl:py-14 xl:px-6 flex flex-col h-full w-full">
          {/* Premium Logo */}
          <a href="https://techspiresolutions.tech" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer inline-flex w-fit">
            <div className="relative flex items-center justify-center w-12 h-12 drop-shadow-sm mt-[-6px]">
              <Heart className="w-12 h-12 text-[#086450] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={2.5} />
              <Plus className="w-5 h-5 text-[#D4A62A] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[-2px]" strokeWidth={4} />
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-[2.2rem] font-extrabold text-slate-900 leading-none tracking-tight">
                <span className="text-[#086450]">Care</span>Fusions
              </h2>
              <div className="flex items-center gap-2 mt-1.5 w-full opacity-90">
                <div className="h-[2px] bg-gradient-to-r from-transparent via-[#D4A62A] to-[#D4A62A] flex-grow rounded-l-full"></div>
                <span className="text-[#D4A62A] text-[0.7rem] font-bold tracking-[0.3em] uppercase ml-1">ERP</span>
                <div className="h-[2px] bg-gradient-to-l from-transparent via-[#D4A62A] to-[#D4A62A] flex-grow rounded-r-full"></div>
              </div>
            </div>
          </a>

          <div className="mt-12 xl:mt-16 max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold text-slate-900 leading-[1.1]">
              One Platform.<br />
              Complete <span className="text-[#086450]">Healthcare.</span>
            </h1>
            <p className="mt-4 text-slate-700 text-base leading-relaxed font-medium max-w-sm">
              CareFusions ERP streamlines hospital operations, enhances patient care, and empowers healthcare excellence.
            </p>

            {/* Features Grid */}
            <div className="flex flex-wrap gap-3 mt-8 -ml-3 xl:-ml-4">
              <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center w-[90px] h-[90px]">
                <User className="w-6 h-6 text-[#086450] mb-2" strokeWidth={2} />
                <span className="text-[10px] font-semibold text-slate-700 text-center leading-tight">Patient<br />Centric</span>
              </div>
              <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center w-[90px] h-[90px]">
                <ShieldCheck className="w-6 h-6 text-[#D4A62A] mb-2" strokeWidth={2} />
                <span className="text-[10px] font-semibold text-slate-700 text-center leading-tight">Secure &<br />Compliant</span>
              </div>
              <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center w-[90px] h-[90px]">
                <BarChart3 className="w-6 h-6 text-[#086450] mb-2" strokeWidth={2} />
                <span className="text-[10px] font-semibold text-slate-700 text-center leading-tight">Smart<br />Analytics</span>
              </div>
              <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center w-[90px] h-[90px]">
                <Cloud className="w-6 h-6 text-[#086450] mb-2" strokeWidth={2} />
                <span className="text-[10px] font-semibold text-slate-700 text-center leading-tight">Cloud<br />Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <motion.div
        initial={{ opacity: 0, x: "100vw" }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 120 }}
        className="w-full lg:w-[40%] bg-white flex items-center justify-center p-4 lg:p-10 relative z-20 h-full overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <motion.div
          className="w-full max-w-[600px]"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
          }}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="text-center mb-2">
            <motion.div
              className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-primary/20"
              whileHover={{ scale: 1.1, rotate: 5 }}
              animate={{ boxShadow: ['0px 0px 0px 0px rgba(8,100,80,0.3)', '0px 0px 0px 15px rgba(8,100,80,0)', '0px 0px 0px 0px rgba(8,100,80,0)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Shield className="w-5 h-5 text-primary" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-900">Welcome <span className="text-primary">Back!</span></h2>
            <p className="text-slate-500 mt-1 text-sm">Login to access your CareFusions ERP account</p>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="mb-2">
            <p className="text-sm font-bold text-slate-700 mb-1">Select Your Role</p>
            <motion.div
              className="grid grid-cols-3 sm:grid-cols-4 gap-1"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 }
                }
              }}
              initial="hidden"
              animate="show"
            >
              {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <motion.button
                    key={role.id}
                    variants={{
                      hidden: { opacity: 0, x: 300, y: -500 },
                      show: { opacity: 1, x: 0, y: 0, transition: { type: 'spring', stiffness: 100, damping: 12 } }
                    }}
                    type="button"
                    onClick={() => handleRoleSelection(role.id)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all ${isSelected
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-slate-200 hover:border-primary/50 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    <Icon className="w-4 h-4 mb-0.5" strokeWidth={2} />
                    <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">{role.label}</span>
                  </motion.button>
                )
              })}
            </motion.div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">or continue with credentials</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </motion.div>

          <motion.form variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} onSubmit={handleLogin} className="space-y-3 mt-1 max-w-[400px] mx-auto">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-slate-400 font-semibold self-center">Demo:</span>
              <button type="button" onClick={() => fillDemo('admin', 'admin12345')} className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-colors">Super Admin</button>
              <button type="button" onClick={() => fillDemo('reception', 'reception123')} className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-colors">Receptionist</button>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
              <motion.div whileTap={{ scale: 0.995 }} className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-1 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-slate-700 text-sm"
                  placeholder="Enter your username"
                  required
                />
              </motion.div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <motion.div whileTap={{ scale: 0.995 }} className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-1 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 text-slate-700 text-sm"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-transform hover:scale-110"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </motion.div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <motion.label whileHover={{ scale: 1.02 }} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${rememberMe ? 'bg-primary border-primary' : 'border-2 border-slate-300 group-hover:border-primary'}`}>
                  {rememberMe && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="w-4 h-4 text-white" strokeWidth={3} /></motion.div>}
                </div>
                <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                <span className="text-sm font-bold text-slate-700">Remember me</span>
              </motion.label>
              <motion.a whileHover={{ x: 3 }} href="#" className="text-sm font-bold text-primary hover:text-primary-hover">Forgot Password?</motion.a>
            </div>

              <motion.button
              whileHover={{ scale: 1.01, boxShadow: '0 10px 25px -5px rgba(8,100,80, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-1.5 rounded-lg mt-2 flex items-center justify-center gap-2 hover:bg-primary-hover transition-all shadow-lg shadow-primary/30 text-sm disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Login'}
              <motion.span
                initial={{ x: 0 }}
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 1 }}
                className="text-xl leading-none"
              >→</motion.span>
            </motion.button>
          </motion.form>


        </motion.div>
      </motion.div>
    </div>
  );
};
