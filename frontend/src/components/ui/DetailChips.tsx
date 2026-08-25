/** Yes/No answer as a chip - green when the answer is yes, muted when it is not. */
export const FlagChip = ({ label, on }: { label: string; on: boolean }) => (
  <span className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
    on ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
       : 'bg-slate-50 text-slate-400 border border-slate-100'
  }`}>
    {label}
  </span>
);

/**
 * Renders a comma-separated column (the shape MultiSelectField saves) as one
 * chip per entry, or an em dash when nothing was picked.
 */
export const ChipList = ({ value }: { value: string }) => {
  const items = value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];

  if (items.length === 0) return <span className="text-sm text-slate-300">—</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span key={item} className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
          {item}
        </span>
      ))}
    </div>
  );
};
