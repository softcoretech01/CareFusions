import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
const Dashboard = lazy(() => import('../pages/Dashboard').then(m => ({ default: (m as any).Dashboard ?? (m as any).default })));
const Patients = lazy(() => import('../pages/Patients').then(m => ({ default: (m as any).Patients ?? (m as any).default })));
const Appointments = lazy(() => import('../pages/Appointments').then(m => ({ default: (m as any).Appointments ?? (m as any).default })));
const Analytics = lazy(() => import('../pages/Analytics').then(m => ({ default: (m as any).Analytics ?? (m as any).default })));
const NotFound = lazy(() => import('../pages/NotFound').then(m => ({ default: (m as any).NotFound ?? (m as any).default })));
const Login = lazy(() => import('../pages/Login').then(m => ({ default: (m as any).Login ?? (m as any).default })));

import { RegistrationLayout } from '../layouts/RegistrationLayout';
const PatientRegistration = lazy(() => import('../pages/registration/PatientRegistration').then(m => ({ default: (m as any).PatientRegistration ?? (m as any).default })));
const QuickRegistration = lazy(() => import('../pages/registration/QuickRegistration').then(m => ({ default: (m as any).QuickRegistration ?? (m as any).default })));
const EmergencyRegistration = lazy(() => import('../pages/registration/EmergencyRegistration').then(m => ({ default: (m as any).EmergencyRegistration ?? (m as any).default })));
const ExistingPatients = lazy(() => import('../pages/registration/ExistingPatients').then(m => ({ default: (m as any).ExistingPatients ?? (m as any).default })));
const TodayRegistrations = lazy(() => import('../pages/registration/TodayRegistrations').then(m => ({ default: (m as any).TodayRegistrations ?? (m as any).default })));
const PatientDocuments = lazy(() => import('../pages/registration/PatientDocuments').then(m => ({ default: (m as any).PatientDocuments ?? (m as any).default })));
const InsuranceVerification = lazy(() => import('../pages/registration/InsuranceVerification').then(m => ({ default: (m as any).InsuranceVerification ?? (m as any).default })));
const PatientAlerts = lazy(() => import('../pages/registration/PatientAlerts').then(m => ({ default: (m as any).PatientAlerts ?? (m as any).default })));
const DuplicateCheck = lazy(() => import('../pages/registration/DuplicateCheck').then(m => ({ default: (m as any).DuplicateCheck ?? (m as any).default })));
const PatientMerge = lazy(() => import('../pages/registration/PatientMerge').then(m => ({ default: (m as any).PatientMerge ?? (m as any).default })));
const VisitHistory = lazy(() => import('../pages/registration/VisitHistory').then(m => ({ default: (m as any).VisitHistory ?? (m as any).default })));
const RegistrationReports = lazy(() => import('../pages/registration/RegistrationReports').then(m => ({ default: (m as any).RegistrationReports ?? (m as any).default })));

import { AppointmentLayout } from '../layouts/AppointmentLayout';
const AppointmentDashboard = lazy(() => import('../pages/appointments/AppointmentDashboard').then(m => ({ default: (m as any).AppointmentDashboard ?? (m as any).default })));
const AppointmentList = lazy(() => import('../pages/appointments/AppointmentList').then(m => ({ default: (m as any).AppointmentList ?? (m as any).default })));
const NewAppointment = lazy(() => import('../pages/appointments/NewAppointment').then(m => ({ default: (m as any).NewAppointment ?? (m as any).default })));
const OnlineBooking = lazy(() => import('../pages/appointments/OnlineBooking').then(m => ({ default: (m as any).OnlineBooking ?? (m as any).default })));
const NewOnlineBooking = lazy(() => import('../pages/appointments/NewOnlineBooking').then(m => ({ default: (m as any).NewOnlineBooking ?? (m as any).default })));
const DoctorSchedules = lazy(() => import('../pages/appointments/DoctorSchedules').then(m => ({ default: (m as any).DoctorSchedules ?? (m as any).default })));
const QueueManagement = lazy(() => import('../pages/appointments/QueueManagement').then(m => ({ default: (m as any).QueueManagement ?? (m as any).default })));
const WaitingList = lazy(() => import('../pages/appointments/WaitingList').then(m => ({ default: (m as any).WaitingList ?? (m as any).default })));
const RescheduleCancel = lazy(() => import('../pages/appointments/RescheduleCancel').then(m => ({ default: (m as any).RescheduleCancel ?? (m as any).default })));

import { OPDLayout } from '../layouts/OPDLayout';
const OPDDashboard = lazy(() => import('../pages/opd/OPDDashboard').then(m => ({ default: (m as any).OPDDashboard ?? (m as any).default })));
const OPDQueueBoard = lazy(() => import('../pages/opd/OPDQueueBoard').then(m => ({ default: (m as any).OPDQueueBoard ?? (m as any).default })));
const NursingTriage = lazy(() => import('../pages/opd/NursingTriage').then(m => ({ default: (m as any).NursingTriage ?? (m as any).default })));
const DepartmentConsultations = lazy(() => import('../pages/opd/DepartmentConsultations').then(m => ({ default: (m as any).DepartmentConsultations ?? (m as any).default })));
const DoctorConsultation = lazy(() => import('../pages/opd/DoctorConsultation').then(m => ({ default: (m as any).DoctorConsultation ?? (m as any).default })));
const LabOrders = lazy(() => import('../pages/opd/LabOrders').then(m => ({ default: (m as any).LabOrders ?? (m as any).default })));
const RadiologyOrders = lazy(() => import('../pages/opd/RadiologyOrders').then(m => ({ default: (m as any).RadiologyOrders ?? (m as any).default })));
const OPDReports = lazy(() => import('../pages/opd/OPDReports').then(m => ({ default: (m as any).OPDReports ?? (m as any).default })));

import { IPDLayout } from '../layouts/IPDLayout';
const IPDDashboard = lazy(() => import('../pages/ipd/IPDDashboard').then(m => ({ default: (m as any).IPDDashboard ?? (m as any).default })));
const BedManagement = lazy(() => import('../pages/ipd/BedManagement').then(m => ({ default: (m as any).BedManagement ?? (m as any).default })));
const AdmissionDesk = lazy(() => import('../pages/ipd/AdmissionDesk').then(m => ({ default: (m as any).AdmissionDesk ?? (m as any).default })));
const NewAdmission = lazy(() => import('../pages/ipd/NewAdmission').then(m => ({ default: (m as any).NewAdmission ?? (m as any).default })));
const ActiveInpatients = lazy(() => import('../pages/ipd/ActiveInpatients').then(m => ({ default: (m as any).ActiveInpatients ?? (m as any).default })));
const WardTransfers = lazy(() => import('../pages/ipd/WardTransfers').then(m => ({ default: (m as any).WardTransfers ?? (m as any).default })));
const Discharges = lazy(() => import('../pages/ipd/Discharges').then(m => ({ default: (m as any).Discharges ?? (m as any).default })));
const PatientIPDProfile = lazy(() => import('../pages/ipd/PatientIPDProfile').then(m => ({ default: (m as any).PatientIPDProfile ?? (m as any).default })));

import { EMRLayout } from '../layouts/EMRLayout';
const EMRDashboard = lazy(() => import('../pages/emr/EMRDashboard').then(m => ({ default: (m as any).EMRDashboard ?? (m as any).default })));
const OPPatients = lazy(() => import('../pages/emr/OPPatients').then(m => ({ default: (m as any).OPPatients ?? (m as any).default })));
const IPPatients = lazy(() => import('../pages/emr/IPPatients').then(m => ({ default: (m as any).IPPatients ?? (m as any).default })));
const EmergencyPatients = lazy(() => import('../pages/emr/EmergencyPatients').then(m => ({ default: (m as any).EmergencyPatients ?? (m as any).default })));


import { InsuranceLayout } from '../layouts/InsuranceLayout';
const InsuranceDashboard = lazy(() => import('../pages/insurance/InsuranceDashboard').then(m => ({ default: (m as any).InsuranceDashboard ?? (m as any).default })));
const EligibilityVerification = lazy(() => import('../pages/insurance/EligibilityVerification').then(m => ({ default: (m as any).EligibilityVerification ?? (m as any).default })));
const PreAuthManagement = lazy(() => import('../pages/insurance/PreAuthManagement').then(m => ({ default: (m as any).PreAuthManagement ?? (m as any).default })));
const ClaimsManagement = lazy(() => import('../pages/insurance/ClaimsManagement').then(m => ({ default: (m as any).ClaimsManagement ?? (m as any).default })));
const AppealsManagement = lazy(() => import('../pages/insurance/AppealsManagement').then(m => ({ default: (m as any).AppealsManagement ?? (m as any).default })));
const SettlementReconciliation = lazy(() => import('../pages/insurance/SettlementReconciliation').then(m => ({ default: (m as any).SettlementReconciliation ?? (m as any).default })));

import { ProcurementLayout } from '../layouts/ProcurementLayout';
const ProcurementDashboard = lazy(() => import('../pages/procurement/ProcurementDashboard').then(m => ({ default: (m as any).ProcurementDashboard ?? (m as any).default })));
const PurchaseRequisitions = lazy(() => import('../pages/procurement/PurchaseRequisitions').then(m => ({ default: (m as any).PurchaseRequisitions ?? (m as any).default })));
const RequestForQuotation = lazy(() => import('../pages/procurement/RequestForQuotation').then(m => ({ default: (m as any).RequestForQuotation ?? (m as any).default })));
const VendorQuotation = lazy(() => import('../pages/procurement/VendorQuotation').then(m => ({ default: (m as any).VendorQuotation ?? (m as any).default })));
const QuotationComparison = lazy(() => import('../pages/procurement/QuotationComparison').then(m => ({ default: (m as any).QuotationComparison ?? (m as any).default })));
const PurchaseOrders = lazy(() => import('../pages/procurement/PurchaseOrders').then(m => ({ default: (m as any).PurchaseOrders ?? (m as any).default })));
const GoodsReceipt = lazy(() => import('../pages/procurement/GoodsReceipt').then(m => ({ default: (m as any).GoodsReceipt ?? (m as any).default })));
const PurchaseReturn = lazy(() => import('../pages/procurement/PurchaseReturn').then(m => ({ default: (m as any).PurchaseReturn ?? (m as any).default })));
const VendorsCatalog = lazy(() => import('../pages/procurement/VendorsCatalog').then(m => ({ default: (m as any).VendorsCatalog ?? (m as any).default })));
const Approvals = lazy(() => import('../pages/procurement/Approvals').then(m => ({ default: (m as any).Approvals ?? (m as any).default })));

import { InventoryLayout } from '../layouts/InventoryLayout';
const InventoryDashboard = lazy(() => import('../pages/inventory/InventoryDashboard').then(m => ({ default: (m as any).InventoryDashboard ?? (m as any).default })));
const CurrentStock = lazy(() => import('../pages/inventory/CurrentStock').then(m => ({ default: (m as any).CurrentStock ?? (m as any).default })));
const StockIn = lazy(() => import('../pages/inventory/StockIn').then(m => ({ default: (m as any).StockIn ?? (m as any).default })));
const StockIssue = lazy(() => import('../pages/inventory/StockIssue').then(m => ({ default: (m as any).StockIssue ?? (m as any).default })));
const StockReturn = lazy(() => import('../pages/inventory/StockReturn').then(m => ({ default: (m as any).StockReturn ?? (m as any).default })));
const StockTransfer = lazy(() => import('../pages/inventory/StockTransfer').then(m => ({ default: (m as any).StockTransfer ?? (m as any).default })));
const StockAdjustment = lazy(() => import('../pages/inventory/StockAdjustment').then(m => ({ default: (m as any).StockAdjustment ?? (m as any).default })));
const BatchExpiry = lazy(() => import('../pages/inventory/BatchExpiry').then(m => ({ default: (m as any).BatchExpiry ?? (m as any).default })));
const LowStockMonitor = lazy(() => import('../pages/inventory/LowStockMonitor').then(m => ({ default: (m as any).LowStockMonitor ?? (m as any).default })));
const DepartmentConsumption = lazy(() => import('../pages/inventory/DepartmentConsumption').then(m => ({ default: (m as any).DepartmentConsumption ?? (m as any).default })));
const StockLedger = lazy(() => import('../pages/inventory/StockLedger').then(m => ({ default: (m as any).StockLedger ?? (m as any).default })));
const CategoryLedger = lazy(() => import('../pages/inventory/CategoryLedger').then(m => ({ default: (m as any).CategoryLedger ?? (m as any).default })));
const InventoryReports = lazy(() => import('../pages/inventory/InventoryReports').then(m => ({ default: (m as any).InventoryReports ?? (m as any).default })));

import { ExecutiveLayout } from '../layouts/ExecutiveLayout';
const ExecutiveOverview = lazy(() => import('../pages/executive/ExecutiveOverview').then(m => ({ default: (m as any).ExecutiveOverview ?? (m as any).default })));
const FinancialAnalyticsPage = lazy(() => import('../pages/executive/FinancialAnalyticsPage').then(m => ({ default: (m as any).FinancialAnalyticsPage ?? (m as any).default })));
const ClinicalAnalyticsPage = lazy(() => import('../pages/executive/ClinicalAnalyticsPage').then(m => ({ default: (m as any).ClinicalAnalyticsPage ?? (m as any).default })));
const OperationalAnalyticsPage = lazy(() => import('../pages/executive/OperationalAnalyticsPage').then(m => ({ default: (m as any).OperationalAnalyticsPage ?? (m as any).default })));
const ProcurementAnalyticsPage = lazy(() => import('../pages/executive/ProcurementAnalyticsPage').then(m => ({ default: (m as any).ProcurementAnalyticsPage ?? (m as any).default })));
const InventoryAnalyticsPage = lazy(() => import('../pages/executive/InventoryAnalyticsPage').then(m => ({ default: (m as any).InventoryAnalyticsPage ?? (m as any).default })));
const HRAnalyticsPage = lazy(() => import('../pages/executive/HRAnalyticsPage').then(m => ({ default: (m as any).HRAnalyticsPage ?? (m as any).default })));
const PatientExperiencePage = lazy(() => import('../pages/executive/PatientExperiencePage').then(m => ({ default: (m as any).PatientExperiencePage ?? (m as any).default })));
const QualityCompliancePage = lazy(() => import('../pages/executive/QualityCompliancePage').then(m => ({ default: (m as any).QualityCompliancePage ?? (m as any).default })));
const AIIntelligencePage = lazy(() => import('../pages/executive/AIIntelligencePage').then(m => ({ default: (m as any).AIIntelligencePage ?? (m as any).default })));
const PredictiveAnalyticsPage = lazy(() => import('../pages/executive/PredictiveAnalyticsPage').then(m => ({ default: (m as any).PredictiveAnalyticsPage ?? (m as any).default })));
const ScheduledReportsPage = lazy(() => import('../pages/executive/ScheduledReportsPage').then(m => ({ default: (m as any).ScheduledReportsPage ?? (m as any).default })));
const ReportBuilderPage = lazy(() => import('../pages/executive/ReportBuilderPage').then(m => ({ default: (m as any).ReportBuilderPage ?? (m as any).default })));
const AuditLogsPage = lazy(() => import('../pages/executive/AuditLogsPage').then(m => ({ default: (m as any).AuditLogsPage ?? (m as any).default })));
const SettingsPage = lazy(() => import('../pages/executive/SettingsPage').then(m => ({ default: (m as any).SettingsPage ?? (m as any).default })));

const HospitalMaster = lazy(() => import('../pages/admin/organization-masters/HospitalMaster').then(m => ({ default: (m as any).HospitalMaster ?? (m as any).default })));
const BranchMaster = lazy(() => import('../pages/admin/organization-masters/BranchMaster').then(m => ({ default: (m as any).BranchMaster ?? (m as any).default })));
const DepartmentMaster = lazy(() => import('../pages/admin/organization-masters/DepartmentMaster').then(m => ({ default: (m as any).DepartmentMaster ?? (m as any).default })));
const WardChargeMaster = lazy(() => import('../pages/admin/organization-masters/WardChargeMaster').then(m => ({ default: (m as any).WardChargeMaster ?? (m as any).default })));
const DoctorMaster = lazy(() => import('../pages/admin/doctor-masters/DoctorMaster').then(m => ({ default: (m as any).DoctorMaster ?? (m as any).default })));
const DoctorSpecializationMaster = lazy(() => import('../pages/admin/doctor-masters/DoctorSpecializationMaster').then(m => ({ default: (m as any).DoctorSpecializationMaster ?? (m as any).default })));
const NurseMaster = lazy(() => import('../pages/admin/employee-masters/NurseMaster').then(m => ({ default: (m as any).NurseMaster ?? (m as any).default })));
const PharmacistMaster = lazy(() => import('../pages/admin/employee-masters/PharmacistMaster').then(m => ({ default: (m as any).PharmacistMaster ?? (m as any).default })));
const LabTechnicianMaster = lazy(() => import('../pages/admin/employee-masters/LabTechnicianMaster').then(m => ({ default: (m as any).LabTechnicianMaster ?? (m as any).default })));
const ReceptionistMaster = lazy(() => import('../pages/admin/employee-masters/ReceptionistMaster').then(m => ({ default: (m as any).ReceptionistMaster ?? (m as any).default })));
const HousekeepingMaster = lazy(() => import('../pages/admin/employee-masters/HousekeepingMaster').then(m => ({ default: (m as any).HousekeepingMaster ?? (m as any).default })));
const PatientCategoryMaster = lazy(() => import('../pages/admin/patient-masters/PatientCategoryMaster').then(m => ({ default: (m as any).PatientCategoryMaster ?? (m as any).default })));
const BloodGroupMaster = lazy(() => import('../pages/admin/patient-masters/BloodGroupMaster').then(m => ({ default: (m as any).BloodGroupMaster ?? (m as any).default })));
const AllergyMaster = lazy(() => import('../pages/admin/patient-masters/AllergyMaster').then(m => ({ default: (m as any).AllergyMaster ?? (m as any).default })));
const DiagnosisMaster = lazy(() => import('../pages/admin/patient-masters/DiagnosisMaster').then(m => ({ default: (m as any).DiagnosisMaster ?? (m as any).default })));
const ProcedureMaster = lazy(() => import('../pages/admin/patient-masters/ProcedureMaster').then(m => ({ default: (m as any).ProcedureMaster ?? (m as any).default })));
const MinorOperationMaster = lazy(() => import('../pages/admin/operation-masters/MinorOperationMaster').then(m => ({ default: (m as any).MinorOperationMaster ?? (m as any).default })));
const MajorOperationMaster = lazy(() => import('../pages/admin/operation-masters/MajorOperationMaster').then(m => ({ default: (m as any).MajorOperationMaster ?? (m as any).default })));
const ConsultationTypeMaster = lazy(() => import('../pages/admin/appointment-masters/ConsultationTypeMaster').then(m => ({ default: (m as any).ConsultationTypeMaster ?? (m as any).default })));
const AppointmentStatusMaster = lazy(() => import('../pages/admin/appointment-masters/AppointmentStatusMaster').then(m => ({ default: (m as any).AppointmentStatusMaster ?? (m as any).default })));
const MedicineMaster = lazy(() => import('../pages/admin/pharmacy-masters/MedicineMaster').then(m => ({ default: (m as any).MedicineMaster ?? (m as any).default })));
const TestMaster = lazy(() => import('../pages/admin/laboratory-masters/TestMaster').then(m => ({ default: (m as any).TestMaster ?? (m as any).default })));
const SampleTypeMaster = lazy(() => import('../pages/admin/laboratory-masters/SampleTypeMaster').then(m => ({ default: (m as any).SampleTypeMaster ?? (m as any).default })));
const RadiologyServiceMaster = lazy(() => import('../pages/admin/radiology-masters/RadiologyServiceMaster').then(m => ({ default: (m as any).RadiologyServiceMaster ?? (m as any).default })));
const EquipmentMaster = lazy(() => import('../pages/admin/equipment-masters/EquipmentMaster').then(m => ({ default: (m as any).EquipmentMaster ?? (m as any).default })));
const ServiceMaster = lazy(() => import('../pages/admin/billing-masters/ServiceMaster').then(m => ({ default: (m as any).ServiceMaster ?? (m as any).default })));
const TaxMaster = lazy(() => import('../pages/admin/billing-masters/TaxMaster').then(m => ({ default: (m as any).TaxMaster ?? (m as any).default })));
const PaymentModeMaster = lazy(() => import('../pages/admin/billing-masters/PaymentModeMaster').then(m => ({ default: (m as any).PaymentModeMaster ?? (m as any).default })));
const InsuranceProviderMaster = lazy(() => import('../pages/admin/insurance-masters/InsuranceProviderMaster').then(m => ({ default: (m as any).InsuranceProviderMaster ?? (m as any).default })));
const TpaMaster = lazy(() => import('../pages/admin/insurance-masters/TpaMaster').then(m => ({ default: (m as any).TpaMaster ?? (m as any).default })));
const VendorMaster = lazy(() => import('../pages/admin/purchase-inventory/VendorMaster').then(m => ({ default: (m as any).VendorMaster ?? (m as any).default })));
const CategoryMaster = lazy(() => import('../pages/admin/purchase-inventory/CategoryMaster').then(m => ({ default: (m as any).CategoryMaster ?? (m as any).default })));
const SubCategoryMaster = lazy(() => import('../pages/admin/purchase-inventory/SubCategoryMaster').then(m => ({ default: (m as any).SubCategoryMaster ?? (m as any).default })));
const UomMaster = lazy(() => import('../pages/admin/purchase-inventory/UomMaster').then(m => ({ default: (m as any).UomMaster ?? (m as any).default })));
const ItemMaster = lazy(() => import('../pages/admin/purchase-inventory/ItemMaster')
  .then(m => ({ default: (m as any).ItemMaster ?? (m as any).default })) as Promise<{
    default: React.ComponentType<{ inventoryType?: 'MEDICAL_ITEM' | 'NON_MEDICAL' }>
  }>);
const BrandMaster = lazy(() => import('../pages/admin/purchase-inventory/BrandMaster').then(m => ({ default: (m as any).BrandMaster ?? (m as any).default })));
const ManufacturerMaster = lazy(() => import('../pages/admin/purchase-inventory/ManufacturerMaster').then(m => ({ default: (m as any).ManufacturerMaster ?? (m as any).default })));
const WarehouseMaster = lazy(() => import('../pages/admin/purchase-inventory/WarehouseMaster').then(m => ({ default: (m as any).WarehouseMaster ?? (m as any).default })));
const CoaMaster = lazy(() => import('../pages/admin/financial-masters/CoaMaster').then(m => ({ default: (m as any).CoaMaster ?? (m as any).default })));
const CostCenterMaster = lazy(() => import('../pages/admin/financial-masters/CostCenterMaster').then(m => ({ default: (m as any).CostCenterMaster ?? (m as any).default })));
const ProfitCenterMaster = lazy(() => import('../pages/admin/financial-masters/ProfitCenterMaster').then(m => ({ default: (m as any).ProfitCenterMaster ?? (m as any).default })));
const PaymentTermsMaster = lazy(() => import('../pages/admin/financial-masters/PaymentTermsMaster').then(m => ({ default: (m as any).PaymentTermsMaster ?? (m as any).default })));
const CurrencyMaster = lazy(() => import('../pages/admin/financial-masters/CurrencyMaster').then(m => ({ default: (m as any).CurrencyMaster ?? (m as any).default })));
const FinancialYearMaster = lazy(() => import('../pages/admin/financial-masters/FinancialYearMaster').then(m => ({ default: (m as any).FinancialYearMaster ?? (m as any).default })));
const BankMaster = lazy(() => import('../pages/admin/financial-masters/BankMaster').then(m => ({ default: (m as any).BankMaster ?? (m as any).default })));
const CashCounterMaster = lazy(() => import('../pages/admin/financial-masters/CashCounterMaster').then(m => ({ default: (m as any).CashCounterMaster ?? (m as any).default })));
const UsersMaster = lazy(() => import('../pages/admin/security-masters/UsersMaster').then(m => ({ default: (m as any).UsersMaster ?? (m as any).default })));
const RolesMaster = lazy(() => import('../pages/admin/security-masters/RolesMaster').then(m => ({ default: (m as any).RolesMaster ?? (m as any).default })));
const PermissionsMaster = lazy(() => import('../pages/admin/security-masters/PermissionsMaster').then(m => ({ default: (m as any).PermissionsMaster ?? (m as any).default })));
const SmsMaster = lazy(() => import('../pages/admin/notification-masters/SmsMaster').then(m => ({ default: (m as any).SmsMaster ?? (m as any).default })));
const EmailMaster = lazy(() => import('../pages/admin/notification-masters/EmailMaster').then(m => ({ default: (m as any).EmailMaster ?? (m as any).default })));
const WhatsAppTemplateMaster = lazy(() => import('../pages/admin/notification-masters/WhatsAppTemplateMaster').then(m => ({ default: (m as any).WhatsAppTemplateMaster ?? (m as any).default })));
const PushNotificationTemplateMaster = lazy(() => import('../pages/admin/notification-masters/PushNotificationTemplateMaster').then(m => ({ default: (m as any).PushNotificationTemplateMaster ?? (m as any).default })));
const ReminderRuleMaster = lazy(() => import('../pages/admin/notification-masters/ReminderRuleMaster').then(m => ({ default: (m as any).ReminderRuleMaster ?? (m as any).default })));
const PromptsMaster = lazy(() => import('../pages/admin/ai-config-masters/PromptsMaster').then(m => ({ default: (m as any).PromptsMaster ?? (m as any).default })));
const ClinicalRulesMaster = lazy(() => import('../pages/admin/ai-config-masters/ClinicalRulesMaster').then(m => ({ default: (m as any).ClinicalRulesMaster ?? (m as any).default })));
const AuditLogMaster = lazy(() => import('../pages/admin/audit-logs/AuditLogMaster').then(m => ({ default: (m as any).AuditLogMaster ?? (m as any).default })));
import { PharmacyLayout } from '../layouts/PharmacyLayout';
const PharmacySummary = lazy(() => import('../pages/pharmacy/PharmacySummary').then(m => ({ default: (m as any).PharmacySummary ?? (m as any).default })));
import { BillingLayout } from '../layouts/BillingLayout';
const BillingDashboard = lazy(() => import('../pages/billing/BillingDashboard').then(m => ({ default: (m as any).BillingDashboard ?? (m as any).default })));
const OPBilling = lazy(() => import('../pages/billing/OPBilling').then(m => ({ default: (m as any).OPBilling ?? (m as any).default })));
const IPBilling = lazy(() => import('../pages/billing/IPBilling').then(m => ({ default: (m as any).IPBilling ?? (m as any).default })));
const BillingReports = lazy(() => import('../pages/billing/BillingReports').then(m => ({ default: (m as any).BillingReports ?? (m as any).default })));
const BillingPrintTemplate = lazy(() => import('../pages/billing/BillingPrintTemplate').then(m => ({ default: (m as any).BillingPrintTemplate ?? (m as any).default })));
const AdvancePayments = lazy(() => import('../pages/billing/AdvancePayments').then(m => ({ default: (m as any).AdvancePayments ?? (m as any).default })));
const RetailPOS = lazy(() => import('../pages/pharmacy/RetailPOS').then(m => ({ default: (m as any).RetailPOS ?? (m as any).default })));
const RetailReports = lazy(() => import('../pages/pharmacy/RetailReports').then(m => ({ default: (m as any).RetailReports ?? (m as any).default })));
const Returns = lazy(() => import('../pages/pharmacy/Returns').then(m => ({ default: (m as any).Returns ?? (m as any).default })));
const PrintableBill = lazy(() => import('../pages/pharmacy/PrintableBill').then(m => ({ default: (m as any).PrintableBill ?? (m as any).default })));
import { LabLayout } from '../layouts/LabLayout';
const LabDashboard = lazy(() => import('../pages/lab/LabDashboard').then(m => ({ default: (m as any).LabDashboard ?? (m as any).default })));
const LabOrderList = lazy(() => import('../pages/lab/LabOrderList').then(m => ({ default: (m as any).LabOrderList ?? (m as any).default })));
const LabAlerts = lazy(() => import('../pages/lab/LabAlerts').then(m => ({ default: (m as any).LabAlerts ?? (m as any).default })));
const LabQualityControl = lazy(() => import('../pages/lab/LabQualityControl').then(m => ({ default: (m as any).LabQualityControl ?? (m as any).default })));
const LabMasters = lazy(() => import('../pages/lab/LabMasters').then(m => ({ default: (m as any).LabMasters ?? (m as any).default })));
const LabReports = lazy(() => import('../pages/lab/LabReports').then(m => ({ default: (m as any).LabReports ?? (m as any).default })));
import { RadiologyLayout } from '../layouts/RadiologyLayout';
const RadiologyDashboard = lazy(() => import('../pages/radiology/RadiologyDashboard').then(m => ({ default: (m as any).RadiologyDashboard ?? (m as any).default })));
const RadiologyOrderList = lazy(() => import('../pages/radiology/RadiologyOrderList').then(m => ({ default: (m as any).RadiologyOrderList ?? (m as any).default })));
const RadiologyAlerts = lazy(() => import('../pages/radiology/RadiologyAlerts').then(m => ({ default: (m as any).RadiologyAlerts ?? (m as any).default })));
const RadiologyReports = lazy(() => import('../pages/radiology/RadiologyReports').then(m => ({ default: (m as any).RadiologyReports ?? (m as any).default })));
const RadiologyQC = lazy(() => import('../pages/radiology/RadiologyQC').then(m => ({ default: (m as any).RadiologyQC ?? (m as any).default })));
export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <ErrorBoundary />,
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
        path: 'pos',
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
        path: 'advance-payments',
        element: <AdvancePayments />
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
      { path: 'admin/masters/ward-charge', element: <WardChargeMaster /> },
      { path: 'admin/masters/doctor', element: <DoctorMaster /> },
      { path: 'admin/masters/doctor-specialization', element: <DoctorSpecializationMaster /> },
      { path: 'admin/masters/nurse', element: <NurseMaster /> },
      { path: 'admin/masters/pharmacist', element: <PharmacistMaster /> },
      { path: 'admin/masters/lab-technician', element: <LabTechnicianMaster /> },
      { path: 'admin/masters/receptionist', element: <ReceptionistMaster /> },
      { path: 'admin/masters/housekeeping', element: <HousekeepingMaster /> },
      { path: 'admin/masters/patient-category', element: <PatientCategoryMaster /> },
      { path: 'admin/masters/blood-group', element: <BloodGroupMaster /> },
      { path: 'admin/masters/allergy', element: <AllergyMaster /> },
      { path: 'admin/masters/diagnosis', element: <DiagnosisMaster /> },
      { path: 'admin/masters/procedure', element: <ProcedureMaster /> },
      { path: 'admin/masters/minor-operation', element: <MinorOperationMaster /> },
      { path: 'admin/masters/major-operation', element: <MajorOperationMaster /> },
      { path: 'admin/masters/consultation-type', element: <ConsultationTypeMaster /> },
      { path: 'admin/masters/appointment-status', element: <AppointmentStatusMaster /> },
      { path: 'admin/masters/medicine', element: <MedicineMaster /> },
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
      // One component, two type-scoped routes. `item` is kept so existing deep
      // links and bookmarks still resolve; it lists both item types.
      { path: 'admin/masters/item', element: <ItemMaster /> },
      { path: 'admin/masters/medical-item', element: <ItemMaster inventoryType="MEDICAL_ITEM" /> },
      { path: 'admin/masters/non-medical-item', element: <ItemMaster inventoryType="NON_MEDICAL" /> },
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

const RouteFallback = () => (
  <div className="h-screen flex items-center justify-center bg-slate-50">
    <div className="flex items-center gap-3 text-slate-400 text-sm">
      <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
      Loading…
    </div>
  </div>
);

export const AppRouter = () => {
  // Pages are lazy chunks, so a boundary above the router covers every route.
  return (
    <Suspense fallback={<RouteFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
};
// Force Vite HMR reload

