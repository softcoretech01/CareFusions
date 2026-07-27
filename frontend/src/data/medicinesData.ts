export interface Medicine {
  id: number;
  medicineCode: string;
  genericName: string;
  brandName: string;
  category: string;
  manufacturer: string;
  strength: string;
  dosageForm: string;
  unit: string;
  sellingPrice: string;
  gst: string;
  status: string;
}

export const medicinesData: Medicine[] = [
  {
    id: 1,
    medicineCode: 'MED-001',
    genericName: 'Paracetamol',
    brandName: 'Dolo 650',
    category: 'Tablets',
    manufacturer: 'Micro Labs Ltd',
    strength: '650mg',
    dosageForm: 'Tablet',
    unit: 'Strip',
    sellingPrice: '30.00',
    gst: '12',
    status: 'Active'
  },
  {
    id: 2,
    medicineCode: 'MED-002',
    genericName: 'Amoxicillin',
    brandName: 'Amoxil',
    category: 'Capsules',
    manufacturer: 'GSK',
    strength: '500mg',
    dosageForm: 'Capsule',
    unit: 'Strip',
    sellingPrice: '125.00',
    gst: '12',
    status: 'Active'
  },
  {
    id: 3,
    medicineCode: 'MED-003',
    genericName: 'Aspirin',
    brandName: 'Ecosprin',
    category: 'Tablets',
    manufacturer: 'Micro Labs Ltd',
    strength: '75mg',
    dosageForm: 'Tablet',
    unit: 'Strip',
    sellingPrice: '45.00',
    gst: '12',
    status: 'Active'
  },
  {
    id: 4,
    medicineCode: 'MED-004',
    genericName: 'Cefixime',
    brandName: 'Suprax',
    category: 'Capsules',
    manufacturer: 'Cipla Ltd',
    strength: '200mg',
    dosageForm: 'Capsule',
    unit: 'Strip',
    sellingPrice: '95.00',
    gst: '12',
    status: 'Active'
  },
  {
    id: 5,
    medicineCode: 'MED-005',
    genericName: 'Metformin',
    brandName: 'Glucophage',
    category: 'Tablets',
    manufacturer: 'Merck Serono',
    strength: '500mg',
    dosageForm: 'Tablet',
    unit: 'Strip',
    sellingPrice: '35.00',
    gst: '12',
    status: 'Active'
  },
  {
    id: 6,
    medicineCode: 'MED-006',
    genericName: 'Amlodipine',
    brandName: 'Norvasc',
    category: 'Tablets',
    manufacturer: 'Pfizer',
    strength: '5mg',
    dosageForm: 'Tablet',
    unit: 'Strip',
    sellingPrice: '50.00',
    gst: '12',
    status: 'Active'
  },
  {
    id: 7,
    medicineCode: 'MED-007',
    genericName: 'Omeprazole',
    brandName: 'Omez',
    category: 'Capsules',
    manufacturer: 'Dr Reddy\'s',
    strength: '20mg',
    dosageForm: 'Capsule',
    unit: 'Strip',
    sellingPrice: '40.00',
    gst: '12',
    status: 'Active'
  },
  {
    id: 8,
    medicineCode: 'MED-008',
    genericName: 'Ibuprofen',
    brandName: 'Brufen',
    category: 'Tablets',
    manufacturer: 'Abbott',
    strength: '400mg',
    dosageForm: 'Tablet',
    unit: 'Strip',
    sellingPrice: '28.00',
    gst: '12',
    status: 'Active'
  }
];
