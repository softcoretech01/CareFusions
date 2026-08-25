// Maps an admin route path to the permission Module it belongs to.
// Keys must match the Module values granted in the Permissions master.

const SLUG_TO_MODULE: Record<string, string> = {
  // Organization
  hospital: 'Organization', branch: 'Organization', department: 'Organization', 'ward-charge': 'Organization', 'minor-operation': 'Organization', 'major-operation': 'Organization',
  // Doctor
  doctor: 'Doctor', 'doctor-specialization': 'Doctor',
  // Employee
  nurse: 'Employee', pharmacist: 'Employee', 'lab-technician': 'Employee',
  receptionist: 'Employee', housekeeping: 'Employee',
  // Patient
  'patient-category': 'Patient', 'blood-group': 'Patient', allergy: 'Patient',
  diagnosis: 'Patient', procedure: 'Patient',
  // Appointment (masters)
  'consultation-type': 'Appointment', 'appointment-status': 'Appointment',
  // Pharmacy
  // Medicine now sits under the Purchase & Inventory menu but deliberately
  // keeps its 'Pharmacy' permission module, so relocating the entry does not
  // grant or revoke access for any existing role.
  medicine: 'Pharmacy',
  // Laboratory
  test: 'Laboratory', 'sample-type': 'Laboratory',
  // Radiology
  'radiology-service': 'Radiology', equipment: 'Radiology',
  // Billing
  service: 'Billing', tax: 'Billing', 'payment-mode': 'Billing',
  // Insurance
  'insurance-provider': 'Insurance', tpa: 'Insurance',
  // Purchase & Inventory
  vendor: 'Purchase & Inventory', category: 'Purchase & Inventory',
  'sub-category': 'Purchase & Inventory', uom: 'Purchase & Inventory',
  item: 'Purchase & Inventory',
  'medical-item': 'Purchase & Inventory', 'non-medical-item': 'Purchase & Inventory',
  brand: 'Purchase & Inventory',
  manufacturer: 'Purchase & Inventory', warehouse: 'Purchase & Inventory',
  // Financial
  coa: 'Financial', 'cost-center': 'Financial', 'profit-center': 'Financial',
  'payment-terms': 'Financial', currency: 'Financial', 'financial-year': 'Financial',
  bank: 'Financial', 'cash-counter': 'Financial',
  // Security
  users: 'Security', roles: 'Security', permissions: 'Security',
  // Notification
  sms: 'Notification', email: 'Notification', whatsapp: 'Notification',
  'push-notification': 'Notification', 'reminder-rules': 'Notification',
  // AI Config
  prompts: 'AI Config', 'clinical-rules': 'AI Config',
};

/** Resolve the permission Module for a given admin pathname, or null if not gated. */
export function moduleForPath(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, '');
  if (p === '/admin') return 'Dashboard';
  if (p === '/admin/audit') return 'Audit Trail';
  const m = p.match(/^\/admin\/masters\/([^/]+)/);
  if (m) return SLUG_TO_MODULE[m[1]] ?? null;
  return null;
}
