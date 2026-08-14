import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// The reference gives every inventory screen the same header block: a small
// "Inventory / <page>" breadcrumb over a large page title, with an optional
// cluster of controls (date range, primary action) pinned to the right.
interface PageHeaderProps {
  title: string;
  crumb: string;
  right?: ReactNode;
}

export const PageHeader = ({ title, crumb, right }: PageHeaderProps) => (
  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/inventory" className="text-primary hover:underline">Inventory</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-500">{crumb}</span>
      </nav>
      <h1 className="mt-1 text-3xl font-bold text-slate-800">{title}</h1>
    </div>
    {right && <div className="flex flex-wrap items-center gap-3">{right}</div>}
  </div>
);
