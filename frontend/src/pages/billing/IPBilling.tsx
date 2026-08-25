import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, Bed, CheckCircle, Printer, FileText, Shield } from 'lucide-react';
import { DateFilter } from '../../components/ui/DateFilter';
import axios from 'axios';
import toast from 'react-hot-toast';
const API_BASE = import.meta.env.VITE_API_URL as string;

interface BillItem {
  id: string;
  description: string;
  price: number;
  qty: number;
  total: number;
  category?: 'OPD' | 'IPD';
}

interface BillResponse {
  IpBillId: number;
  BillNumber: string;
  Uhid: string;
  PatientName: string;
  MobileNumber: string;
  BillDate: string;
  TotalAmount: number;
  Discount: number;
  Tax: number;
  NetAmount: number;
  PaymentMode: string;
  PaymentStatus: string;
  InsuranceClaimedAmount: number;
  PatientBalance: number;
  IsInsurancePaid: boolean;
  Items: any[];
}

export const IPBilling = () => {
  const { state } = useLocation();
  const [bills, setBills] = useState<BillResponse[]>([]);

  // From IPD
  const [admissions, setAdmissions] = useState<any[]>([]);

  // Consultation fees come from the Department master, so changing a fee there
  // changes what IP bills charge. The visit fee used to be a hardcoded 900.
  const [deptFees, setDeptFees] = useState<Record<string, number>>({});
  const [medicinePrices, setMedicinePrices] = useState<Record<string, number>>({});
  const [labPrices, setLabPrices] = useState<Record<string, number>>({});
  const [radPrices, setRadPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch(`${API_BASE}/departments/`)
      .then(r => r.json())
      .then((rows: any[]) => {
        if (!Array.isArray(rows)) return;
        const map: Record<string, number> = {};
        rows.forEach(d => {
          if (d.departmentName && d.consultationFee != null) {
            map[d.departmentName] = Number(d.consultationFee);
          }
        });
        setDeptFees(map);
      })
      .catch(e => console.error('[IPBilling] department fees load failed', e));

    axios.get(`${API_BASE}/medicines/`).then(res => {
      if (Array.isArray(res.data)) {
        const m: Record<string, number> = {};
        res.data.forEach((r: any) => {
          const price = Number(r.sellingPrice || r.unitPrice || r.mrp || 0);
          if (price > 0) {
            if (r.id) m[String(r.id)] = price;
            if (r.genericName) m[r.genericName.trim().toLowerCase()] = price;
            if (r.genericName && r.strength) m[`${r.genericName} ${r.strength}`.trim().toLowerCase()] = price;
          }
        });
        setMedicinePrices(m);
      }
    }).catch(() => {});

    axios.get(`${API_BASE}/tests/`).then(res => {
      if (Array.isArray(res.data)) {
        const m: Record<string, number> = {};
        res.data.forEach((r: any) => {
          const price = Number(r.testPrice || r.price || 0);
          if (price > 0) {
            if (r.id) m[String(r.id)] = price;
            if (r.testName) m[r.testName.trim().toLowerCase()] = price;
          }
        });
        setLabPrices(m);
      }
    }).catch(() => {});

    axios.get(`${API_BASE}/radiology-services/`).then(res => {
      if (Array.isArray(res.data)) {
        const m: Record<string, number> = {};
        res.data.forEach((r: any) => {
          const price = Number(r.servicePrice || r.price || 0);
          if (price > 0) {
            if (r.id) m[String(r.id)] = price;
            if (r.serviceName) m[r.serviceName.trim().toLowerCase()] = price;
          }
        });
        setRadPrices(m);
      }
    }).catch(() => {});
  }, []);

  /** Consultation fee for the admitting department; 0 when the master has none. */
  const consultationFeeFor = (department?: string) =>
    (department && deptFees[department]) || 0;

  /** Days admitted, counted from the admission timestamp to today.
   *  Previously this used expectedStayDays, which is a plan, not the actual
   *  stay, so a bill raised on day 5 still charged for the expected 3. */
  const daysAdmitted = (admissionDate?: string) => {
    if (!admissionDate) return 1;
    const start = new Date(admissionDate);
    if (isNaN(start.getTime())) return 1;
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
    return days > 0 ? days : 1;
  };

  const [searchId, setSearchId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [items, setItems] = useState<BillItem[]>([]);

  const [patientName, setPatientName] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const todayStr = (() => {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  })();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [successMsg, setSuccessMsg] = useState('');

  const [isInsurancePaid, setIsInsurancePaid] = useState(false);
  const [insuranceDetails, setInsuranceDetails] = useState<any>(null);
  const [insurancePolicy, setInsurancePolicy] = useState<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBills();
    fetchAdmissions();

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Check for passed claim data (e.g., from Insurance screen)
    if (state?.claimData && state?.dischargeCosts && !patientName) {
      const { claimData, dischargeCosts } = state;
      setPatientName(claimData.patient || claimData.patientName);
      setSelectedPatientId(claimData.uhid);
      setSearchId(claimData.uhid);

      // Attempt to get mobile number from patient API just in case it wasn't passed
      fetchPatientMobile(claimData.uhid);

      const newItems = [];
      let idCounter = 1;

      if (Number(dischargeCosts.operation) > 0) newItems.push({ id: `ITM-${idCounter++}`, description: 'Operation Cost', price: Number(dischargeCosts.operation), qty: 1, total: Number(dischargeCosts.operation) });
      if (Number(dischargeCosts.medication) > 0) newItems.push({ id: `ITM-${idCounter++}`, description: 'Medication Cost', price: Number(dischargeCosts.medication), qty: 1, total: Number(dischargeCosts.medication) });
      if (Number(dischargeCosts.dischargeMedication) > 0) newItems.push({ id: `ITM-${idCounter++}`, description: 'Discharge Medication', price: Number(dischargeCosts.dischargeMedication), qty: 1, total: Number(dischargeCosts.dischargeMedication) });
      if (Number(dischargeCosts.ward) > 0) newItems.push({ id: `ITM-${idCounter++}`, description: 'Ward Cost', price: Number(dischargeCosts.ward), qty: 1, total: Number(dischargeCosts.ward) });
      if (Number(dischargeCosts.other) > 0) newItems.push({ id: `ITM-${idCounter++}`, description: 'Other Costs', price: Number(dischargeCosts.other), qty: 1, total: Number(dischargeCosts.other) });

      setItems(newItems);

      if (claimData.balance <= 0) {
        setIsInsurancePaid(true);
      }
      setInsuranceDetails({
        total: claimData.amount,
        claimed: claimData.amount - claimData.balance,
        balance: claimData.balance
      });
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [state, patientName]);

  const loadPatientBillingItems = async (foundIPD: any) => {
    const stayDays = daysAdmitted(foundIPD.admissionDate);
    const visitFee = consultationFeeFor(foundIPD.specialty || foundIPD.department) || 400;
    const isFromOP = foundIPD.admissionType === 'OPD';
    const feeQty = isFromOP ? Math.max(0, stayDays - 1) : stayDays;
    
    const newItems: BillItem[] = [
      { id: 'ITM-001', description: `Room Charges (${stayDays} Days)`, price: 1500, qty: stayDays, total: 1500 * stayDays, category: 'IPD' },
      { id: 'ITM-002', description: 'Nursing Charges (Per Day)', price: 500, qty: stayDays, total: 500 * stayDays, category: 'IPD' },
    ];

    if (feeQty > 0) {
      newItems.push({ 
        id: 'ITM-003', 
        description: `Doctor Visit Fee (Per Day)${foundIPD.specialty ? ` - ${foundIPD.specialty}` : ''}`, 
        price: visitFee, 
        qty: feeQty, 
        total: visitFee * feeQty,
        category: 'IPD'
      });
    }
    
    /**
     * Resolve a medicine's selling price from the master.
     *
     * The lookup used to be by lowercased NAME only, falling back to a
     * hardcoded 15 when it missed — so any spelling variance silently printed
     * a wrong price on the invoice with no warning. medicineId is the reliable
     * key, so it is tried first; an unresolved medicine is now reported rather
     * than invented.
     */
    const unpricedMedicines: string[] = [];
    const priceForMedicine = (med: any): number => {
      const explicit = Number(med.price || 0);
      if (explicit > 0) return explicit;

      const byId = med.medicineId != null ? medicinePrices[String(med.medicineId)] : undefined;
      if (byId) return byId;

      const byName = medicinePrices[(med.medicineName || '').trim().toLowerCase()];
      if (byName) return byName;

      unpricedMedicines.push(med.medicineName || 'Unnamed medicine');
      return 0;
    };

    // 1. Take-home medicines from the discharge summary
    if (foundIPD.dischargeInfo?.medicines?.length > 0) {
      foundIPD.dischargeInfo.medicines.forEach((med: any, index: number) => {
         const price = priceForMedicine(med);
         const qty = Number(med.quantity || 1);
         newItems.push({
            id: `MED-${index+1}`,
            description: med.medicineName,
            price: price,
            qty: qty,
            total: price * qty,
            category: 'IPD'
         });
      });
    }

    // 1b. Medicines actually ADMINISTERED on the ward during the stay.
    //
    // These were never billed. Only the discharge summary's take-home drugs
    // were picked up, so a long admission on daily IV antibiotics left the
    // hospital with no charge at all for them. Quantity is the number of doses
    // marked given, so an unadministered prescription bills nothing.
    try {
      const medRes = await axios.get(`${API_BASE}/ipd/admissions/${foundIPD.id}/medications`);
      if (Array.isArray(medRes.data)) {
        medRes.data.forEach((med: any, index: number) => {
          const dosesGiven = Object.values(med.administrations || {}).filter(Boolean).length;
          if (dosesGiven === 0) return;

          const price = priceForMedicine(med);
          newItems.push({
            id: `WMED-${index + 1}`,
            description: `${med.medicineName}${med.route ? ` (${med.route})` : ''} - administered`,
            price,
            qty: dosesGiven,
            total: price * dosesGiven,
            category: 'IPD'
          });
        });
      }
    } catch (e) {
      console.error('[IPBilling] ward medication load failed', e);
      toast.error('Could not load administered medicines — the bill may be short.');
    }

    if (unpricedMedicines.length > 0) {
      // Better a visible zero the biller must resolve than a plausible wrong number.
      toast.error(
        `No master price found for: ${[...new Set(unpricedMedicines)].join(', ')}. ` +
        'Added at 0 — please set the rate before saving.'
      );
    }

    // 2. Add Lab Orders for this patient
    try {
      const labRes = await axios.get(`${API_BASE}/lab/orders?uhid=${encodeURIComponent(foundIPD.uhid)}`);
      if (Array.isArray(labRes.data)) {
        labRes.data.forEach((ord: any, index: number) => {
          let testNameStr = 'Lab Test';
          if (typeof ord.tests === 'string') testNameStr = ord.tests;
          else if (Array.isArray(ord.tests)) {
            testNameStr = ord.tests.map((t: any) => typeof t === 'string' ? t : t?.name || t?.test_name || t?.testCode).filter(Boolean).join(', ');
          } else if (ord.TestName) {
            testNameStr = ord.TestName;
          } else if (ord.category) {
            testNameStr = ord.category;
          }

          const price = labPrices[testNameStr.trim().toLowerCase()] || 250;
          newItems.push({
            id: `LAB-${index + 1}`,
            description: `Lab Test: ${testNameStr}`,
            price: price,
            qty: 1,
            total: price,
            category: 'IPD'
          });
        });
      }
    } catch (e) {
      console.error("Failed to fetch lab orders for billing", e);
    }

    // 3. Add Radiology Orders for this patient
    try {
      const radRes = await axios.get(`${API_BASE}/radiology/orders`);
      if (Array.isArray(radRes.data)) {
        const patientRad = radRes.data.filter((r: any) => (r.uhid || r.Uhid || '').toLowerCase() === foundIPD.uhid.toLowerCase());
        patientRad.forEach((ord: any, index: number) => {
          let radNameStr = 'Radiology Test';
          if (Array.isArray(ord.tests)) {
            radNameStr = ord.tests.map((t: any) => typeof t === 'string' ? t : t?.name || t?.test_name || 'X-Ray').filter(Boolean).join(', ');
          } else if (ord.test_name) {
            radNameStr = ord.test_name;
          }

          const price = radPrices[radNameStr.trim().toLowerCase()] || 500;
          newItems.push({
            id: `RAD-${index + 1}`,
            description: `Radiology: ${radNameStr}`,
            price: price,
            qty: 1,
            total: price,
            category: 'IPD'
          });
        });
      }
    } catch (e) {
      console.error("Failed to fetch radiology orders for billing", e);
    }
    // 4. Add unbilled OPD Charges
    try {
      const opdRes = await axios.get(`${API_BASE}/opd-visits/schedule?source=emr`);
      const unbilledOpd = opdRes.data.filter((p: any) => 
        (p.uhid === foundIPD.uhid || (p.uhid && p.uhid.toLowerCase() === foundIPD.uhid.toLowerCase())) && 
        (p.status === 'Completed' || p.isFinalized) &&
        p.billingStatus !== 'Paid' && 
        p.billingStatus !== 'Billed' && 
        p.billingStatus !== 'Completed'
      );
      
      unbilledOpd.forEach((visit: any, vIdx: number) => {
        const consultFee = consultationFeeFor(visit.department) || 500;
        newItems.push({
          id: `OPD-CONSULT-${vIdx}`,
          description: `Consultation Fee (${visit.department || 'General'})`,
          price: consultFee,
          qty: 1,
          total: consultFee,
          category: 'OPD'
        });

        if (visit.labOrders) {
          visit.labOrders.forEach((lab: any, idx: number) => {
            const price = labPrices[(lab.testName || '').trim().toLowerCase()] || 250;
            newItems.push({
              id: `OPD-LAB-${vIdx}-${idx}`,
              description: `Lab Test: ${lab.testName || 'General Lab'}`,
              price,
              qty: 1,
              total: price,
              category: 'OPD'
            });
          });
        }

        if (visit.radiologyOrders) {
          visit.radiologyOrders.forEach((rad: any, idx: number) => {
            const price = radPrices[(rad.testName || '').trim().toLowerCase()] || 1500;
            newItems.push({
              id: `OPD-RAD-${vIdx}-${idx}`,
              description: `Radiology: ${rad.testName || 'Scan'}`,
              price,
              qty: 1,
              total: price,
              category: 'OPD'
            });
          });
        }

        if (visit.prescriptions) {
          visit.prescriptions.forEach((pres: any, idx: number) => {
            const itemQty = pres.quantity ? parseFloat(pres.quantity) : 1;
            let itemPrice = pres.medicineId ? (medicinePrices[String(pres.medicineId)] ?? undefined) : undefined;
            if (itemPrice === undefined) itemPrice = medicinePrices[(pres.medicineName || '').trim().toLowerCase()];
            if (itemPrice === undefined) {
              const coreName = pres.medicineName ? pres.medicineName.split(' ')[0].toLowerCase() : '';
              itemPrice = medicinePrices[coreName] ?? pres.price ?? 0;
            }
            newItems.push({
              id: `OPD-PRES-${vIdx}-${idx}`,
              description: `Medicine: ${pres.medicineName || 'Prescription'} (${pres.quantity || ''})`.trim(),
              price: itemPrice,
              qty: isNaN(itemQty) ? 1 : itemQty,
              total: itemPrice * (isNaN(itemQty) ? 1 : itemQty),
              category: 'OPD'
            });
          });
        }
      });
    } catch (e) {
      console.error("Failed to fetch OPD visits for billing", e);
    }
    
    setItems(newItems);
  };

  useEffect(() => {
    // If navigated from Discharges with a uhid, auto-select that patient once admissions load
    if (state?.uhid && !state?.claimData && admissions.length > 0 && !patientName) {
      const foundIPD = admissions.find(p => p.uhid === state.uhid);
      if (foundIPD) {
        setSearchId(foundIPD.uhid);
        setPatientName(foundIPD.patientName);
        setSelectedPatientId(foundIPD.uhid);
        fetchPatientMobile(foundIPD.uhid);

        loadPatientBillingItems(foundIPD);
        setIsInsurancePaid(false);
        setInsuranceDetails(null);
      }
    }
  }, [state, admissions, patientName, medicinePrices, labPrices, radPrices]);

  const fetchBills = async () => {
    try {
      const response = await axios.get(`${API_BASE}/ip-billing/`);
      setBills(response.data);
    } catch (error) {
      console.error("Failed to fetch bills", error);
    }
  };

  const fetchAdmissions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/ipd/admissions`);
      setAdmissions(response.data);
    } catch (error) {
      console.error("Failed to fetch admissions", error);
    }
  };

  const fetchPatientMobile = async (uhid: string) => {
    try {
      // Find patient from registration
      const response = await axios.get(`${API_BASE}/patients/`);
      const patient = response.data.find((p: any) => p.uhid === uhid || p.Uhid === uhid);
      if (patient) {
        const mobile = patient.mobileNumber || patient.MobileNumber;
        if (mobile) setMobileNumber(mobile);
      }
    } catch (e) {
      console.error("Failed to get mobile number", e);
    }
  };

  const filteredSuggestions = admissions.filter(p => {
    // Filter out if patient already has a paid bill for this admission
    const hasPaidBill = bills.some(b =>
      b.Uhid === p.uhid &&
      new Date(b.BillDate) >= new Date(p.admissionDate) &&
      (b.PaymentStatus === 'Paid' || b.PaymentStatus === 'Completed')
    );
    if (hasPaidBill) return false;

    const sId = (searchId || '').toLowerCase();
    return (p.uhid?.toLowerCase() || '').includes(sId) ||
      (p.patientName?.toLowerCase() || '').includes(sId) ||
      (p.admissionNumber?.toLowerCase() || '').includes(sId);
  });

  const pendingDischarges = admissions.filter(p => {
    if (p.status !== 'Discharged' && p.status !== 'Discharge Requested') return false;

    // Assume billed if there's any bill for this UHID with a BillDate >= admissionDate
    const hasBill = bills.some(b =>
      b.Uhid === p.uhid &&
      new Date(b.BillDate) >= new Date(p.admissionDate) &&
      (b.PaymentStatus === 'Paid' || b.PaymentStatus === 'Pending') // IP Bills usually just mean it's billed
    );

    if (hasBill) return false;
    if (!dateFrom || !dateTo) return true;

    // Use dischargeDate if available, else admissionDate
    const dateToCheck = p.dischargeInfo?.dischargeDate || p.admissionDate;
    if (dateToCheck) {
      const visitDate = new Date(dateToCheck);
      const localDateStr = visitDate.getFullYear() + '-' + String(visitDate.getMonth() + 1).padStart(2, '0') + '-' + String(visitDate.getDate()).padStart(2, '0');
      return localDateStr >= dateFrom && localDateStr <= dateTo;
    }
    return true;
  });

  const filteredBills = bills.filter(bill => {
    if (!dateFrom || !dateTo) return true;
    const billDate = new Date(bill.BillDate);
    const localDateStr = billDate.getFullYear() + '-' + String(billDate.getMonth() + 1).padStart(2, '0') + '-' + String(billDate.getDate()).padStart(2, '0');
    return localDateStr >= dateFrom && localDateStr <= dateTo;
  });

  const selectPatient = (patient: any) => {
    setSearchId(patient.uhid || '');
    handleSearch(patient.uhid);
    setShowSuggestions(false);
  };

  const handleSearch = (idToSearch?: any) => {
    const query = (typeof idToSearch === 'string' ? idToSearch : searchId || '').toLowerCase();
    const foundIPD = admissions.find(p => {
      // Filter out if patient already has a paid bill for this admission
      const hasPaidBill = bills.some(b =>
        b.Uhid === p.uhid &&
        new Date(b.BillDate) >= new Date(p.admissionDate) &&
        (b.PaymentStatus === 'Paid' || b.PaymentStatus === 'Completed')
      );
      if (hasPaidBill) return false;

      return (p.uhid?.toLowerCase() || '') === query ||
        (p.patientName?.toLowerCase() || '') === query ||
        (p.admissionNumber?.toLowerCase() || '') === query;
    });
    if (foundIPD) {
      setSearchId(foundIPD.uhid || '');
      setPatientName(foundIPD.patientName);
      setSelectedPatientId(foundIPD.uhid);

      fetchPatientMobile(foundIPD.uhid);

      loadPatientBillingItems(foundIPD);

      setIsInsurancePaid(false);
      setInsuranceDetails(null);
      setInsurancePolicy(null);

      // Fetch active insurance policy
      axios.get(`${API_BASE}/insurance/policies/search?q=${foundIPD.uhid}`).then(insRes => {
        const policy = insRes.data;
        if (policy) {
          const validUntilDate = policy.validUntil ? new Date(policy.validUntil) : null;
          if (policy.status === 'Active' && (!validUntilDate || validUntilDate >= new Date(new Date().setHours(0, 0, 0, 0)))) {
            setInsurancePolicy(policy);
          }
        }
      }).catch(() => {
        // No active policy found
      });

      return;
    }

    toast.error('Patient not found in active admissions.');
  };

  useEffect(() => {
    if (state?.autoLoadUhid && admissions.length > 0 && !patientName) {
      handleSearch(state.autoLoadUhid);
      // clear state so it doesn't run again if we navigate back
      window.history.replaceState({}, document.title)
    }
  }, [state?.autoLoadUhid, admissions, patientName]);

  useEffect(() => {
    if (state?.autoLoadUhid && admissions.length > 0 && !patientName) {
      handleSearch(state.autoLoadUhid);
      // clear state so it doesn't run again if we navigate back
      window.history.replaceState({}, document.title)
    }
  }, [state?.autoLoadUhid, admissions, patientName]);

  const handleAddItem = () => {
    setItems([...items, { id: `ITM-${Date.now()}`, description: 'New Item', price: 0, qty: 1, total: 0 }]);
  };
  const handleItemChange = (id: string, field: keyof BillItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'price' || field === 'qty') updated.total = Number(updated.price) * Number(updated.qty);
      return updated;
    }));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  useEffect(() => {
    if (insurancePolicy) {
      let amountAfterDeductible = totalAmount - (insurancePolicy.deductible || 0);
      if (amountAfterDeductible < 0) amountAfterDeductible = 0;

      let copayAmount = amountAfterDeductible * ((insurancePolicy.copayPercentage || 0) / 100);

      let claimed = amountAfterDeductible - copayAmount;
      if (insurancePolicy.sumInsured && claimed > insurancePolicy.sumInsured) {
        claimed = insurancePolicy.sumInsured;
      }

      let balance = totalAmount - claimed;

      setInsuranceDetails({
        total: totalAmount,
        claimed: claimed,
        balance: balance,
        provider: insurancePolicy.insurerName || insurancePolicy.providerId,
        policyNo: insurancePolicy.policyNumber,
        isPolicy: true
      });
      setIsInsurancePaid(balance <= 0 && totalAmount > 0);
    }
  }, [totalAmount, insurancePolicy]);

  const handleGenerateBill = async () => {
    if (!patientName || items.length === 0) {
      toast.error('Please select a patient and add items first.');
      return;
    }

    let validMobile = mobileNumber;
    if (!validMobile || validMobile.length !== 10) {
      validMobile = "9999999999";
    }

    const payload = {
      BillNumber: `IPB-${String(bills.length + 1).padStart(4, '0')}`,
      Uhid: selectedPatientId,
      PatientName: patientName,
      MobileNumber: validMobile,
      TotalAmount: totalAmount,
      Discount: 0,
      Tax: 0,
      NetAmount: totalAmount,
      PaymentMode: isInsurancePaid ? 'Insurance' : 'Cash',
      PaymentStatus: isInsurancePaid ? 'Paid' : 'Pending',
      InsuranceClaimedAmount: insuranceDetails?.claimed || 0,
      PatientBalance: insuranceDetails?.balance || totalAmount,
      IsInsurancePaid: isInsurancePaid,
      Items: items.map(i => ({
        ItemCode: i.id,
        ItemDescription: `[${i.category || 'IPD'}] ${i.description}`,
        Quantity: i.qty,
        UnitPrice: i.price,
        Subtotal: i.total,
      }))
    };

    try {
      const response = await axios.post(`${API_BASE}/ip-billing/`, payload);
      const successMessage = `Bill ${response.data.BillNumber} generated successfully for ${patientName}!`;
      setSuccessMsg(successMessage);
      toast.success(successMessage);

      setPatientName('');
      setSearchId('');
      setSelectedPatientId('');
      setMobileNumber('');
      setItems([]);
      setIsInsurancePaid(false);
      setInsuranceDetails(null);
      setInsurancePolicy(null);

      fetchBills();

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error: any) {
      console.error("Error generating IP bill:", error);
      toast.error("Failed to generate IP bill. " + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between min-h-[76px]">
          <h2 className="text-xl font-bold text-slate-800">Generate IP Bill (Discharge)</h2>
          {successMsg && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg animate-in fade-in zoom-in duration-300">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <span className="text-sm font-semibold">{successMsg}</span>
            </div>
          )}
        </div>

        <div className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-end justify-between w-full">
            <div className="max-w-xl w-full" ref={wrapperRef}>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search by IP ID / UHID / Name</label>
              <div className="relative flex gap-2">
                <div className="flex-1 flex border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  <span className="bg-primary/10 px-4 py-3 text-primary font-bold text-sm border-r border-slate-200 flex items-center">
                    ID
                  </span>
                  <input
                    type="text"
                    placeholder="Type UHID or patient name..."
                    className="flex-1 px-4 py-3 text-sm focus:outline-none"
                    value={searchId}
                    onChange={e => { setSearchId(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <button onClick={handleSearch} className="bg-primary text-white px-5 py-3 rounded-lg hover:bg-primary/90 transition-colors shrink-0">
                  <Search className="w-5 h-5" />
                </button>
                {showSuggestions && searchId && (
                  <div className="absolute top-full left-0 right-14 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                    {filteredSuggestions.length > 0 ? (
                      <ul className="max-h-60 overflow-y-auto">
                        {filteredSuggestions.map(p => (
                          <li key={p.uhid} onClick={() => selectPatient(p)}
                            className="px-4 py-3 hover:bg-primary/5 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-0 transition-colors">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <Bed className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{p.patientName}</p>
                              <p className="text-xs text-slate-500">{p.uhid} · Ward {p.currentWardId} · {p.expectedStayDays || 1} days</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500">No matching patients found.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <label className="block text-sm font-medium text-slate-700 mb-2">Filter Recent Bills</label>
              <DateFilter
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                defaultDateFrom={todayStr}
                defaultDateTo={todayStr}
              />
            </div>
          </div>

          {!patientName ? (
            pendingDischarges.length > 0 ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Pending Discharges
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingDischarges.map((adm, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectPatient(adm)}
                      className="bg-white border border-slate-200 p-5 rounded-xl hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{adm.patientName}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {adm.admissionNumber} • {adm.uhid}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 text-ellipsis overflow-hidden whitespace-nowrap max-w-[250px]">
                            {adm.specialty} • {adm.admittingDoctor}
                          </p>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                <Bed className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">Search for an IP ID above to load patient admission and charge details.</p>
              </div>
            )
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{patientName}</p>
                  <p className="text-xs text-slate-500">{selectedPatientId} • {mobileNumber}</p>
                </div>
              </div>

              {/* Insurance Claim Info Display */}
              {insuranceDetails && (
                <div className={`p-5 rounded-xl border ${isInsurancePaid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  {isInsurancePaid ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-emerald-700">
                        <CheckCircle className="w-8 h-8" />
                        <div>
                          <p className="font-bold text-lg">Bill Paid by Insurance</p>
                          <p className="text-sm">The total bill amount (₹{insuranceDetails.total.toLocaleString()}) has been fully covered.</p>
                        </div>
                      </div>
                      <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-sm flex items-center gap-2 hover:bg-emerald-700 transition-colors">
                        <Printer className="w-4 h-4" /> Print Bill
                      </button>
                    </div>
                  ) : (
                    <div>
                      {insuranceDetails.isPolicy ? (
                        <div className="flex items-center gap-2 text-blue-700 font-bold mb-3">
                          <Shield className="w-5 h-5" /> Active Insurance Applied ({insuranceDetails.provider} - {insuranceDetails.policyNo})
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-rose-700 font-bold mb-3">
                          <FileText className="w-5 h-5" /> Insurance Claim Processed - Patient Balance Due
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg border border-rose-100 shadow-sm">
                          <p className="text-slate-500 font-semibold text-xs mb-1">Total Bill</p>
                          <p className="font-bold text-slate-800 text-base">₹{insuranceDetails.total.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-rose-100 shadow-sm">
                          <p className="text-slate-500 font-semibold text-xs mb-1">Insurance Claimed</p>
                          <p className="font-bold text-slate-800 text-base">₹{insuranceDetails.claimed.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-rose-500 shadow-sm">
                          <p className="text-rose-600 font-bold text-xs mb-1">Patient Balance</p>
                          <p className="font-bold text-rose-700 text-lg">₹{insuranceDetails.balance.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-4">Description</th>
                      <th className="px-5 py-4 w-36 text-right">Price (₹)</th>
                      <th className="px-5 py-4 w-24 text-center">Qty</th>
                      <th className="px-5 py-4 w-36 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.filter(i => i.category === 'OPD').length > 0 && (
                      <>
                        <tr className="bg-slate-100">
                          <td colSpan={4} className="px-5 py-2 font-bold text-slate-700 text-xs tracking-wider uppercase">OPD Charges</td>
                        </tr>
                        {items.filter(i => i.category === 'OPD').map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-5 py-3 max-w-xs">
                              <input
                                type="text"
                                className="w-full bg-transparent border-0 p-1 focus:ring-1 focus:ring-primary/30 rounded text-sm truncate"
                                value={item.description}
                                title={item.description}
                                onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                              />
                            </td>
                            <td className="px-5 py-3">
                              <input type="number" className="w-full text-right bg-transparent border-0 p-1 focus:ring-1 focus:ring-primary/30 rounded text-sm" value={item.price} onChange={e => handleItemChange(item.id, 'price', Number(e.target.value))} />
                            </td>
                            <td className="px-5 py-3">
                              {item.description.toLowerCase().includes('consultation fee') || item.description.toLowerCase().includes('doctor visit fee') ? (
                                <div className="w-full text-center text-slate-400">-</div>
                              ) : (
                                <input type="number" className="w-full text-center bg-transparent border-0 p-1 focus:ring-1 focus:ring-primary/30 rounded text-sm" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', Number(e.target.value))} />
                              )}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-slate-800">₹{item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-semibold">
                          <td colSpan={3} className="px-5 py-2 text-right text-slate-600 text-xs">OPD Subtotal:</td>
                          <td className="px-5 py-2 text-right text-slate-800 text-sm">₹{items.filter(i => i.category === 'OPD').reduce((s, i) => s + i.total, 0).toFixed(2)}</td>
                        </tr>
                      </>
                    )}

                    {items.filter(i => i.category !== 'OPD').length > 0 && (
                      <>
                        <tr className="bg-slate-100">
                          <td colSpan={4} className="px-5 py-2 font-bold text-slate-700 text-xs tracking-wider uppercase">IPD Charges</td>
                        </tr>
                        {items.filter(i => i.category !== 'OPD').map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-5 py-3 max-w-xs">
                              <input
                                type="text"
                                className="w-full bg-transparent border-0 p-1 focus:ring-1 focus:ring-primary/30 rounded text-sm truncate"
                                value={item.description}
                                title={item.description}
                                onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                              />
                            </td>
                            <td className="px-5 py-3">
                              <input type="number" className="w-full text-right bg-transparent border-0 p-1 focus:ring-1 focus:ring-primary/30 rounded text-sm" value={item.price} onChange={e => handleItemChange(item.id, 'price', Number(e.target.value))} />
                            </td>
                            <td className="px-5 py-3">
                              {item.description.toLowerCase().includes('consultation fee') || item.description.toLowerCase().includes('doctor visit fee') ? (
                                <div className="w-full text-center text-slate-400">-</div>
                              ) : (
                                <input type="number" className="w-full text-center bg-transparent border-0 p-1 focus:ring-1 focus:ring-primary/30 rounded text-sm" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', Number(e.target.value))} />
                              )}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-slate-800">₹{item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-semibold">
                          <td colSpan={3} className="px-5 py-2 text-right text-slate-600 text-xs">IPD Subtotal:</td>
                          <td className="px-5 py-2 text-right text-slate-800 text-sm">₹{items.filter(i => i.category !== 'OPD').reduce((s, i) => s + i.total, 0).toFixed(2)}</td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-primary/5 border-t-2 border-primary/20 font-bold">
                      <td colSpan={3} className="px-5 py-4 text-right text-slate-700">
                        {insuranceDetails ? 'Patient Payable:' : 'Total Amount:'}
                      </td>
                      <td className="px-5 py-4 text-right text-primary text-lg">
                        ₹{(insuranceDetails ? insuranceDetails.balance : totalAmount).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button onClick={handleAddItem} className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
                <button onClick={handleGenerateBill} className="bg-primary text-white font-semibold px-8 py-3 rounded-xl hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
                  Generate IP Bill
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Recent IP Bills</h2>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Bill ID</th>
              <th className="px-6 py-4">UHID</th>
              <th className="px-6 py-4">Patient Name</th>
              <th className="px-6 py-4">Mobile</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Items</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBills.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-400">No recent IP bills found for the selected dates.</td></tr>
            ) : filteredBills.map((bill, idx) => (
              <tr key={bill.IpBillId || idx} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono font-medium text-slate-900">{bill.BillNumber}</td>
                <td className="px-6 py-4 font-mono text-slate-500 text-xs">{bill.Uhid}</td>
                <td className="px-6 py-4 text-slate-700">{bill.PatientName}</td>
                <td className="px-6 py-4 text-slate-500 text-xs">{bill.MobileNumber}</td>
                <td className="px-6 py-4 text-slate-500 text-xs">{new Date(bill.BillDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-slate-600 text-xs">{(bill.Items || []).length} items</td>
                <td className="px-6 py-4 font-bold text-slate-800">₹{bill.NetAmount.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-md ${bill.PaymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {bill.PaymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
