import { MovementScreen, type MovementConfig } from './MovementScreen';

// Goods receipt: stock enters a store at its purchase cost, which seeds the
// moving-average valuation. The prototype discarded the GRN rate entirely.
const config: MovementConfig = {
  docType: 'RECEIPT',
  title: 'Stock In (Goods Receipt)',
  subtitle: 'Receive purchased stock into a store',
  needsSource: false,
  needsDestination: true,
  needsVendor: true,
  needsRate: true,
  submitLabel: 'New Receipt',
  numberLabel: 'GRN',
};

export const StockIn = () => <MovementScreen config={config} />;
