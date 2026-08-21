# Unified Inventory + Procurement + Pharmacy — Implementation Checklist

Derived from the approved MASTER IMPLEMENTATION PROMPT. One row per change.
Status: `TODO` | `WIP` | `DONE` | `BLOCKED`.

## Canonical vocabulary (spec §4) — DECIDED

| Concept | Canonical name | Values |
|---|---|---|
| Type classification (masters) | `InventoryType` (DB) / `inventoryType` (API + UI) | `MEDICINE`, `MEDICAL_ITEM`, `NON_MEDICAL` |
| Type on transaction lines | `ItemType` (DB) / `itemType` (API + UI) | same three values |
| Master ownership | `MEDICINE` → `admin.Master_Medicine`; `MEDICAL_ITEM` / `NON_MEDICAL` → `admin.Master_Item` | — |

`InventoryType` names the *classification* (Category / Item masters). `ItemType` names the
*same value carried on a transaction line* (stock, PR/PO/GRN, ledger). Identical value set.
No other spelling of this concept may be introduced anywhere.

**Legacy values in live data:** `Master_Category.InventoryType` = `'Medical'` (2 rows), `NULL` (5 rows).
No other table carries a type today. Migration mapping in Phase 1.

---

## Phase 0 — Data Cleanup

| # | File / Object | Current logic | Required change | Why | Depends on | Test | Status |
|---|---|---|---|---|---|---|---|
| 0.1 | `admin.Master_Item` (live) | 10 rows, all genuine consumables / equipment / stationery | **No drug rows exist — verified by audit.** No data migration required | Spec Phase 0 assumes drugs may be present; the audit proves otherwise | — | Audit reports 0 drug rows | DONE |
| 0.2 | `Python/sql/unified_inventory_phase0.sql` | n/a (new) | Idempotent backups of `Master_Item`, `Master_Category`, `Master_MedicineCategory` | §34 / §35 back up before modifying | — | Backup row counts equal source | DONE |
| 0.3 | `frontend/src/pages/admin/purchase-inventory/ItemMaster.tsx:31` | `export const mockData` holds 2 fake drug rows (Paracetamol, Amoxicillin) filed under a "Medicines" category | Delete the array — dead code (`records` initialises to `[]`, no importers) | §29 no mock production data; this array is the origin of the "drugs in Item Master" confusion | — | Frontend build passes; Item Master still lists the 10 live rows | DONE |
| 0.4 | `admin.Master_MedicineCategory` | Contains junk rows `Dooll`, `Dull` plus dosage forms used as categories | **Report only — do not delete** | §35 no data loss without explicit approval | — | Rows still present, listed in the audit report | DONE |

## Phase 1 — Category Master

| # | File / Object | Current logic | Required change | Why | Depends on | Test | Status |
|---|---|---|---|---|---|---|---|
| 1.1 | `admin.Master_Category.InventoryType` | Nullable; 5 NULL, 2 `'Medical'` | Backfill canonical values, then enforce NOT NULL | §4 one canonical representation | 0.2 | 0 rows NULL or non-canonical | DONE |
| 1.2 | Category backfill map | — | `Medical Consumables`→`MEDICAL_ITEM`, `Surgical Items`→`MEDICAL_ITEM`, `Lab Reagents`→`MEDICAL_ITEM`, `Equipment`→`MEDICAL_ITEM` \*, `Stationery`→`NON_MEDICAL`, `Medicines`→`MEDICINE`, `Vaccines`→`MEDICINE` | §33 classify from existing relationships, never randomly | 1.1 | All 7 rows carry the mapped value | DONE |
| 1.3 | `admin.Master_MedicineCategory` | Separate flat medicine-category list | Merge rows into `Master_Category` as `MEDICINE` (skip names already present); retain the old table until Phase 12 | §43 no duplicate Type/Category systems | 1.1 | Every medicine category resolvable from `Master_Category` | DONE |
| 1.4 | `SpMasterCategory` | Already accepts `p_InventoryType` | Validate the value is canonical; add `p_InventoryTypeFilter` to GET / SEARCH | §32 DB-level validation | 1.1 | Non-canonical value rejected with SQLSTATE 45000 | DONE |
| 1.5 | `Python/app/routers/category.py` | Passes `inventoryType` through | Add `?inventoryType=` filter | §10 backend enforces filtering | 1.4 | `GET /categories?inventoryType=MEDICINE` returns medicine categories only | DONE |
| 1.6 | `CategoryMaster.tsx` (the routed one) | No InventoryType field at all | Add field + column + filter | §6 type→category behaviour | 1.5 | Create / edit a category of each type | DONE |
| 1.7 | `ItemCategoryMaster.tsx` | Orphan file, never routed, already contains the InventoryType UI | Delete once 1.6 lands | §43 no duplicate component | 1.6 | No dangling import | DONE |
| 1.8 | `SubCategoryMaster.tsx` | Parent-category list unfiltered | Filter parent list by selected type | §6 | 1.5 | Sub-category under a MEDICINE parent offers medicine categories only | DONE |
| 1.9 | `MedicineCategoryMaster.tsx` | Reads `/medicines/categories` | Retire together with the Pharmacy menu group | §43 | 1.5 | Medicine categories identical in both screens | DONE |

\* `Equipment` (sole item: Digital Thermometer) provisionally classified `MEDICAL_ITEM`.
**Flagged for user confirmation** — editable in the Category master once 1.6 ships.

### Unplanned fix absorbed in Phase 1

| # | File / Object | Problem found | Action | Status |
|---|---|---|---|---|
| 1.X | `Python/app/routers/medicine.py` + live `SpMasterMedicine` | **Pre-existing breakage on this branch, unrelated to this project**: every `/medicines/*` call returned 500. The committed router passed `:p_Manufacturer` without binding it, and the deployed SP was stale (21-param repo version vs 23-param SP in the database, still expecting `p_BrandName` for a column the table no longer has). | Deployed the already-committed `sql/medicine_master.sql`, removed the stale `:p_Manufacturer` placeholder from the router, made the leftover `Manufacturer` column nullable (column retained — no data loss). GET/POST/PUT/DELETE verified. | DONE |

## Phase 2 — Item Master

| # | File / Object | Current logic | Required change | Why | Depends on | Test | Status |
|---|---|---|---|---|---|---|---|
| 2.1 | `admin.Master_Item` | No type column, no price column | Add `InventoryType` (derived from category), `StandardRate`, `LastPurchaseRate` | §9 real rates; §15 type ownership | 1.1 | Columns present and backfilled | DONE |
| 2.2 | `SpMasterItem` | No type validation | Reject saves whose category is `MEDICINE`; derive and store `InventoryType`; add type filter to GET / SEARCH | §15 invalid combination must fail | 2.1 | Saving an item under a MEDICINE category errors | DONE |
| 2.3 | `Python/app/routers/item.py` | No type filter | Add `?inventoryType=` | §10 | 2.2 | Filter returns only that type | DONE |
| 2.4 | `admin.Master_Medicine` | No sub-category | Add `SubCategory` | §5 parity with items | 1.3 | Field saves and reads | DONE |

## Phase 3 — Menu / Route Cleanup

| # | File / Object | Required change | Depends on | Test | Status |
|---|---|---|---|---|---|
| 3.1 | `layouts/Sidebar.tsx:33` | Remove the `Pharmacy` master group | 2.4 | Group gone | DONE |
| 3.2 | `layouts/Sidebar.tsx:59` | Purchase & Inventory: add `Medicine`, add `Medical Items`, rename `Item` → `Non-Medical Items` | 3.1 | All three open | DONE |
| 3.3 | `routes/index.tsx:656,671` | Route the medicine master under the new group; split the item route by type prop | 3.2 | Deep links work | DONE |
| 3.4 | `ItemMaster.tsx` | Accept an `inventoryType` prop; category dropdown filtered by it | 2.3 | Medical route never lists non-medical categories | DONE |
| 3.5 | `utils/moduleMap.ts:17` + `Sidebar.tsx` | Medicine KEEPS its `Pharmacy` permission module while moving menu group; sidebar gained per-child gating so a group shows when the role can view the group **or** any child. No role gains or loses access; no permission data migrated | 3.3 | **No user loses access** (§42) | DONE |

## Phase 4 — Catalog API

| # | File / Object | Required change | Depends on | Test | Status |
|---|---|---|---|---|---|
| 4.1 | `Python/app/routers/catalog.py` (new) | `GET /catalog?type=&category=&store=&search=` — union of both masters, normalised, real `availableStock` from `Inventory_Stock`, real rate | 2.3, 5.5 | Filtering enforced server-side | DONE |
| 4.2 | `Python/app/main.py` | Register the router | 4.1 | Route reachable | DONE |

## Phase 5 — Inventory Ledger (highest risk)

| # | Object | Required change | Test | Status |
|---|---|---|---|---|
| 5.1 | `inventory.Inventory_Stock` | Add `ItemType`; unique key → `(ItemType, ItemId, StoreId, BatchNo)`; drop `FK_Inventory_Stock_Item`, validate inside the SP | Existing 24 rows preserved, backfilled from their item's category | DONE |
| 5.2 | `inventory.Inventory_DocumentItem` | Add `ItemType` | Existing document lines backfilled | DONE |
| 5.3 | `inventory.Inventory_StockLedger` | Add `ItemType` | Existing 40 ledger rows backfilled; balances unchanged | DONE |
| 5.4 | `SpInvStockPost` / `SpInvDocument` (actual names) | Carry `ItemType` end to end; validate `ItemType + ItemId` against the owning master; keep the negative-stock guard | RECEIPT / ISSUE / TRANSFER / RETURN / ADJUSTMENT all still post | DONE |
| 5.5 | `SpInvStock` (actual name) + new `inventory.Vw_CatalogItem` | Return `ItemType`; resolve name and UoM from the correct master | Current Stock renders both medicines and items | DONE |

## Phase 6 — Pharmacy Migration

| # | Object | Required change | Test | Status |
|---|---|---|---|---|
| 6.1 | `hospital.Pharmacy_Stock` | Copy to `Pharmacy_Stock_Backup_UIM` before anything else | Backup row count = 6 | TODO |
| 6.2 | Opening balances | Post the 6 rows into `Inventory_Stock` at `Pharmacy Store` (StoreId 4) as an **ADJUSTMENT document through `SpInventoryMovement`** — never a raw INSERT | Ledger shows 6 opening lines; stock value matches | TODO |
| 6.3 | Batch handling | `BatchNo = 'OPENING'` where the source batch is NULL (Amoxicillin); keep real batch numbers where present | No invented expiry dates | TODO |
| 6.4 | `Pharmacy_Stock` | Stop reading it as source of truth; drop only after one release | POS unaffected | TODO |

## Phase 12 — Clinical compatibility

| # | Change | Status |
|---|---|---|
| 12.1 | `Trn_OpdVisitPrescription.MedicineId` added (nullable); backfill only where a name resolves to exactly one active medicine — ambiguous names left NULL | DONE |
| 12.2 | OPD SP writes and returns `medicineId`; the line's **price is resolved by id**, falling back to the old name match only for legacy rows | DONE |
| 12.3 | `PrescriptionSchema` / `PrescriptionItem` carry `medicineId` | DONE |
| 12.4 | Doctor's consultation persists the selected medicine's id alongside the name snapshot | DONE |
| 12.5 | **Live counter-stock badge** on the prescription field (red out / amber low / green in stock), read from the same unified ledger the pharmacy sells from | DONE |
| 12.6 | **Raise PR** button when a medicine is out of stock — opens a pharmacy PR pre-filled with the drug, its category and its reorder quantity. Nothing is submitted; the buyer completes it | DONE |
| 12.7 | POS bill lines carry `itemType`, so a priced medical item sells from the right master and lots | DONE |
| 12.8 | `brandName` breakage across MAR / discharge / print templates | DONE (earlier) |

## Phase 12 (original placeholder) (partial) — Prescribing screens

| # | File | Change | Status |
|---|---|---|---|
| 12.1 | `components/ui/MedicineSearch.tsx` (new) | Shared searchable medicine picker: type-ahead over generic name, strength, dosage form, category and code; keyboard navigation; controlled-drug badge; one cached fetch of the Medicine master shared by all prescribing screens. Medical Items are deliberately never offered. | DONE |
| 12.2 | `pages/opd/DoctorConsultation.tsx` | OPD prescription entry uses the picker; tracks `medicineId`; Type box follows the selected medicine's dosage form and clears a pick that no longer fits | DONE |
| 12.3 | `components/ipd/MarGrid.tsx` | IPD MAR uses the picker. **Fixed:** the dropdown rendered blank labels because it read `brandName`, a column the medicine master no longer has | DONE |
| 12.4 | `components/discharge/DischargePrescription.tsx` | Discharge medicines use the picker; same `brandName` fix in the saved name snapshot | DONE |
| 12.5 | `Trn_OpdVisitPrescription.MedicineId` | Persist the selected id, not just the name text | TODO |

## Phase 7 — Type through procurement (PR done; PO/RFQ/GRN columns in place)

| # | Object | Change | Status |
|---|---|---|---|
| 7.1 | `PurchaseRequisition.InventoryType`, `PurchaseRequisitionItem/PurchaseOrderItem/GoodsReceiptItem.ItemType` | Columns added, historical rows backfilled from the item each line already referenced (11 PRs, 11 PR lines, 5 PO lines, 5 GRN lines — none lost) | DONE |
| 7.2 | `SpManagePurchaseRequisition` | Header type persisted; each line inherits it unless it carries its own | DONE |
| 7.3 | `schemas/purchase_requisition.py` | API rejects a mixed-type requisition with a readable message | DONE |
| 7.4 | PO / RFQ / Quotation / GRN SPs | Thread `itemType` through their JSON payloads | DONE |

## Phase 8 — PR screen

| # | Change | Status |
|---|---|---|
| 8.1 | Header **Inventory Type** selector, locked once lines exist | DONE |
| 8.2 | Per-line **Category** column, filtered to the PR's type via `/catalog/categories` | DONE |
| 8.3 | Item dropdown filtered by type + category via `/catalog` | DONE |
| 8.4 | Real availability from the stock ledger — `Math.random()` removed | DONE |
| 8.5 | Real rate from last purchase — hardcoded ₹100 removed | DONE |
| 8.6 | Store defaults by type (Pharmacy Store for medicines), resolved from the store master | DONE |
| 8.7 | List: Type column + Type filter | DONE |

## Phase 6 — Pharmacy migration

| # | Object | Change | Status |
|---|---|---|---|
| 6.1 | `hospital.Pharmacy_Stock_Backup_UIM` | Backup taken and verified (6 = 6) before anything | DONE |
| 6.2 | Opening balances | All 6 lots posted into `Inventory_Stock` at Pharmacy Store as ONE opening-balance ADJUSTMENT document (`ADJ-20260003`) through `SpInvDocument` → `SpInvStockPost`, never a raw INSERT. Every quantity has a ledger row | DONE |
| 6.3 | Batch handling | Real batch numbers preserved (`B-PH-001` …); the one lot with no batch (Amoxicillin) arrived as `OPENING`. No expiry date invented | DONE |
| 6.4 | `Pharmacy_Stock` | Retained, not dropped. **POS still reads AND writes it until Phase 11** — see the divergence warning | DONE |

## Phase 9 — Remaining procurement screens

| # | Change | Status |
|---|---|---|
| 9.1 | `ItemType` on RFQ / Quotation / Return line tables + backfill (6, 9, 1 rows) | DONE |
| 9.2 | `itemType` threaded through all five document SPs (PO, GRN, RFQ, Quotation, Return), both CREATE and UPDATE | DONE |
| 9.3 | Line schemas + read projections return `itemType` | DONE |
| 9.4 | Frontend carries `itemType` across every hop PR → RFQ → Quotation → PO → GRN | DONE |
| 9.5 | GRN: batch + expiry **mandatory for medicines**; fabricated `BAT-######` generator removed | DONE |
| 9.6 | Purchase Return sources `/catalog` instead of `/items` | DONE |
| 9.7 | Type badges on PO and GRN line grids | DONE |
| 9.8 | Vendors Catalog: Type filter narrowing the category list | DONE |
| 9.9 | Approvals routing by type | **NOT REQUIRED** — user confirmed no pharmacist sign-off. The queue now *shows* and filters by type; nobody's approval rights changed | DONE |

## Phase 10 — Inventory screens

| # | Change | Status |
|---|---|---|
| 10.1 | Every inventory endpoint returns `itemType` (items, stock, low, expiring, valuation, ledger, issuable lots, document lines) | DONE |
| 10.2 | `InventoryContext` row types carry `itemType`; existing fields untouched | DONE |
| 10.3 | **Current Stock**: Type + Category filters (category list follows the type) and a Type column | DONE |
| 10.4 | **Stock Out**: `Issue To: Department \| Store` toggle. Department → ISSUE (consumption); Store → TRANSFER, both legs at cost. One screen, correct accounting | DONE |
| 10.5 | **Low Stock**: Type filter, type badge, and **Generate PR raises one PR per type** — required now that a PR is single-type; medicines route to the Pharmacy Store | DONE |
| 10.6 | **Batch & Expiry**: Type filter — now the drug-expiry screen too | DONE |
| 10.7 | **Stock Ledger** and **Category Ledger**: Type filter | DONE |
| 10.8 | **Department Consumption**: split by type (a ward's drug use vs consumable use) | DONE |

## Phase 11 — Pharmacy POS on the unified ledger

| # | Change | Status |
|---|---|---|
| 11.1 | `Pharmacy_SaleItem` gains `ItemType` + `BatchNo`; `Master_Item` gains `SellingPrice` (counter price for medical items) | DONE |
| 11.2 | `SpPharmacyStock` LIST / GETBYID / LOWSTOCK / EXPIRY all project `Inventory_Stock` at the Pharmacy Store, keeping their original column names so POS, dashboard and reports work unchanged | DONE |
| 11.3 | Sale posts an **ISSUE document** through `SpInvDocument` → `SpInvStockPost` in the same transaction as the bill. The private stock guard and the direct `UPDATE Pharmacy_Stock` are gone — one implementation, not two | DONE |
| 11.4 | **FEFO** allocation server-side: a quantity is filled nearest-expiry-first across batches, expired lots excluded. Verified 14 units split 10 (Oct-2026) + 4 (Dec-2027) | DONE |
| 11.5 | Bill records one line per batch consumed | DONE |
| 11.6 | Refund returns stock to the **exact batches** on the sale lines; a pre-batch-tracking bill is refused with an explanation rather than landing on the wrong lot | DONE |
| 11.7 | Negative stock refused by the inventory SP (409 naming requested vs available) | DONE |
| 11.8 | Manual counter correction posts a real ADJUSTMENT document instead of editing a quantity in place — the last write path to the old table | DONE |
| 11.9 | `hospital.Pharmacy_Stock` marked DEPRECATED in schema comments; nothing reads or writes it. Retained one release with `Pharmacy_Stock_Backup_UIM` | DONE |
| 11.10 | Item Master exposes **Standard Rate** and **Counter Selling Price**; `SpMasterItem` persists both. A priced medical item appears in the POS list, an unpriced one does not | DONE |

## Phase 12

Expanded into this same format as each predecessor lands:
type propagation PR → RFQ → Quotation → PO → GRN → Return (7),
PR screen header-type + line-category + real stock/rate (8),
remaining procurement screens (9), inventory screens (10),
POS on `Inventory_Stock` with FEFO and batch-level returns (11),
clinical compatibility — `brandName`, stock badge, Raise PR, `MedicineId` on OP prescriptions (12).

---

## Regression suite — re-run after every phase (§42, §47)

Login · Permissions · Tenant isolation · Patient registration · Doctor consultation ·
OP / IP billing · Pharmacy POS sale · Existing PR → PO → GRN · Existing inventory movements · Reports.
