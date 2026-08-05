import { MovementScreen, type MovementConfig } from './MovementScreen';

// Issue to a department is consumption: the lot is decremented and the ledger
// records it. Lots are offered nearest-expiry first and expired lots are
// excluded, neither of which the prototype did.
const config: MovementConfig = {
  docType: 'ISSUE',
  title: 'Stock Issue',
  subtitle: 'Issue stock from a store to a department',
  needsSource: true,
  needsDestination: false,
  needsDepartment: true,
  submitLabel: 'New Issue',
  numberLabel: 'Issue',
};

export const StockIssue = () => <MovementScreen config={config} />;
