import { useAppSelector } from '../hooks/redux';
import { PROSidebar } from '../components/pro/PROSidebar';
import { useAuthRedirect, ModuleOutlet } from '../components/auth/ModuleGuard';
import { motion } from 'framer-motion';

const PROTopNavigation = () => {
  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm print:hidden">
      <div className="hidden md:block shrink-0"></div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 cursor-pointer p-1.5 rounded-xl hover:bg-hover transition-colors">
          <div className="text-right hidden md:block mr-2">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">PRO Portal</p>
            <p className="text-sm font-semibold text-foreground leading-none">PRO Officer</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold shadow-sm">
            PR
          </div>
        </div>
      </div>
    </header>
  );
};

export const PROLayout = () => {
  const authRedirect = useAuthRedirect();
  if (authRedirect) return authRedirect;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PROSidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <PROTopNavigation />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar print:p-0 print:overflow-visible">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="h-full"
          >
            <ModuleOutlet module="PRO" />
          </motion.div>
        </main>
      </div>
    </div>
  );
};
