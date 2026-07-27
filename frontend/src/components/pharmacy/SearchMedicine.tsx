import { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchMedicineProps {
  onSearch: (query: string) => void;
}

export const SearchMedicine = ({ onSearch }: SearchMedicineProps) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        placeholder="Search by name, category, or batch..."
        value={query}
        onChange={handleSearch}
        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
      />
    </div>
  );
};
