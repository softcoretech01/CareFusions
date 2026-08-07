import { Lock } from 'lucide-react';

/**
 * Shown where a screen has no backing data source.
 *
 * The prototype filled these pages with invented figures — hardcoded revenue,
 * NPS scores, vendor spend and compliance percentages that no service produced.
 * Naming the missing module is more useful than a plausible-looking number.
 */
export const NoDataNotice = ({
  title,
  needs,
  detail,
}: {
  title: string;
  /** The module or feature that would supply this data. */
  needs: string;
  detail?: string;
}) => (
  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 flex items-start gap-4">
    <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
      <Lock className="w-5 h-5" />
    </div>
    <div>
      <h3 className="font-bold text-slate-700">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">
        No data source yet — this needs the <span className="font-semibold text-slate-700">{needs}</span> module.
      </p>
      {detail && <p className="text-xs text-slate-400 mt-1.5">{detail}</p>}
    </div>
  </div>
);
