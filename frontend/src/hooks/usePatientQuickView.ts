import { useState, useCallback } from 'react';

export function usePatientQuickView() {
  const [selectedUhid, setSelectedUhid] = useState<string | null>(null);

  const openPatient = useCallback((uhid: string) => {
    setSelectedUhid(uhid);
  }, []);

  const closePatient = useCallback(() => {
    setSelectedUhid(null);
  }, []);

  return { selectedUhid, openPatient, closePatient };
}
