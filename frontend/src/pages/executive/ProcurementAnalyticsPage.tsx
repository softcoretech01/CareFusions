import { NoDataNotice } from '../../components/ui/NoDataNotice';

/**
 * Procurement Analytics
 *
 * Intentionally renders no figures. The prototype filled this screen with
 * invented numbers; showing them under a "no data" banner would be worse than
 * showing nothing, so the page states what it needs and stops.
 */
export const ProcurementAnalyticsPage = () => (
  <div className="space-y-3">
    <div>
      <h1 className="text-xl font-bold text-slate-800">Procurement Analytics</h1>
      <p className="text-xs text-slate-500">Purchase requisitions, orders, vendor performance and cycle time</p>
    </div>

    <NoDataNotice
      title="Purchase requisitions, orders, vendor performance and cycle time"
      needs="Procurement"
      detail="PR / PO / RFQ counts, vendor spend and savings were fixed literals. Goods actually received are visible today under Inventory > Stock In."
    />
  </div>
);
