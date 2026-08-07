import { MovementScreen, type MovementConfig } from './MovementScreen';

// Returns now actually put stock back. In the prototype this screen recorded a
// document and incremented nothing, so returned goods were lost from the system.
const config: MovementConfig = {
  docType: 'RETURN',
  title: 'Stock Return',
  subtitle: 'Return unused or damaged stock back into a store',
  needsSource: false,
  needsDestination: true,
  needsRate: true,
  reasons: ['Excess', 'Damaged', 'Expired', 'Wrong Item', 'Patient Discharged'],
  submitLabel: 'New Return',
  numberLabel: 'Return',
};

export const StockReturn = () => <MovementScreen config={config} />;
