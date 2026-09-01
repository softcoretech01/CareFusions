export const RegistrationTopNavigation = () => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = 'Sarah Jenkins';

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      {/* Greeting removed as requested */}
      <div className="hidden md:block shrink-0">
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 cursor-pointer p-1.5 rounded-xl hover:bg-hover transition-colors">
          <div className="text-right hidden md:block mr-2">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Registration Desk</p>
            <p className="text-sm font-semibold text-foreground leading-none">{name}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold shadow-sm">
            SJ
          </div>
        </div>
      </div>
    </header>
  );
};
