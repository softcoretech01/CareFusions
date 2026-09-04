import { API_BASE_URL } from '@/utils/apiBase';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, AlertTriangle } from 'lucide-react';

/**
 * Shared medicine picker for every prescribing screen (OPD consultation, IPD
 * MAR, discharge summary).
 *
 * Only the Medicine master is offered here. Medical Items (syringes, gloves,
 * IV sets) are stocked and sold but are NOT prescribable, so they must never
 * appear in a prescription field.
 */
export interface MasterMedicine {
  id: number;
  medicineCode?: string;
  genericName: string;
  strength?: string;
  dosageForm?: string;
  category?: string;
  unit?: string;
  controlledDrug?: boolean;
  status?: string;
}

const API_BASE = API_BASE_URL;

/**
 * The catalog is shared by three screens that can be open in one session, so
 * it is fetched once per page load and reused. `refreshMedicines()` clears it
 * when a screen needs to pick up a master change without a reload.
 */
let catalogPromise: Promise<MasterMedicine[]> | null = null;

export const loadMedicines = (): Promise<MasterMedicine[]> => {
  if (!catalogPromise) {
    catalogPromise = fetch(`${API_BASE}/medicines/`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`Server error: ${r.status}`))))
      .then((data: MasterMedicine[]) =>
        (Array.isArray(data) ? data : []).filter(m => (m.status ?? 'Active') === 'Active'))
      .catch(err => {
        catalogPromise = null;      // let the next mount retry rather than caching a failure
        throw err;
      });
  }
  return catalogPromise;
};

export const refreshMedicines = () => { catalogPromise = null; };

/** "Paracetamol 650mg" — the label a prescription is written against. */
export const medicineLabel = (m: MasterMedicine): string =>
  [m.genericName, m.strength].filter(Boolean).join(' ');

interface MedicineSearchProps {
  /** Selected medicine id, or '' when nothing is chosen. */
  value: number | '';
  onSelect: (medicine: MasterMedicine | null) => void;
  /** Restricts the list to one dosage form (Tablet, Syrup, ...). */
  dosageForm?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /** Rendered under the field, e.g. a stock badge. */
  hint?: React.ReactNode;
}

export const MedicineSearch = ({
  value,
  onSelect,
  dosageForm,
  placeholder = 'Search medicine by name, strength or code…',
  autoFocus,
  className = '',
  hint,
}: MedicineSearchProps) => {
  const [medicines, setMedicines] = useState<MasterMedicine[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadMedicines()
      .then(list => { if (alive) setMedicines(list); })
      .catch(err => { if (alive) setLoadError(err.message || 'Failed to load medicines'); });
    return () => { alive = false; };
  }, []);

  // Close when focus leaves the widget entirely.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selected = useMemo(
    () => medicines.find(m => m.id === value) ?? null,
    [medicines, value],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = dosageForm ? medicines.filter(m => m.dosageForm === dosageForm) : medicines;
    if (!q) return pool.slice(0, 50);
    // Matching the code, generic name, strength, form and category all at once
    // is what lets a doctor type "500" or "syr" and still land on the drug.
    const scored = pool.filter(m =>
      [m.genericName, m.strength, m.dosageForm, m.category, m.medicineCode]
        .filter(Boolean)
        .some(f => String(f).toLowerCase().includes(q)));
    // Names that start with the query are what the doctor almost always means.
    return scored
      .sort((a, b) => {
        const aStarts = a.genericName.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.genericName.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts || a.genericName.localeCompare(b.genericName);
      })
      .slice(0, 50);
  }, [medicines, query, dosageForm]);

  useEffect(() => { setHighlight(0); }, [query, dosageForm]);

  const choose = (m: MasterMedicine) => {
    onSelect(m);
    setQuery('');
    setIsOpen(false);
  };

  const clear = () => {
    onSelect(null);
    setQuery('');
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) { setIsOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[highlight]) choose(results[highlight]); }
    else if (e.key === 'Escape') { setIsOpen(false); }
  };

  const inputCls =
    'w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        autoFocus={autoFocus}
        value={isOpen ? query : (selected ? medicineLabel(selected) : query)}
        placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={onKeyDown}
        className={inputCls}
      />
      {(selected || query) && (
        <button
          type="button"
          onClick={clear}
          title="Clear"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {hint}

      {loadError && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {loadError}
        </p>
      )}

      {isOpen && !loadError && (
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">
              {medicines.length === 0
                ? 'No medicines in the Medicine master.'
                : `No medicine matches “${query}”${dosageForm ? ` in ${dosageForm}` : ''}.`}
            </p>
          ) : results.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onMouseEnter={() => setHighlight(i)}
              onClick={() => choose(m)}
              className={`w-full text-left px-4 py-2 border-b border-slate-50 last:border-0 transition-colors ${
                i === highlight ? 'bg-primary/5' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">{medicineLabel(m)}</span>
                {m.controlledDrug && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 shrink-0">
                    CONTROLLED
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {[m.dosageForm, m.category, m.medicineCode].filter(Boolean).join(' · ')}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
