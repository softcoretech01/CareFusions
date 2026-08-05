import { MovementScreen, type MovementConfig } from './MovementScreen';

// Physical-count corrections and write-offs. The prototype's "New Adjustment"
// button had no handler at all, so this procedure did not exist.
const config: MovementConfig = {
  docType: 'ADJUSTMENT',
  title: 'Stock Adjustment',
  subtitle: 'Correct stock after a physical count, damage or loss',
  needsSource: true,
  needsDestination: false,
  allowNegative: true,
  reasons: ['Physical Count', 'Damage', 'Expiry', 'Lost', 'Correction'],
  submitLabel: 'New Adjustment',
  numberLabel: 'Adjustment',
};

export const StockAdjustment = () => <MovementScreen config={config} />;
