import { X } from 'lucide-react';

interface MultiSelectFieldProps {
  label: string;
  /** Names to choose from, usually pulled from the matching master. */
  options: string[];
  /** Comma-separated list of the picked names - the shape the column stores. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

const split = (value: string) =>
  value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];

/**
 * Pick several entries from a master and keep them as one comma-separated
 * string: a dropdown adds a name, a chip removes it. Options already picked
 * drop out of the dropdown so the same name cannot be added twice.
 */
export const MultiSelectField = ({ label, options, value, onChange, placeholder = 'Select...' }: MultiSelectFieldProps) => {
  const selected = split(value);
  const available = options.filter(o => !selected.includes(o));

  const add = (option: string) => {
    if (option) onChange([...selected, option].join(', '));
  };

  const remove = (option: string) => {
    onChange(selected.filter(s => s !== option).join(', '));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select
        value=""
        onChange={e => add(e.target.value)}
        disabled={available.length === 0}
        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        <option value="">
          {options.length === 0 ? 'No options available' : available.length === 0 ? 'All options selected' : placeholder}
        </option>
        {available.map(o => <option key={o} value={o}>{o}</option>)}
      </select>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {s}
              <button
                type="button"
                onClick={() => remove(s)}
                title={`Remove ${s}`}
                className="text-primary/60 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
