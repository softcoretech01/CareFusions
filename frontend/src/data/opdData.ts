// Mock ICD-10 diagnoses — common outpatient codes
export interface ICD10Item {
  code: string;
  description: string;
  category: string;
}

export const ICD10_LIST: ICD10Item[] = [
  // Cardiovascular
  { code: 'I10',   description: 'Essential hypertension',                          category: 'Cardiovascular' },
  { code: 'I25.1', description: 'Atherosclerotic heart disease',                   category: 'Cardiovascular' },
  { code: 'I50.9', description: 'Heart failure, unspecified',                      category: 'Cardiovascular' },
  { code: 'I20.9', description: 'Angina pectoris, unspecified',                   category: 'Cardiovascular' },
  { code: 'I48.0', description: 'Paroxysmal atrial fibrillation',                 category: 'Cardiovascular' },
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified',       category: 'Cardiovascular' },
  // Respiratory
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory' },
  { code: 'J18.9', description: 'Pneumonia, unspecified',                         category: 'Respiratory' },
  { code: 'J45.9', description: 'Asthma, unspecified',                            category: 'Respiratory' },
  { code: 'J44.1', description: 'COPD with acute exacerbation',                  category: 'Respiratory' },
  { code: 'J00',   description: 'Acute nasopharyngitis (common cold)',            category: 'Respiratory' },
  { code: 'J02.9', description: 'Acute pharyngitis, unspecified',                category: 'Respiratory' },
  { code: 'J20.9', description: 'Acute bronchitis, unspecified',                 category: 'Respiratory' },
  // Endocrine
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', category: 'Endocrine' },
  { code: 'E78.5', description: 'Hyperlipidaemia, unspecified',                  category: 'Endocrine' },
  { code: 'E03.9', description: 'Hypothyroidism, unspecified',                   category: 'Endocrine' },
  { code: 'E05.9', description: 'Thyrotoxicosis, unspecified',                   category: 'Endocrine' },
  { code: 'E66.9', description: 'Obesity, unspecified',                          category: 'Endocrine' },
  // Musculoskeletal
  { code: 'M54.5', description: 'Low back pain',                                 category: 'Musculoskeletal' },
  { code: 'M17.9', description: 'Gonarthrosis (knee osteoarthritis)',             category: 'Musculoskeletal' },
  { code: 'M16.9', description: 'Coxarthrosis (hip osteoarthritis)',             category: 'Musculoskeletal' },
  { code: 'M79.3', description: 'Panniculitis, unspecified',                     category: 'Musculoskeletal' },
  { code: 'M25.5', description: 'Pain in joint',                                 category: 'Musculoskeletal' },
  { code: 'M06.9', description: 'Rheumatoid arthritis, unspecified',             category: 'Musculoskeletal' },
  // Gastrointestinal
  { code: 'K21.0', description: 'Gastro-oesophageal reflux disease with oesophagitis', category: 'Gastroenterology' },
  { code: 'K29.7', description: 'Gastritis, unspecified',                        category: 'Gastroenterology' },
  { code: 'K58.9', description: 'Irritable bowel syndrome without diarrhoea',   category: 'Gastroenterology' },
  { code: 'K57.3', description: 'Diverticular disease of large intestine',      category: 'Gastroenterology' },
  { code: 'K80.2', description: 'Calculus of gallbladder without cholecystitis',category: 'Gastroenterology' },
  // Neurological
  { code: 'G43.9', description: 'Migraine, unspecified',                         category: 'Neurology' },
  { code: 'G47.0', description: 'Insomnia, unspecified',                         category: 'Neurology' },
  { code: 'G40.9', description: 'Epilepsy, unspecified',                         category: 'Neurology' },
  { code: 'G35',   description: 'Multiple sclerosis',                            category: 'Neurology' },
  { code: 'F32.9', description: 'Depressive episode, unspecified',               category: 'Neurology' },
  { code: 'F41.1', description: 'Generalised anxiety disorder',                  category: 'Neurology' },
  // Infectious
  { code: 'A09',   description: 'Diarrhoea and gastroenteritis of infectious origin', category: 'Infectious' },
  { code: 'A90',   description: 'Dengue fever',                                  category: 'Infectious' },
  { code: 'B50.9', description: 'Plasmodium falciparum malaria, unspecified',    category: 'Infectious' },
  { code: 'A15.9', description: 'Pulmonary tuberculosis',                        category: 'Infectious' },
  { code: 'B19.9', description: 'Unspecified viral hepatitis',                   category: 'Infectious' },
  // Dermatology
  { code: 'L30.9', description: 'Dermatitis, unspecified',                       category: 'Dermatology' },
  { code: 'L50.9', description: 'Urticaria, unspecified',                        category: 'Dermatology' },
  { code: 'L20.9', description: 'Atopic dermatitis, unspecified',                category: 'Dermatology' },
  // Urinary
  { code: 'N39.0', description: 'Urinary tract infection, site not specified',  category: 'Urology' },
  { code: 'N20.0', description: 'Calculus of kidney',                            category: 'Urology' },
  { code: 'N18.9', description: 'Chronic kidney disease, unspecified',           category: 'Urology' },
  // ENT
  { code: 'H66.9', description: 'Otitis media, unspecified',                     category: 'ENT' },
  { code: 'J32.9', description: 'Chronic sinusitis, unspecified',                category: 'ENT' },
  { code: 'J35.0', description: 'Chronic tonsillitis',                           category: 'ENT' },
  // Ophthalmology
  { code: 'H52.1', description: 'Myopia',                                        category: 'Ophthalmology' },
  { code: 'H40.1', description: 'Open-angle glaucoma',                           category: 'Ophthalmology' },
  { code: 'H26.9', description: 'Cataract, unspecified',                         category: 'Ophthalmology' },
];

// ── Mock medicines list ────────────────────────────────────────────────────
export interface MedicineItem {
  name: string;
  generic: string;
  strength: string;
  category: string;
  route: string;
  allergyClass?: string; // used for cross-checking patient allergies
}

export const MEDICINE_LIST: MedicineItem[] = [
  { name: 'Amoxicillin 500mg', generic: 'Amoxicillin', strength: '500mg', category: 'Antibiotic', route: 'Oral', allergyClass: 'Penicillin' },
  { name: 'Augmentin 625mg',   generic: 'Amoxicillin+Clavulanate', strength: '625mg', category: 'Antibiotic', route: 'Oral', allergyClass: 'Penicillin' },
  { name: 'Azithromycin 500mg',generic: 'Azithromycin', strength: '500mg', category: 'Antibiotic', route: 'Oral' },
  { name: 'Ciprofloxacin 500mg',generic: 'Ciprofloxacin', strength: '500mg', category: 'Antibiotic', route: 'Oral' },
  { name: 'Metronidazole 400mg',generic: 'Metronidazole', strength: '400mg', category: 'Antibiotic', route: 'Oral' },
  { name: 'Paracetamol 500mg', generic: 'Paracetamol', strength: '500mg', category: 'Analgesic', route: 'Oral', allergyClass: 'Aspirin' },
  { name: 'Ibuprofen 400mg',   generic: 'Ibuprofen', strength: '400mg', category: 'NSAID', route: 'Oral', allergyClass: 'Aspirin' },
  { name: 'Diclofenac 50mg',   generic: 'Diclofenac', strength: '50mg', category: 'NSAID', route: 'Oral', allergyClass: 'Aspirin' },
  { name: 'Aspirin 75mg',      generic: 'Aspirin', strength: '75mg', category: 'Antiplatelet', route: 'Oral', allergyClass: 'Aspirin' },
  { name: 'Pantoprazole 40mg', generic: 'Pantoprazole', strength: '40mg', category: 'PPI', route: 'Oral' },
  { name: 'Omeprazole 20mg',   generic: 'Omeprazole', strength: '20mg', category: 'PPI', route: 'Oral' },
  { name: 'Metformin 500mg',   generic: 'Metformin', strength: '500mg', category: 'Antidiabetic', route: 'Oral' },
  { name: 'Glimepiride 2mg',   generic: 'Glimepiride', strength: '2mg', category: 'Antidiabetic', route: 'Oral' },
  { name: 'Atorvastatin 10mg', generic: 'Atorvastatin', strength: '10mg', category: 'Statin', route: 'Oral' },
  { name: 'Amlodipine 5mg',    generic: 'Amlodipine', strength: '5mg', category: 'Antihypertensive', route: 'Oral' },
  { name: 'Losartan 50mg',     generic: 'Losartan', strength: '50mg', category: 'Antihypertensive', route: 'Oral' },
  { name: 'Metoprolol 25mg',   generic: 'Metoprolol', strength: '25mg', category: 'Beta-Blocker', route: 'Oral' },
  { name: 'Furosemide 40mg',   generic: 'Furosemide', strength: '40mg', category: 'Diuretic', route: 'Oral' },
  { name: 'Levothyroxine 50mcg',generic: 'Levothyroxine', strength: '50mcg', category: 'Thyroid', route: 'Oral' },
  { name: 'Salbutamol Inhaler',generic: 'Salbutamol', strength: '100mcg/dose', category: 'Bronchodilator', route: 'Inhaler' },
  { name: 'Montelukast 10mg',  generic: 'Montelukast', strength: '10mg', category: 'Antileukotriene', route: 'Oral' },
  { name: 'Cetirizine 10mg',   generic: 'Cetirizine', strength: '10mg', category: 'Antihistamine', route: 'Oral' },
  { name: 'Chlorphenamine 4mg',generic: 'Chlorphenamine', strength: '4mg', category: 'Antihistamine', route: 'Oral' },
  { name: 'Tramadol 50mg',     generic: 'Tramadol', strength: '50mg', category: 'Opioid Analgesic', route: 'Oral' },
  { name: 'Diazepam 5mg',      generic: 'Diazepam', strength: '5mg', category: 'Anxiolytic', route: 'Oral' },
  { name: 'Ondansetron 4mg',   generic: 'Ondansetron', strength: '4mg', category: 'Antiemetic', route: 'Oral' },
  { name: 'Domperidone 10mg',  generic: 'Domperidone', strength: '10mg', category: 'Prokinetic', route: 'Oral' },
];

// ── Mock lab tests ─────────────────────────────────────────────────────────
export interface LabTest {
  code: string;
  name: string;
  category: string;
  turnaround: string;
}

export const LAB_TESTS: LabTest[] = [
  // Haematology
  { code: 'CBC',    name: 'Complete Blood Count (CBC)',          category: 'Haematology',    turnaround: '2 hrs' },
  { code: 'PBF',    name: 'Peripheral Blood Film',              category: 'Haematology',    turnaround: '4 hrs' },
  { code: 'PT',     name: 'Prothrombin Time (PT/INR)',          category: 'Haematology',    turnaround: '2 hrs' },
  { code: 'ESR',    name: 'Erythrocyte Sedimentation Rate',     category: 'Haematology',    turnaround: '2 hrs' },
  // Biochemistry
  { code: 'RFT',    name: 'Renal Function Test',                category: 'Biochemistry',   turnaround: '4 hrs' },
  { code: 'LFT',    name: 'Liver Function Test',                category: 'Biochemistry',   turnaround: '4 hrs' },
  { code: 'FBS',    name: 'Fasting Blood Sugar',                category: 'Biochemistry',   turnaround: '2 hrs' },
  { code: 'RBS',    name: 'Random Blood Sugar',                 category: 'Biochemistry',   turnaround: '1 hr' },
  { code: 'HBA1C',  name: 'Glycated Haemoglobin (HbA1c)',       category: 'Biochemistry',   turnaround: '4 hrs' },
  { code: 'LIPID',  name: 'Lipid Profile',                      category: 'Biochemistry',   turnaround: '4 hrs' },
  { code: 'TFT',    name: 'Thyroid Function Test',              category: 'Biochemistry',   turnaround: '6 hrs' },
  { code: 'CREA',   name: 'Serum Creatinine',                   category: 'Biochemistry',   turnaround: '2 hrs' },
  { code: 'UA',     name: 'Uric Acid',                          category: 'Biochemistry',   turnaround: '2 hrs' },
  { code: 'CRP',    name: 'C-Reactive Protein',                 category: 'Biochemistry',   turnaround: '4 hrs' },
  { code: 'TROP',   name: 'Troponin I/T',                       category: 'Biochemistry',   turnaround: '1 hr' },
  // Microbiology
  { code: 'URINE',  name: 'Urine Routine & Microscopy',         category: 'Microbiology',   turnaround: '2 hrs' },
  { code: 'CULT',   name: 'Urine Culture & Sensitivity',        category: 'Microbiology',   turnaround: '48 hrs' },
  { code: 'BLOOD_C',name: 'Blood Culture',                      category: 'Microbiology',   turnaround: '72 hrs' },
  { code: 'WIDAL',  name: 'Widal Test',                         category: 'Microbiology',   turnaround: '24 hrs' },
  { code: 'DENGNS', name: 'Dengue NS1 Antigen',                 category: 'Microbiology',   turnaround: '4 hrs' },
  // Immunology
  { code: 'HIV',    name: 'HIV 1 & 2 Antibody',                 category: 'Immunology',     turnaround: '4 hrs' },
  { code: 'HBS',    name: 'HBsAg (Hepatitis B Surface Antigen)',category: 'Immunology',     turnaround: '4 hrs' },
  { code: 'HCVAB',  name: 'HCV Antibody',                       category: 'Immunology',     turnaround: '4 hrs' },
  { code: 'ANA',    name: 'Antinuclear Antibody (ANA)',         category: 'Immunology',     turnaround: '24 hrs' },
  { code: 'RA',     name: 'Rheumatoid Factor',                  category: 'Immunology',     turnaround: '4 hrs' },
];

// ── Mock radiology services ────────────────────────────────────────────────
export interface RadioService {
  code: string;
  name: string;
  modality: string;
  turnaround: string;
}

export const RADIOLOGY_SERVICES: RadioService[] = [
  { code: 'CXR',   name: 'Chest X-Ray (PA view)',              modality: 'X-Ray',     turnaround: '1 hr' },
  { code: 'ABXR',  name: 'Abdomen X-Ray',                      modality: 'X-Ray',     turnaround: '1 hr' },
  { code: 'BONXR', name: 'Bone X-Ray (specify region)',         modality: 'X-Ray',     turnaround: '1 hr' },
  { code: 'USG_AB',name: 'Ultrasound Abdomen',                 modality: 'Ultrasound', turnaround: '2 hrs' },
  { code: 'USG_PE',name: 'Ultrasound Pelvis',                  modality: 'Ultrasound', turnaround: '2 hrs' },
  { code: 'USG_NE',name: 'Ultrasound Neck (thyroid)',          modality: 'Ultrasound', turnaround: '2 hrs' },
  { code: 'ECHO',  name: 'Echocardiogram',                     modality: 'Echo',      turnaround: '2 hrs' },
  { code: 'ECG12', name: '12-Lead ECG',                        modality: 'ECG',       turnaround: '30 min' },
  { code: 'CT_BR', name: 'CT Brain (Plain)',                   modality: 'CT Scan',   turnaround: '4 hrs' },
  { code: 'CT_CH', name: 'CT Chest (HRCT)',                    modality: 'CT Scan',   turnaround: '4 hrs' },
  { code: 'CT_AB', name: 'CT Abdomen with Contrast',           modality: 'CT Scan',   turnaround: '4 hrs' },
  { code: 'MRI_BR',name: 'MRI Brain',                          modality: 'MRI',       turnaround: '6 hrs' },
  { code: 'MRI_SP',name: 'MRI Spine (Lumbar / Cervical)',      modality: 'MRI',       turnaround: '6 hrs' },
  { code: 'MRI_KN',name: 'MRI Knee',                          modality: 'MRI',       turnaround: '6 hrs' },
  { code: 'MAMMO', name: 'Mammography',                        modality: 'Mammography', turnaround: '2 hrs' },
];
