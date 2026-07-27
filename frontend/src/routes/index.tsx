import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { Dashboard } from '../pages/Dashboard';
import { Patients } from '../pages/Patients';
import { Appointments } from '../pages/Appointments';
import { Analytics } from '../pages/Analytics';
import { NotFound } from '../pages/NotFound';
import { Login } from '../pages/Login';

import { RegistrationLayout } from '../layouts/RegistrationLayout';
import { PatientRegistration } from '../pages/registration/PatientRegistration';
import { QuickRegistration } from '../pages/registration/QuickRegistration';
import { EmergencyRegistration } from '../pages/registration/EmergencyRegistration';
import { ExistingPatients } from '../pages/registration/ExistingPatients';
import { TodayRegistrations } from '../pages/registration/TodayRegistrations';
import { PatientDocuments } from '../pages/registration/PatientDocuments';
import { InsuranceVerification } from '../pages/registration/InsuranceVerification';
import { PatientAlerts } from '../pages/registration/PatientAlerts';
import { DuplicateCheck } from '../pages/registration/DuplicateCheck';
import { PatientMerge } from '../pages/registration/PatientMerge';
import { VisitHistory } from '../pages/registration/VisitHistory';
import { RegistrationReports } from '../pages/registration/RegistrationReports';

import { AppointmentLayout } from '../layouts/AppointmentLayout';
import { AppointmentDashboard } from '../pages/appointments/AppointmentDashboard';
import { AppointmentList } from '../pages/appointments/AppointmentList';
import { NewAppointment } from '../pages/appointments/NewAppointment';
import { OnlineBooking } from '../pages/appointments/OnlineBooking';
import { NewOnlineBooking } from '../pages/appointments/NewOnlineBooking';
import { DoctorSchedules } from '../pages/appointments/DoctorSchedules';
import { QueueManagement } from '../pages/appointments/QueueManagement';
import { WaitingList } from '../pages/appointments/WaitingList';
import { RescheduleCancel } from '../pages/appointments/RescheduleCancel';

import { OPDLayout } from '../layouts/OPDLayout';
import { OPDDashboard } from '../pages/opd/OPDDashboard';
import { OPDQueueBoard } from '../pages/opd/OPDQueueBoard';
import { NursingTriage } from '../pages/opd/NursingTriage';
import { DepartmentConsultations } from '../pages/opd/DepartmentConsultations';
import { DoctorConsultation } from '../pages/opd/DoctorConsultation';
import { LabOrders } from '../pages/opd/LabOrders';
import { RadiologyOrders } from '../pages/opd/RadiologyOrders';
import { OPDReports } from '../pages/opd/OPDReports';

import { IPDLayout } from '../layouts/IPDLayout';
import { IPDDashboard } from '../pages/ipd/IPDDashboard';
import { BedManagement } from '../pages/ipd/BedManagement';
import { AdmissionDesk } from '../pages/ipd/AdmissionDesk';
import { NewAdmission } from '../pages/ipd/NewAdmission';
import { ActiveInpatients } from '../pages/ipd/ActiveInpatients';
import { WardTransfers } from '../pages/ipd/WardTransfers';
import { Discharges } from '../pages/ipd/Discharges';
import { PatientIPDProfile } from '../pages/ipd/PatientIPDProfile';

import { EMRLayout } from '../layouts/EMRLayout';
import { EMRDashboard } from '../pages/emr/EMRDashboard';
import { OPPatients } from '../pages/emr/OPPatients';
import { IPPatients } from '../pages/emr/IPPatients';
import { EmergencyPatients } from '../pages/emr/EmergencyPatients';


import { InsuranceLayout } from '../layouts/InsuranceLayout';
import { InsuranceDashboard } from '../pages/insurance/InsuranceDashboard';
import { EligibilityVerification } from '../pages/insurance/EligibilityVerification';
import { PreAuthManagement } from '../pages/insurance/PreAuthManagement';
import { ClaimsManagement } from '../pages/insurance/ClaimsManagement';
import { AppealsManagement } from '../pages/insurance/AppealsManagement';
import { SettlementReconciliation } from '../pages/insurance/SettlementReconciliation';

import { ProcurementLayout } from '../layouts/ProcurementLayout';
import { ProcurementDashboard } from '../pages/procurement/ProcurementDashboard';
import { PurchaseRequisitions } from '../pages/procurement/PurchaseRequisitions';
import { RequestForQuotation } from '../pages/procurement/RequestForQuotation';
import { VendorQuotation } from '../pages/procurement/VendorQuotation';
import { QuotationComparison } from '../pages/procurement/QuotationComparison';
import { PurchaseOrders } from '../pages/procurement/PurchaseOrders';
import { GoodsReceipt } from '../pages/procurement/GoodsReceipt';
import { PurchaseReturn } from '../pages/procurement/PurchaseReturn';
import { VendorsCatalog } from '../pages/procurement/VendorsCatalog';
import { Approvals } from '../pages/procurement/Approvals';

import { InventoryLayout } from '../layouts/InventoryLayout';
import { InventoryDashboard } from '../pages/inventory/InventoryDashboard';
import { CurrentStock } from '../pages/inventory/CurrentStock';
import { StockIn } from '../pages/inventory/StockIn';
import { StockIssue } from '../pages/inventory/StockIssue';
import { StockReturn } from '../pages/inventory/StockReturn';
import { StockTransfer } from '../pages/inventory/StockTransfer';
import { StockAdjustment } from '../pages/inventory/StockAdjustment';
import { BatchExpiry } from '../pages/inventory/BatchExpiry';
import { LowStockMonitor } from '../pages/inventory/LowStockMonitor';
import { DepartmentConsumption } from '../pages/inventory/DepartmentConsumption';
import { StockLedger } from '../pages/inventory/StockLedger';
import { CategoryLedger } from '../pages/inventory/CategoryLedger';
import { InventoryReports } from '../pages/inventory/InventoryReports';

import { ExecutiveLayout } from '../layouts/ExecutiveLayout';
import { ExecutiveOverview } from '../pages/executive/ExecutiveOverview';
import { FinancialAnalyticsPage } from '../pages/executive/FinancialAnalyticsPage';
import { ClinicalAnalyticsPage } from '../pages/executive/ClinicalAnalyticsPage';
import { OperationalAnalyticsPage } from '../pages/executive/OperationalAnalyticsPage';
import { ProcurementAnalyticsPage } from '../pages/executive/ProcurementAnalyticsPage';
import { InventoryAnalyticsPage } from '../pages/executive/InventoryAnalyticsPage';
import { HRAnalyticsPage } from '../pages/executive/HRAnalyticsPage';
import { PatientExperiencePage } from '../pages/executive/PatientExperiencePage';
import { QualityCompliancePage } from '../pages/executive/QualityCompliancePage';
import { AIIntelligencePage } from '../pages/executive/AIIntelligencePage';
import { PredictiveAnalyticsPage } from '../pages/executive/PredictiveAnalyticsPage';
import { ScheduledReportsPage } from '../pages/executive/ScheduledReportsPage';
import { ReportBuilderPage } from '../pages/executive/ReportBuilderPage';
import { AuditLogsPage } from '../pages/executive/AuditLogsPage';
import { SettingsPage } from '../pages/executive/SettingsPage';

import { HospitalMaster } from '../pages/admin/organization-masters/HospitalMaster';
import { BranchMaster } from '../pages/admin/organization-masters/BranchMaster';
import { DepartmentMaster } from '../pages/admin/organization-masters/DepartmentMaster';
import { DoctorMaster } from '../pages/admin/doctor-masters/DoctorMaster';
import { DoctorSpecializationMaster } from '../pages/admin/doctor-masters/DoctorSpecializationMaster';
import { NurseMaster } from '../pages/admin/employee-masters/NurseMaster';
import { PharmacistMaster } from '../pages/admin/employee-masters/PharmacistMaster';
import { LabTechnicianMaster } from '../pages/admin/employee-masters/LabTechnicianMaster';
import { ReceptionistMaster } from '../pages/admin/employee-masters/ReceptionistMaster';
import { FacilityManagementMaster } from '../pages/admin/employee-masters/FacilityManagementMaster';
import { PatientCategoryMaster } from '../pages/admin/patient-masters/PatientCategoryMaster';
import { BloodGroupMaster } from '../pages/admin/patient-masters/BloodGroupMaster';
import { AllergyMaster } from '../pages/admin/patient-masters/AllergyMaster';
import { DiagnosisMaster } from '../pages/admin/patient-masters/DiagnosisMaster';
import { ProcedureMaster } from '../pages/admin/patient-masters/ProcedureMaster';
import { ConsultationTypeMaster } from '../pages/admin/appointment-masters/ConsultationTypeMaster';
import { AppointmentStatusMaster } from '../pages/admin/appointment-masters/AppointmentStatusMaster';
import { MedicineMaster } from '../pages/admin/pharmacy-masters/MedicineMaster';
import { MedicineCategoryMaster } from '../pages/admin/pharmacy-masters/MedicineCategoryMaster';
import { TestMaster } from '../pages/admin/laboratory-masters/TestMaster';
import { SampleTypeMaster } from '../pages/admin/laboratory-masters/SampleTypeMaster';
import { RadiologyServiceMaster } from '../pages/admin/radiology-masters/RadiologyServiceMaster';
import { EquipmentMaster } from '../pages/admin/radiology-masters/EquipmentMaster';
import { ServiceMaster } from '../pages/admin/billing-masters/ServiceMaster';
import { TaxMaster } from '../pages/admin/billing-masters/TaxMaster';
import { PaymentModeMaster } from '../pages/admin/billing-masters/PaymentModeMaster';
import { InsuranceProviderMaster } from '../pages/admin/insurance-masters/InsuranceProviderMaster';
import { TpaMaster } from '../pages/admin/insurance-masters/TpaMaster';
import { VendorMaster } from '../pages/admin/purchase-inventory/VendorMaster';
import { CategoryMaster } from '../pages/admin/purchase-inventory/CategoryMaster';
import { SubCategoryMaster } from '../pages/admin/purchase-inventory/SubCategoryMaster';
import { UomMaster } from '../pages/admin/purchase-inventory/UomMaster';
import { ItemMaster } from '../pages/admin/purchase-inventory/ItemMaster';
import { BrandMaster } from '../pages/admin/purchase-inventory/BrandMaster';
import { ManufacturerMaster } from '../pages/admin/purchase-inventory/ManufacturerMaster';
import { WarehouseMaster } from '../pages/admin/purchase-inventory/WarehouseMaster';
import { CoaMaster } from '../pages/admin/financial-masters/CoaMaster';
import { CostCenterMaster } from '../pages/admin/financial-masters/CostCenterMaster';
import { ProfitCenterMaster } from '../pages/admin/financial-masters/ProfitCenterMaster';
import { PaymentTermsMaster } from '../pages/admin/financial-masters/PaymentTermsMaster';
import { CurrencyMaster } from '../pages/admin/financial-masters/CurrencyMaster';
import { FinancialYearMaster } from '../pages/admin/financial-masters/FinancialYearMaster';
import { BankMaster } from '../pages/admin/financial-masters/BankMaster';
import { CashCounterMaster } from '../pages/admin/financial-masters/CashCounterMaster';
import { UsersMaster } from '../pages/admin/security-masters/UsersMaster';
import { RolesMaster } from '../pages/admin/security-masters/RolesMaster';
import { PermissionsMaster } from '../pages/admin/security-masters/PermissionsMaster';
import { SmsMaster } from '../pages/admin/notification-masters/SmsMaster';
import { EmailMaster } from '../pages/admin/notification-masters/EmailMaster';
import { WhatsAppTemplateMaster } from '../pages/admin/notification-masters/WhatsAppTemplateMaster';
import { PushNotificationTemplateMaster } from '../pages/admin/notification-masters/PushNotificationTemplateMaster';
import { ReminderRuleMaster } from '../pages/admin/notification-masters/ReminderRuleMaster';
import { PromptsMaster } from '../pages/admin/ai-config-masters/PromptsMaster';
import { ClinicalRulesMaster } from '../pages/admin/ai-config-masters/ClinicalRulesMaster';
import { AuditLogMaster } from '../pages/admin/audit-logs/AuditLogMaster';
import { PharmacyLayout } from '../layouts/PharmacyLayout';
import { PharmacySummary } from '../pages/pharmacy/PharmacySummary';
import { BillingLayout } from '../layouts/BillingLayout';
import { BillingDashboard } from '../pages/billing/BillingDashboard';
import { OPBilling } from '../pages/billing/OPBilling';
import { IPBilling } from '../pages/billing/IPBilling';
import { BillingReports } from '../pages/billing/BillingReports';
import { BillingPrintTemplate } from '../pages/billing/BillingPrintTemplate';
import { RetailPOS } from '../pages/pharmacy/RetailPOS';
import { RetailReports } from '../pages/pharmacy/RetailReports';
import { Returns } from '../pages/pharmacy/Returns';
import { PrintableBill } from '../pages/pharmacy/PrintableBill';
import { LabLayout } from '../layouts/LabLayout';
import { LabDashboard } from '../pages/lab/LabDashboard';
import { LabOrderList } from '../pages/lab/LabOrderList';
import { LabAlerts } from '../pages/lab/LabAlerts';
import { LabQualityControl } from '../pages/lab/LabQualityControl';
import { LabMasters } from '../pages/lab/LabMasters';
import { LabReports } from '../pages/lab/LabReports';
import { RadiologyLayout } from '../layouts/RadiologyLayout';
import { RadiologyDashboard } from '../pages/radiology/RadiologyDashboard';
import { RadiologyOrderList } from '../pages/radiology/RadiologyOrderList';
import { RadiologyAlerts } from '../pages/radiology/RadiologyAlerts';
import { RadiologyReports } from '../pages/radiology/RadiologyReports';
import { RadiologyQC } from '../pages/radiology/RadiologyQC';
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/registration',
    element: <RegistrationLayout />,
    children: [
      {
        index: true,
        element: <RegistrationReports />
      },
      {
        path: 'new',
        element: <PatientRegistration />
      },
      {
        path: 'quick',
        element: <QuickRegistration />
      },
      {
        path: 'emergency',
        element: <EmergencyRegistration />
      },
      {
        path: 'patients',
        element: <ExistingPatients />
      },
      {
        path: 'today',
        element: <TodayRegistrations />
      },
      {
        path: 'documents',
        element: <PatientDocuments />
      },
      {
        path: 'insurance',
        element: <InsuranceVerification />
      },
      {
        path: 'alerts',
        element: <PatientAlerts />
      },
      {
        path: 'duplicate',
        element: <DuplicateCheck />
      },
      {
        path: 'merge',
        element: <PatientMerge />
      },
      {
        path: 'history',
        element: <VisitHistory />
      },
      {
        path: 'reports',
        element: <RegistrationReports />
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  },
  {
    path: '/appointments',
    element: <AppointmentLayout />,
    children: [
      {
        path: '',
        element: <AppointmentDashboard />
      },
      {
        path: 'dashboard',
        element: <AppointmentDashboard />
      },
      {
        path: 'new',
        element: <NewAppointment />
      },
      {
        path: 'online-booking',
        element: <OnlineBooking />
      },
      {
        path: 'online-booking/new',
        element: <NewOnlineBooking />
      },
      {
        path: 'list',
        element: <AppointmentList />
      },
      {
        path: 'schedules',
        element: <DoctorSchedules />
      },
      {
        path: 'queue',
        element: <QueueManagement />
      },
      {
        path: 'waiting-list',
        element: <WaitingList />
      },
      {
        path: 'reschedule',
        element: <RescheduleCancel />
      },
      {
        path: 'history',
        element: <AppointmentDashboard />
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  },
  {
    path: '/opd',
    element: <OPDLayout />,
    children: [
      {
        index: true,
        element: <OPDDashboard />
      },
      {
        path: 'queue',
        element: <OPDQueueBoard />
      },
      {
        path: 'triage/:visitId',
        element: <NursingTriage />
      },
      {
        path: 'consultations/:department',
        element: <DepartmentConsultations />
      },
      {
        path: 'visit/:visitId',
        element: <DoctorConsultation />
      },
      {
        path: 'lab-orders',
        element: <LabOrders />
      },
      {
        path: 'radiology',
        element: <RadiologyOrders />
      },
      {
        path: 'reports',
        element: <OPDReports />
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  },
  {
    path: '/ipd',
    element: <IPDLayout />,
    children: [
      {
        index: true,
        element: <IPDDashboard />
      },
      {
        path: 'bed-management',
        element: <BedManagement />
      },
      {
        path: 'admission-desk',
        element: <AdmissionDesk />
      },
      {
        path: 'new-admission',
        element: <NewAdmission />
      },
      {
        path: 'inpatients',
        element: <ActiveInpatients />
      },
      {
        path: 'visit/:patientId',
        element: <PatientIPDProfile />
      },
      {
        path: 'transfers',
        element: <WardTransfers />
      },
      {
        path: 'discharges',
        element: <Discharges />
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  },
  {
    path: '/emr',
    element: <EMRLayout />,
    children: [
      {
        index: true,
        element: <EMRDashboard />
      },
      {
        path: 'op',
        element: <OPPatients />
      },
      {
        path: 'ip',
        element: <IPPatients />
      },
      {
        path: 'emergency',
        element: <EmergencyPatients />
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  },
  {
    path: '/pharmacy',
    element: <PharmacyLayout />,
    children: [
      {
        index: true,
        element: <PharmacySummary />
      },
      {
        path: 'dashboard',
        element: <PharmacySummary />
      },
      {
        path: 'sop',
        element: <RetailPOS />
      },
      {
        path: 'returns',
        element: <Returns />
      },
      {
        path: 'print/:id',
        element: <PrintableBill />
      },
      {
        path: 'reports',
        element: <RetailReports />
      },
    ]
  },
  {
    path: '/billing',
    element: <BillingLayout />,
    children: [
      {
        index: true,
        element: <BillingDashboard />
      },
      {
        path: 'dashboard',
        element: <BillingDashboard />
      },
      {
        path: 'op',
        element: <OPBilling />
      },
      {
        path: 'ip',
        element: <IPBilling />
      },
      {
        path: 'reports',
        element: <BillingReports />
      },
      {
        path: 'print/:id',
        element: <BillingPrintTemplate />
      }
    ]
  },
  {
    path: '/lab',
    element: <LabLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/lab/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <LabDashboard />
      },
      {
        path: 'orders',
        element: <LabOrderList />
      },
      {
        path: 'alerts',
        element: <LabAlerts />
      },
      {
        path: 'qc',
        element: <LabQualityControl />
      },
      {
        path: 'masters',
        element: <LabMasters />
      },
      {
        path: 'reports',
        element: <LabReports />
      },
      {
        path: '*',
        element: <div className="p-8 text-slate-500">Feature in development...</div>
      }
    ]
  },
  {
    path: '/radiology',
    element: <RadiologyLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/radiology/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <RadiologyDashboard />
      },
      {
        path: 'worklist',
        element: <RadiologyOrderList />
      },
      {
        path: 'reports',
        element: <RadiologyReports />
      },
      {
        path: 'qc',
        element: <RadiologyQC />
      },
      {
        path: 'alerts',
        element: <RadiologyAlerts />
      },
      {
        path: '*',
        element: <div className="p-8 text-slate-500">Feature in development...</div>
      }
    ]
  },
  {
    path: '/insurance',
    element: <InsuranceLayout />,
    children: [
      { index: true, element: <InsuranceDashboard /> },
      { path: 'eligibility', element: <EligibilityVerification /> },
      { path: 'pre-authorizations', element: <PreAuthManagement /> },
      { path: 'claims', element: <ClaimsManagement /> },
      { path: 'appeals', element: <AppealsManagement /> },
      { path: 'settlements', element: <SettlementReconciliation /> },
    ]
  },
  {
    path: '/procurement',
    element: <ProcurementLayout />,
    children: [
      { index: true, element: <ProcurementDashboard /> },
      { path: 'pr', element: <PurchaseRequisitions /> },
      { path: 'rfq', element: <RequestForQuotation /> },
      { path: 'quotation', element: <VendorQuotation /> },
      { path: 'quotation-comparison', element: <QuotationComparison /> },
      { path: 'po', element: <PurchaseOrders /> },
      { path: 'grn', element: <GoodsReceipt /> },
      { path: 'purchase-return', element: <PurchaseReturn /> },
      { path: 'vendors', element: <VendorsCatalog /> },
      { path: 'approvals', element: <Approvals /> },
    ]
  },
  {
    path: '/inventory',
    element: <InventoryLayout />,
    children: [
      { index: true, element: <InventoryDashboard /> },
      { path: 'stock', element: <CurrentStock /> },
      { path: 'stock-in', element: <StockIn /> },
      { path: 'stock-issue', element: <StockIssue /> },
      { path: 'stock-return', element: <StockReturn /> },
      { path: 'transfer', element: <StockTransfer /> },
      { path: 'adjustment', element: <StockAdjustment /> },
      { path: 'batch-expiry', element: <BatchExpiry /> },
      { path: 'low-stock', element: <LowStockMonitor /> },
      { path: 'consumption', element: <DepartmentConsumption /> },
      { path: 'ledger', element: <StockLedger /> },
      { path: 'category-ledger', element: <CategoryLedger /> },
      { path: 'reports', element: <InventoryReports /> },
    ]
  },
  {
    path: '/executive',
    element: <ExecutiveLayout />,
    children: [
      { index: true, element: <Navigate to="/executive/overview" replace /> },
      { path: 'overview', element: <ExecutiveOverview /> },
      { path: 'financial', element: <FinancialAnalyticsPage /> },
      { path: 'clinical', element: <ClinicalAnalyticsPage /> },
      { path: 'operational', element: <OperationalAnalyticsPage /> },
      { path: 'procurement', element: <ProcurementAnalyticsPage /> },
      { path: 'inventory', element: <InventoryAnalyticsPage /> },
      { path: 'hr', element: <HRAnalyticsPage /> },
      { path: 'patient-experience', element: <PatientExperiencePage /> },
      { path: 'quality', element: <QualityCompliancePage /> },
      { path: 'ai-intelligence', element: <AIIntelligencePage /> },
      { path: 'predictive', element: <PredictiveAnalyticsPage /> },
      { path: 'scheduled-reports', element: <ScheduledReportsPage /> },
      { path: 'report-builder', element: <ReportBuilderPage /> },
      { path: 'audit-logs', element: <AuditLogsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <div className="flex h-full items-center justify-center text-slate-500 font-medium text-lg">Coming soon in next release...</div> }
    ]
  },
  {
    element: <AdminLayout />,
    children: [
      {
        path: '/admin',
        element: <Dashboard />,
      },
      { path: 'admin/masters/hospital', element: <HospitalMaster /> },
      { path: 'admin/masters/branch', element: <BranchMaster /> },
      { path: 'admin/masters/department', element: <DepartmentMaster /> },
      { path: 'admin/masters/doctor', element: <DoctorMaster /> },
      { path: 'admin/masters/doctor-specialization', element: <DoctorSpecializationMaster /> },
      { path: 'admin/masters/nurse', element: <NurseMaster /> },
      { path: 'admin/masters/pharmacist', element: <PharmacistMaster /> },
      { path: 'admin/masters/lab-technician', element: <LabTechnicianMaster /> },
      { path: 'admin/masters/receptionist', element: <ReceptionistMaster /> },
      { path: 'admin/masters/facility-management', element: <FacilityManagementMaster /> },
      { path: 'admin/masters/patient-category', element: <PatientCategoryMaster /> },
      { path: 'admin/masters/blood-group', element: <BloodGroupMaster /> },
      { path: 'admin/masters/allergy', element: <AllergyMaster /> },
      { path: 'admin/masters/diagnosis', element: <DiagnosisMaster /> },
      { path: 'admin/masters/procedure', element: <ProcedureMaster /> },
      { path: 'admin/masters/consultation-type', element: <ConsultationTypeMaster /> },
      { path: 'admin/masters/appointment-status', element: <AppointmentStatusMaster /> },
      { path: 'admin/masters/medicine', element: <MedicineMaster /> },
      { path: 'admin/masters/medicine-category', element: <MedicineCategoryMaster /> },
      { path: 'admin/masters/test', element: <TestMaster /> },
      { path: 'admin/masters/sample-type', element: <SampleTypeMaster /> },
      { path: 'admin/masters/radiology-service', element: <RadiologyServiceMaster /> },
      { path: 'admin/masters/equipment', element: <EquipmentMaster /> },
      { path: 'admin/masters/service', element: <ServiceMaster /> },
      { path: 'admin/masters/tax', element: <TaxMaster /> },
      { path: 'admin/masters/payment-mode', element: <PaymentModeMaster /> },
      { path: 'admin/masters/insurance-provider', element: <InsuranceProviderMaster /> },
      { path: 'admin/masters/tpa', element: <TpaMaster /> },
      { path: 'admin/masters/vendor', element: <VendorMaster /> },
      { path: 'admin/masters/category', element: <CategoryMaster /> },
      { path: 'admin/masters/sub-category', element: <SubCategoryMaster /> },
      { path: 'admin/masters/uom', element: <UomMaster /> },
      { path: 'admin/masters/item', element: <ItemMaster /> },
      { path: 'admin/masters/brand', element: <BrandMaster /> },
      { path: 'admin/masters/manufacturer', element: <ManufacturerMaster /> },
      { path: 'admin/masters/warehouse', element: <WarehouseMaster /> },
      { path: 'admin/masters/coa', element: <CoaMaster /> },
      { path: 'admin/masters/cost-center', element: <CostCenterMaster /> },
      { path: 'admin/masters/profit-center', element: <ProfitCenterMaster /> },
      { path: 'admin/masters/payment-terms', element: <PaymentTermsMaster /> },
      { path: 'admin/masters/currency', element: <CurrencyMaster /> },
      { path: 'admin/masters/financial-year', element: <FinancialYearMaster /> },
      { path: 'admin/masters/bank', element: <BankMaster /> },
      { path: 'admin/masters/cash-counter', element: <CashCounterMaster /> },
      { path: 'admin/masters/users', element: <UsersMaster /> },
      { path: 'admin/masters/roles', element: <RolesMaster /> },
      { path: 'admin/masters/permissions', element: <PermissionsMaster /> },
      { path: 'admin/masters/sms', element: <SmsMaster /> },
      { path: 'admin/masters/email', element: <EmailMaster /> },
      { path: 'admin/masters/whatsapp', element: <WhatsAppTemplateMaster /> },
      { path: 'admin/masters/push-notification', element: <PushNotificationTemplateMaster /> },
      { path: 'admin/masters/reminder-rules', element: <ReminderRuleMaster /> },
      { path: 'admin/masters/prompts', element: <PromptsMaster /> },
      { path: 'admin/masters/clinical-rules', element: <ClinicalRulesMaster /> },
      {
        path: 'admin/audit',
        element: <AuditLogMaster />,
      },
      {
        path: 'patients',
        element: <Patients />,
      },
      {
        path: 'appointments',
        element: <Appointments />,
      },
      {
        path: 'analytics',
        element: <Analytics />,
      },
      {
        path: '*',
        element: <NotFound />,
      }
    ],
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
// Force Vite HMR reload

