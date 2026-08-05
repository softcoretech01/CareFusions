import { MovementScreen, type MovementConfig } from './MovementScreen';

// Store-to-store movement. Posts twice per line — out of the source and into
// the destination at the same cost — so stock value is preserved.
const config: MovementConfig = {
  docType: 'TRANSFER',
  title: 'Stock Transfer',
  subtitle: 'Move stock between stores',
  needsSource: true,
  needsDestination: true,
  submitLabel: 'New Transfer',
  numberLabel: 'Transfer',
};

export const StockTransfer = () => <MovementScreen config={config} />;
