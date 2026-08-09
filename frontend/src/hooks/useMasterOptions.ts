import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;

/**
 * Dropdown sources for the admin masters.
 *
 * Screens outside /admin used to import the masters' hardcoded `mockData`
 * arrays directly, so a term added in Payment Terms Master never appeared in
 * Purchase Orders. These hooks read the same endpoints the masters write to,
 * which keeps the two in step and leaves one place to change.
 */

interface OptionsState<T> {
  options: T[];
  loading: boolean;
  error: string | null;
}

function useMasterList<T>(path: string, activeOnly = true): OptionsState<T> {
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}${path}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load ${path}`);
        return res.json();
      })
      .then((data: any[]) => {
        if (!alive) return;
        // An inactive master row must stay visible on records that already
        // reference it, but must not be offered for new ones.
        setOptions(activeOnly ? data.filter(d => d.status === 'Active') : data);
      })
      .catch((err: Error) => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path, activeOnly]);

  return { options, loading, error };
}

export interface PaymentTermOption {
  id: number;
  paymentTermCode: string;
  paymentTermName: string;
  creditDays: number;
  status: string;
}

export const usePaymentTerms = () =>
  useMasterList<PaymentTermOption>('/payment-terms/');

export interface CurrencyOption {
  id: number;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  exchangeRate: string;
  baseCurrency: boolean;
  status: string;
}

export const useCurrencies = () =>
  useMasterList<CurrencyOption>('/currencies/');

export interface CategoryOption {
  id: number;
  categoryCode: string;
  categoryName: string;
  status: string;
}

export const useItemCategories = () =>
  useMasterList<CategoryOption>('/categories/');

export interface VendorOption {
  id: number;
  vendorCode: string;
  vendorName: string;
  contactPerson?: string;
  mobileNumber?: string;
  email?: string;
  gstNumber?: string;
  panNumber?: string;
  drugLicenseNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  paymentTerms?: string;
  creditDays?: number;
  status: string;
}

export const useVendors = () =>
  useMasterList<VendorOption>('/vendors/');

export interface ItemOption {
  id: number;
  itemCode: string;
  itemName: string;
  category?: string;
  subCategory?: string;
  department?: string;
  brand?: string;
  manufacturer?: string;
  /** The vendor named on the item in Item Master. */
  vendor?: string;
  uom?: string;
  gstPercentage?: number;
  status: string;
}

export const useItems = () =>
  useMasterList<ItemOption>('/items/');

export interface WarehouseOption {
  id: number;
  storeCode: string;
  storeName: string;
  storeType?: string;
  location?: string;
  status: string;
}

/** Procurement calls these "warehouses"; the master behind them is Store Master. */
export const useWarehouses = () =>
  useMasterList<WarehouseOption>('/stores/');

export interface DepartmentOption {
  id: number;
  departmentCode: string;
  departmentName: string;
  status: string;
}

export const useDepartments = () =>
  useMasterList<DepartmentOption>('/departments/');
