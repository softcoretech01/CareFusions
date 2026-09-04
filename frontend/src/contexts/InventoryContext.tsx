import { API_BASE_URL } from '@/utils/apiBase';
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode, useRef } from 'react';

const API_BASE = API_BASE_URL;
const INV = `${API_BASE}/inventory`;

export type DocType = 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'RETURN' | 'ADJUSTMENT';

export interface Store {
  storeId: number;
  storeCode: string;
  storeName: string;
  storeType: string;
}

export interface ItemMaster {
  /** Owning master: MEDICINE | MEDICAL_ITEM | NON_MEDICAL. */
  itemType?: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  category: string;
  subCategory: string;
  uom: string;
  reorderLevel: number | null;
  minStock: number | null;
  maxStock: number | null;
  batchRequired: boolean;
  expiryRequired: boolean;
  gstPercentage: number | null;
}

export interface StockLot {
  /** Owning master: MEDICINE | MEDICAL_ITEM | NON_MEDICAL. */
  itemType?: string;
  stockId: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  category: string;
  subCategory: string;
  brand: string;
  manufacturer: string;
  storeId: number;
  storeName: string;
  batchNo: string;
  mfgDate: string | null;
  expiryDate: string | null;
  quantity: number;
  reservedQty: number;
  valuationRate: number;
  stockValue: number;
  uom: string;
  reorderLevel: number | null;
  minStock: number | null;
  maxStock: number | null;
}

/** A lot that can be issued — FEFO ordered, expired excluded. */
export interface IssuableLot {
  /** Owning master: MEDICINE | MEDICAL_ITEM | NON_MEDICAL. */
  itemType?: string;
  stockId: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  category: string;
  batchNo: string;
  expiryDate: string | null;
  quantity: number;
  valuationRate: number;
  uom: string;
}

export interface DocumentItem {
  docItemId?: number;
  /** Owning master: MEDICINE | MEDICAL_ITEM | NON_MEDICAL. */
  itemType?: string;
  itemId: number;
  itemName: string;
  batchNo: string;
  mfgDate?: string | null;
  expiryDate?: string | null;
  quantity: number;
  rate: number;
  value: number;
  uom: string;
  remarks?: string;
}

export interface MovementDocument {
  docId: number;
  docNumber: string;
  docType: DocType;
  docDate: string;
  fromStoreId: number | null;
  fromStoreName: string;
  toStoreId: number | null;
  toStoreName: string;
  departmentName: string;
  vendorName: string;
  referenceNo: string;
  requestedBy: string;
  approvedBy: string;
  reason: string;
  remarks: string;
  status: string;
  totalItems: number;
  totalQty: number;
  totalValue: number;
  items: DocumentItem[];
}

export interface LedgerEntry {
  /** Owning master: MEDICINE | MEDICAL_ITEM | NON_MEDICAL. */
  itemType?: string;
  ledgerId: number;
  txnDate: string;
  itemId: number;
  itemName: string;
  storeId: number;
  storeName: string;
  batchNo: string;
  movementType: string;
  quantity: number;
  rate: number;
  value: number;
  balanceQty: number;
  docId: number | null;
  docNumber: string;
  docType: string;
  remarks: string;
  user: string;
}

export interface LowStockRow {
  /** Owning master: MEDICINE | MEDICAL_ITEM | NON_MEDICAL. */
  itemType?: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  category: string;
  reorderLevel: number;
  quantity: number;
  deficit: number;
  uom: string;
}

export interface ExpiringRow {
  /** Owning master: MEDICINE | MEDICAL_ITEM | NON_MEDICAL. */
  itemType?: string;
  stockId: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  category: string;
  storeName: string;
  batchNo: string;
  mfgDate: string | null;
  expiryDate: string | null;
  quantity: number;
  uom: string;
  daysToExpiry: number;
}

export interface ValuationRow {
  /** Owning master: MEDICINE | MEDICAL_ITEM | NON_MEDICAL. */
  itemType?: string;
  category: string;
  itemCount: number;
  totalQty: number;
  totalValue: number;
}

export interface InventoryDashboardData {
  totalItems: number;
  stockValue: number;
  outOfStock: number;
  expiringSoon: number;
  todayInward: number;
  todayOutward: number;
  trend: { date: string; inQty: number; outQty: number }[];
}

/** The payload a movement screen submits. */
export interface PostDocumentInput {
  docType: DocType;
  fromStoreId?: number | null;
  toStoreId?: number | null;
  departmentName?: string | null;
  vendorName?: string | null;
  referenceNo?: string | null;
  requestedBy?: string | null;
  approvedBy?: string | null;
  reason?: string | null;
  remarks?: string | null;
  items: {
    itemId: number;
    /** Owning master: MEDICINE | MEDICAL_ITEM | NON_MEDICAL. */
    itemType?: string;
    batchNo?: string | null;
    mfgDate?: string | null;
    expiryDate?: string | null;
    quantity: number;
    rate?: number;
    uom?: string | null;
    remarks?: string | null;
  }[];
}

interface InventoryContextType {
  stores: Store[];
  items: ItemMaster[];
  stock: StockLot[];
  documents: MovementDocument[];
  ledger: LedgerEntry[];
  lowStock: LowStockRow[];
  expiring: ExpiringRow[];
  valuation: ValuationRow[];
  dashboard: InventoryDashboardData | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  /** Re-fetch everything. Pass silent=true to skip the loading flag (background sync). */
  refresh: (silent?: boolean) => Promise<void>;
  hasLoaded: boolean;
  /** Lots issuable from a store, nearest expiry first. */
  getIssuableLots: (storeId: number) => Promise<IssuableLot[]>;
  postDocument: (input: PostDocumentInput) => Promise<{ docNumber: string } | null>;
  updateDocument: (docId: number, input: PostDocumentInput) => Promise<boolean>;
  deleteDocument: (docId: number) => Promise<boolean>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [stock, setStock] = useState<StockLot[]>([]);
  const [documents, setDocuments] = useState<MovementDocument[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [lowStock, setLowStock] = useState<LowStockRow[]>([]);
  const [expiring, setExpiring] = useState<ExpiringRow[]>([]);
  const [valuation, setValuation] = useState<ValuationRow[]>([]);
  const [dashboard, setDashboard] = useState<InventoryDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Everything is owned by the backend (inventory schema). Stock, ledger and
  // documents always move together because the SP posts them in one call.
  const refresh = useCallback(async (silent = false) => {
    // Always re-fetch. The initial-load guard lives in the useInventory() loader
    // below; if refresh() short-circuited on hasLoaded, a post/delete could never
    // re-sync and newly added data only appeared after a full page reload.
    if (!silent) setLoading(true);
    const get = (path: string) => fetch(`${INV}/${path}`).then(r => r.json());
    const [st, it, lots, docs, led, low, exp, val, dash] = await Promise.allSettled([
      get('stores'), get('items'), get('stock'), get('documents'), get('ledger'),
      get('stock/low'), get('stock/expiring?days=90'), get('stock/valuation'), get('dashboard'),
    ]);
    const ok = <T,>(r: PromiseSettledResult<any>, set: (v: T) => void, isArray = true) => {
      if (r.status === 'fulfilled' && (!isArray || Array.isArray(r.value))) set(r.value);
    };
    ok<Store[]>(st, setStores);
    ok<ItemMaster[]>(it, setItems);
    ok<StockLot[]>(lots, setStock);
    ok<MovementDocument[]>(docs, setDocuments);
    ok<LedgerEntry[]>(led, setLedger);
    ok<LowStockRow[]>(low, setLowStock);
    ok<ExpiringRow[]>(exp, setExpiring);
    ok<ValuationRow[]>(val, setValuation);
    if (dash.status === 'fulfilled' && dash.value && !Array.isArray(dash.value)) setDashboard(dash.value);
    if (lots.status === 'rejected') console.error('[Inventory] stock load failed', lots.reason);
    if (!silent) setLoading(false);
    setHasLoaded(true);
  }, []);

  // Re-sync silently when the user returns to the tab/window, so data added
  // elsewhere (another module or tab) shows without a manual reload.
  useEffect(() => {
    const sync = () => { if (!document.hidden) refresh(true); };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [refresh]);

  const getIssuableLots = useCallback(async (storeId: number): Promise<IssuableLot[]> => {
    try {
      const res = await fetch(`${INV}/stock/issuable?storeId=${storeId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('[Inventory] issuable lots failed', e);
      return [];
    }
  }, []);

  const postDocument = async (input: PostDocumentInput) => {
    setError(null);
    try {
      const res = await fetch(`${INV}/documents`, {
        method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // FastAPI validation errors come back as a list under `detail`.
        const detail = Array.isArray(body?.detail)
          ? body.detail.map((d: any) => d.msg).join('; ')
          : body?.detail || 'Failed to post stock movement';
        throw new Error(detail);
      }
      const out = await res.json();
      await refresh();
      return { docNumber: out.docNumber as string };
    } catch (e: any) {
      console.error('[Inventory] post document failed', e);
      setError(e.message || 'Failed to post stock movement');
      return null;
    }
  };

  const updateDocument = async (docId: number, input: PostDocumentInput) => {
    setError(null);
    try {
      const res = await fetch(`${INV}/documents/${docId}`, {
        method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = Array.isArray(body?.detail)
          ? body.detail.map((d: any) => d.msg).join('; ')
          : body?.detail || 'Failed to update document';
        throw new Error(detail);
      }
      await refresh();
      return true;
    } catch (e: any) {
      console.error('[Inventory] update document failed', e);
      setError(e.message || 'Failed to update document');
      return false;
    }
  };

  const deleteDocument = async (docId: number) => {
    try {
      const res = await fetch(`${INV}/documents/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
      return true;
    } catch (e) {
      console.error('[Inventory] delete document failed', e);
      return false;
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        stores, items, stock, documents, ledger, lowStock, expiring, valuation, dashboard,
        loading, hasLoaded, error, clearError, refresh, getIssuableLots, postDocument, updateDocument, deleteDocument,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  
  // Depend on the values actually used, not the context object: the provider
  
  // builds a new object every render, so [context] re-fired this effect on each
  
  // one. The ref stops a second request while the first is still in flight —
  
  // hasLoaded only flips once the fetches resolve, so it cannot guard that gap.
  
  const { hasLoaded, loading, refresh } = context as any;
  
  const requested = useRef(false);
  
  useEffect(() => {
  
    if (hasLoaded || loading || requested.current) return;
  
    requested.current = true;
  
    Promise.resolve(refresh?.()).finally(() => { requested.current = false; });
  
  }, [hasLoaded, loading, refresh]);

  return context;
};
