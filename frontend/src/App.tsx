import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Toaster } from 'react-hot-toast';
import { store, persistor } from './redux/store';
import { AppRouter } from './routes';

import { PatientProvider } from './contexts/PatientContext';
import { AppointmentProvider } from './contexts/AppointmentContext';
import { DoctorScheduleProvider } from './contexts/DoctorScheduleContext';
import { OPDVisitProvider } from './contexts/OPDVisitContext';
import { IPDProvider } from './contexts/IPDContext';
import { PharmacyBillingProvider } from './contexts/PharmacyBillingContext';
import { InvestigationProvider } from './contexts/InvestigationContext';
import { InsuranceProvider } from './contexts/InsuranceContext';
import { InventoryProvider } from './contexts/InventoryContext';

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PatientProvider>
          <DoctorScheduleProvider>
            <AppointmentProvider>
              <OPDVisitProvider>
                <IPDProvider>
                  <PharmacyBillingProvider>
                    <InvestigationProvider>
                      <InsuranceProvider>
                        <InventoryProvider>
                          <AppRouter />
                          <Toaster position="top-right" />
                        </InventoryProvider>
                      </InsuranceProvider>
                    </InvestigationProvider>
                  </PharmacyBillingProvider>
                </IPDProvider>
              </OPDVisitProvider>
            </AppointmentProvider>
          </DoctorScheduleProvider>
        </PatientProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
