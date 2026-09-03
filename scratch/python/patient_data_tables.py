"""The single definition of what counts as patient data.

Shared by backup_patient_data.py and truncate_patient_data.py so the backup and
the wipe can never drift apart.

Deliberately EXCLUDED, because none of it is patient information:
  hospital.IPD_Ward, hospital.IPD_Bed   - ward and bed layout you configured
  hospital.Pharmacy_Stock               - current stock on hand
  hospital.Lab_QcLog, hospital.Rad_QcLog- equipment calibration history
  admin.Master_*                        - every master (doctors, departments...)
  inventory.*                           - purchasing and stock movement
"""

# (schema, table) - child tables first so a plain DELETE order would also work.
PATIENT_TABLES = [
    # ── OPD visit tree ────────────────────────────────────────
    ("hospital", "Trn_OpdVisitDiagnosis"),
    ("hospital", "Trn_OpdVisitLabOrder"),
    ("hospital", "Trn_OpdVisitPrescription"),
    ("hospital", "Trn_OpdVisitProcedure"),
    ("hospital", "Trn_OpdVisitRadiologyOrder"),
    ("hospital", "Trn_OpdVisitTriage"),
    ("hospital", "Trn_OpdVisitVitals"),
    ("hospital", "Trn_OpdVisit"),

    # ── Billing ───────────────────────────────────────────────
    ("hospital", "OpBillItem"),
    ("hospital", "OpBill"),
    ("hospital", "IpBillItem"),
    ("hospital", "IpBill"),

    # ── Lab / Radiology orders (QC logs are NOT patient data) ─
    ("hospital", "Lab_OrderTest"),
    ("hospital", "Lab_Order"),
    ("hospital", "Rad_OrderTest"),
    ("hospital", "Rad_Order"),

    # ── Insurance ─────────────────────────────────────────────
    ("hospital", "Ins_Appeal"),
    ("hospital", "Ins_Settlement"),
    ("hospital", "Ins_Claim"),
    ("hospital", "Ins_PreAuth"),
    ("hospital", "Ins_Policy"),

    # ── IPD (ward/bed layout kept) ────────────────────────────
    ("hospital", "IpdClinicalRounds"),
    ("hospital", "IpdInvestigation"),
    ("hospital", "IpdMedication"),
    ("hospital", "IpdVitals"),
    ("hospital", "IPD_DischargeMedicine"),
    ("hospital", "IPD_WardTransfer"),
    ("hospital", "IPD_Admission"),
    ("hospital", "IPD_AdmissionRequest"),

    # ── Pharmacy sales (stock kept) ───────────────────────────
    ("hospital", "Pharmacy_SaleItem"),
    ("hospital", "Pharmacy_Sale"),

    # ── Registration: the patients themselves ─────────────────
    ("registration", "PatientDocument"),
    ("registration", "PatientVisit"),
    ("registration", "Trn_Appointment"),
    ("registration", "QuickRegistration"),
    ("registration", "EmergencyRegistration"),
    ("registration", "EmergencyPatient"),
    ("registration", "PatientRegistration"),
    ("registration", "Patient"),

    # ── Appointments booked against the admin schema ──────────
    ("admin", "Trn_Appointment"),
]
