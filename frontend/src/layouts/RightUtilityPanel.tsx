import { Sparkles, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export const RightUtilityPanel = () => {
  return (
    <motion.aside 
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      className="h-screen bg-card border-l border-border sticky top-0 hidden xl:flex flex-col"
    >
      <div className="p-6 border-b border-border/50">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Insights
        </h3>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Dr. Doe, you have 3 high-priority patient reviews pending in the Cardiology ward.
        </p>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-4">Upcoming Schedule</h3>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">Heart Surgery</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>10:00 AM - 12:30 PM • OT Room 4</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.aside>
  );
};
