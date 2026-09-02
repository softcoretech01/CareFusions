import { UnifiedPatientHistory } from '../emr/UnifiedPatientHistory';

export const PatientHistoryTab = ({ patient }: { patient: any }) => {
  if (!patient || !patient.uhid) return null;

  return <UnifiedPatientHistory patientUhid={patient.uhid} />;
};
