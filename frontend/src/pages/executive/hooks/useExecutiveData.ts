import { useMemo } from 'react';

// Generates highly realistic mock data for the enterprise dashboard
export const useExecutiveData = () => {
  const data = useMemo(() => {
    // Current date calculations for mock trends
    const today = new Date();
    
    // Revenue Data
    const revenue = {
      today: 1245000,
      yesterday: 1180000,
      thisWeek: 8540000,
      thisMonth: 34500000,
      lastMonth: 31200000,
      thisYear: 415000000,
      netProfit: 8600000,
      ebitda: 11200000,
      cashFlow: 15400000,
      growth: 10.5,
      collections: 32100000,
      outstanding: 5400000,
      insurancePending: 8900000,
      operatingExpenses: 21500000,
      cashInHand: 4200000,
      
      trend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(today.getTime() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: 1000000 + Math.random() * 500000,
        target: 1200000
      })),
      
      byDepartment: [
        { name: 'Cardiology', value: 8500000 },
        { name: 'Oncology', value: 7200000 },
        { name: 'Orthopedics', value: 5400000 },
        { name: 'Neurology', value: 4800000 },
        { name: 'General Surgery', value: 4100000 },
        { name: 'Pediatrics', value: 2500000 },
        { name: 'Internal Medicine', value: 2000000 },
      ],

      byPaymentMode: [
        { name: 'Insurance', value: 45 },
        { name: 'Cash', value: 15 },
        { name: 'Credit Card', value: 25 },
        { name: 'Corporate', value: 15 },
      ],

      grossProfit: 21500000,
      cogs: 13000000,
      accountsReceivable: {
        total: 32500000,
        aging: [
          { period: '0-30 Days', value: 15000000 },
          { period: '31-60 Days', value: 8500000 },
          { period: '61-90 Days', value: 5000000 },
          { period: '90+ Days', value: 4000000 }
        ]
      },
      accountsPayable: {
        total: 18400000,
        aging: [
          { period: '0-30 Days', value: 10000000 },
          { period: '31-60 Days', value: 5400000 },
          { period: '61-90 Days', value: 2000000 },
          { period: '90+ Days', value: 1000000 }
        ]
      },
      expenses: [
        { category: 'Salary', budget: 15000000, actual: 14800000 },
        { category: 'Medicines', budget: 8000000, actual: 8500000 },
        { category: 'Consumables', budget: 4000000, actual: 3800000 },
        { category: 'Equipment', budget: 5000000, actual: 4500000 },
        { category: 'Utilities', budget: 2000000, actual: 2100000 },
        { category: 'Maintenance', budget: 1500000, actual: 1600000 },
        { category: 'Administration', budget: 3000000, actual: 2900000 },
      ],
      cashFlowStatement: {
        opening: 12500000,
        inflow: 34500000,
        outflow: 28400000,
        closing: 18600000,
      },
      insuranceAnalytics: {
        submitted: 4500,
        approved: 3850,
        rejected: 150,
        pending: 500,
        avgSettlementDays: 28,
        successRate: 96.2,
      },
      pnlSummary: [
        { metric: 'Revenue', current: 34500000, previous: 31200000, ytd: 125000000 },
        { metric: 'Cost of Goods Sold (COGS)', current: -13000000, previous: -12500000, ytd: -48000000 },
        { metric: 'Gross Profit', current: 21500000, previous: 18700000, ytd: 77000000 },
        { metric: 'Operating Expenses', current: -12900000, previous: -12000000, ytd: -45000000 },
        { metric: 'Operating Profit (EBIT)', current: 8600000, previous: 6700000, ytd: 32000000 },
        { metric: 'Other Income', current: 1200000, previous: 900000, ytd: 4500000 },
        { metric: 'Net Profit', current: 9800000, previous: 7600000, ytd: 36500000 },
      ]
    };

    // Clinical Data
    const clinical = {
      opVisitsToday: 1452,
      admissionsToday: 124,
      dischargesToday: 98,
      mortalityRate: 1.2,
      averageLengthOfStay: 4.5,
      icuOccupancy: 88,
      operationSuccessRate: 99.1,
      emergencyResponseTime: 4.5, // minutes
      
      bedOccupancy: [
        { name: 'General Ward', occupied: 240, total: 300 },
        { name: 'Private Room', occupied: 85, total: 100 },
        { name: 'ICU', occupied: 44, total: 50 },
        { name: 'NICU', occupied: 18, total: 20 },
        { name: 'Maternity', occupied: 32, total: 40 },
      ],

      admissionsTrend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(today.getTime() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        opd: 1200 + Math.floor(Math.random() * 300),
        ipd: 100 + Math.floor(Math.random() * 50),
        emergency: 30 + Math.floor(Math.random() * 20),
      }))
    };

    // Operational Data
    const operational = {
      appointmentsToday: 1580,
      waitingPatients: 142,
      cancelledAppointments: 45,
      otUtilization: 76,
      labTurnaroundTime: 45, // minutes
      radiologyTurnaroundTime: 65, // minutes
      pharmacyDispensingTime: 12, // minutes
      averageBillingTime: 8, // minutes
      
      patientFlow: [
        { hour: '08:00', patients: 120 },
        { hour: '10:00', patients: 250 },
        { hour: '12:00', patients: 310 },
        { hour: '14:00', patients: 220 },
        { hour: '16:00', patients: 280 },
        { hour: '18:00', patients: 190 },
        { hour: '20:00', patients: 80 },
      ]
    };

    // Inventory & Procurement Data
    const inventory = {
      totalValue: 85400000,
      lowStockItems: 124,
      outOfStockItems: 18,
      nearExpiryItems: 45,
      expiredStockValue: 125000,
      stockAccuracy: 98.5,
      pendingGRN: 24,
      pendingTransfers: 15,
      
      procurement: {
        pendingPR: 45,
        pendingPO: 28,
        pendingRFQ: 12,
        vendorPerformance: 92, // %
        averageCycle: 14, // days
        budgetUtilization: 68, // %
        purchaseSavings: 1250000,
      },
      
      consumptionTrend: Array.from({ length: 12 }, (_, i) => ({
        month: new Date(today.getFullYear(), today.getMonth() - (11 - i), 1).toLocaleString('default', { month: 'short' }),
        medicines: 2500000 + Math.random() * 500000,
        surgical: 1800000 + Math.random() * 300000,
        consumables: 900000 + Math.random() * 200000,
      }))
    };

    // HR & Quality Data
    const hr = {
      totalEmployees: 1245,
      doctors: 254,
      nurses: 680,
      attendanceRate: 94.5,
      leaveRequests: 32,
      monthlyPayroll: 85000000,
      attritionRate: 4.2,
      
      quality: {
        nabhCompliance: 98,
        jciCompliance: 96,
        openAuditFindings: 12,
        correctiveActions: 5,
        patientComplaints: 8,
        infectionRate: 1.1,
        medicationErrors: 2,
        hospitalAcquiredInfections: 3,
      }
    };

    // Predictive Analytics
    const predictive = {
      revenueNextMonth: 36200000,
      projectedBedOccupancy: 88,
      demandSpike: 'Antibiotics & Respiratory Drugs',
      highWorkloadDepts: ['Emergency', 'Pulmonology'],
    };

    // Alerts
    const alerts = [
      { id: 1, type: 'critical', message: 'ICU Capacity at 95% - Only 2 beds available.' },
      { id: 2, type: 'warning', message: 'Shortage of Propofol in Main OT.' },
      { id: 3, type: 'warning', message: 'Average waiting time in ER exceeded 15 mins.' },
      { id: 4, type: 'info', message: 'Insurance claims worth ₹2.5Cr pending > 30 days.' },
      { id: 5, type: 'critical', message: 'MRI Machine Scheduled Maintenance Tomorrow.' },
    ];

    return {
      revenue,
      clinical,
      operational,
      inventory,
      hr,
      predictive,
      alerts
    };
  }, []);

  return data;
};
