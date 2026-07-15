import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { Dashboard } from '../pages/Dashboard';
import { Patients } from '../pages/Patients';
import { Appointments } from '../pages/Appointments';
import { Analytics } from '../pages/Analytics';
import { NotFound } from '../pages/NotFound';
import { Login } from '../pages/Login';

import { RegistrationLayout } from '../layouts/RegistrationLayout';
import { RegistrationDashboard } from '../pages/registration/Dashboard';

import { MasterPage } from '../pages/admin/MasterPage';

import { HospitalMaster } from '../pages/admin/organization-masters/HospitalMaster';
import { BranchMaster } from '../pages/admin/organization-masters/BranchMaster';
import { DepartmentMaster } from '../pages/admin/organization-masters/DepartmentMaster';
import { DoctorMaster } from '../pages/admin/doctor-masters/DoctorMaster';
import { DoctorSpecializationMaster } from '../pages/admin/doctor-masters/DoctorSpecializationMaster';
import { NurseMaster } from '../pages/admin/employee-masters/NurseMaster';
import { PharmacistMaster } from '../pages/admin/employee-masters/PharmacistMaster';
import { LabTechnicianMaster } from '../pages/admin/employee-masters/LabTechnicianMaster';
import { ReceptionistMaster } from '../pages/admin/employee-masters/ReceptionistMaster';
import { HousekeepingMaster } from '../pages/admin/employee-masters/HousekeepingMaster';
import { PatientCategoryMaster } from '../pages/admin/patient-masters/PatientCategoryMaster';
import { BloodGroupMaster } from '../pages/admin/patient-masters/BloodGroupMaster';
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
import { ItemCategoryMaster } from '../pages/admin/purchase-inventory/ItemCategoryMaster';
import { WarehouseMaster } from '../pages/admin/purchase-inventory/WarehouseMaster';
import { CoaMaster } from '../pages/admin/financial-masters/CoaMaster';
import { CostCenterMaster } from '../pages/admin/financial-masters/CostCenterMaster';
import { UsersMaster } from '../pages/admin/security-masters/UsersMaster';
import { RolesMaster } from '../pages/admin/security-masters/RolesMaster';
import { PermissionsMaster } from '../pages/admin/security-masters/PermissionsMaster';
import { SmsMaster } from '../pages/admin/notification-masters/SmsMaster';
import { EmailMaster } from '../pages/admin/notification-masters/EmailMaster';
import { PromptsMaster } from '../pages/admin/ai-config-masters/PromptsMaster';
import { ClinicalRulesMaster } from '../pages/admin/ai-config-masters/ClinicalRulesMaster';

const router = createBrowserRouter([
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
        element: <RegistrationDashboard />
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  },
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      {
        index: true,
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
      { path: 'admin/masters/housekeeping', element: <HousekeepingMaster /> },
      { path: 'admin/masters/patient-category', element: <PatientCategoryMaster /> },
      { path: 'admin/masters/blood-group', element: <BloodGroupMaster /> },
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
      { path: 'admin/masters/item-category', element: <ItemCategoryMaster /> },
      { path: 'admin/masters/warehouse', element: <WarehouseMaster /> },
      { path: 'admin/masters/coa', element: <CoaMaster /> },
      { path: 'admin/masters/cost-center', element: <CostCenterMaster /> },
      { path: 'admin/masters/users', element: <UsersMaster /> },
      { path: 'admin/masters/roles', element: <RolesMaster /> },
      { path: 'admin/masters/permissions', element: <PermissionsMaster /> },
      { path: 'admin/masters/sms', element: <SmsMaster /> },
      { path: 'admin/masters/email', element: <EmailMaster /> },
      { path: 'admin/masters/prompts', element: <PromptsMaster /> },
      { path: 'admin/masters/clinical-rules', element: <ClinicalRulesMaster /> },
      {
        path: 'admin/audit',
        element: <MasterPage />,
      },
      {
        path: 'admin/settings',
        element: <MasterPage />,
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
