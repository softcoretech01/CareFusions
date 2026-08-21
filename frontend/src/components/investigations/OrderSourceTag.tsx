import { BedDouble, Stethoscope } from 'lucide-react';
import type { InvestigationOrder } from '../../contexts/InvestigationContext';

export type InvestigationSource = 'IPD' | 'OPD';

// Where the investigation was originally requested. An admitted patient's tab
// lists their earlier OPD work alongside ward orders, so each row has to say
// which episode it came from — otherwise a scan requested at the clinic reads
// as if the ward had ordered it.
export const orderSource = (type: InvestigationOrder['type']): InvestigationSource =>
  type === 'IP' ? 'IPD' : 'OPD';

interface OrderSourceTagProps {
  source: InvestigationSource;
  className?: string;
}

export const OrderSourceTag: React.FC<OrderSourceTagProps> = ({ source, className = '' }) => {
  const isInpatient = source === 'IPD';
  const Icon = isInpatient ? BedDouble : Stethoscope;

  return (
    <span
      title={isInpatient ? 'Requested during this inpatient admission' : 'Requested during an OPD visit'}
      className={`px-2 py-0.5 text-[10px] font-bold rounded-md border inline-flex items-center gap-1 whitespace-nowrap ${
        isInpatient
          ? 'bg-teal-50 text-teal-700 border-teal-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      } ${className}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      Applied in {source}
    </span>
  );
};
