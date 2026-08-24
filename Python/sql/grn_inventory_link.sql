-- ==============================================================================
-- Goods Receipt  ->  Inventory stock
-- ==============================================================================
-- Receiving goods against a purchase order did not move stock. SpManageGoodsReceipt
-- wrote GoodsReceipt / GoodsReceiptItem and stopped there: it never called
-- SpInvStockPost and never created an Inventory_Document. The two halves of the
-- system were populated independently — procurement had its GRNs, inventory had
-- RECEIPT documents someone had keyed by hand — so a PO could be fully received
-- while stock still read zero, and the PO -> receipt -> stock trail was broken.
--
-- This adds the missing link:
--   * GoodsReceipt.InventoryDocId records which Inventory_Document a GRN posted,
--     which is both the audit trail and the guard against posting twice.
--   * SpGrnPostToStock posts an accepted GRN through the SAME single path every
--     other movement uses (SpInvDocument 'CREATE' with DocType 'RECEIPT'), so
--     moving-average valuation and the stock ledger behave identically to a
--     manually keyed Stock In.
--
-- Safe to re-run.

-- ── 1. Link column ────────────────────────────────────────────
DROP PROCEDURE IF EXISTS SpTmpAddGrnInventoryLink;
DELIMITER $$
CREATE PROCEDURE SpTmpAddGrnInventoryLink()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = 'inventory' AND TABLE_NAME = 'GoodsReceipt'
                     AND COLUMN_NAME = 'InventoryDocId') THEN
        ALTER TABLE inventory.GoodsReceipt
            ADD COLUMN InventoryDocId INT NULL COMMENT 'Inventory_Document raised when this GRN posted to stock';
    END IF;
END$$
DELIMITER ;
CALL SpTmpAddGrnInventoryLink();
DROP PROCEDURE IF EXISTS SpTmpAddGrnInventoryLink;


-- ── 2. Posting procedure ──────────────────────────────────────
DROP PROCEDURE IF EXISTS inventory.SpGrnPostToStock;
DELIMITER $$
CREATE PROCEDURE inventory.SpGrnPostToStock(
    IN p_GrnId INT,
    IN p_User  VARCHAR(100)
)
BEGIN
    DECLARE v_docId      INT DEFAULT NULL;
    DECLARE v_existing   INT DEFAULT NULL;
    DECLARE v_storeId    INT DEFAULT NULL;
    DECLARE v_storeName  VARCHAR(255);
    DECLARE v_grnNo      VARCHAR(50);
    DECLARE v_vendor     VARCHAR(255);
    DECLARE v_status     VARCHAR(50);
    DECLARE v_items      LONGTEXT;
    DECLARE v_lineCount  INT DEFAULT 0;

    SELECT InventoryDocId, Store, GrnNo, VendorName, Status
      INTO v_existing, v_storeName, v_grnNo, v_vendor, v_status
    FROM inventory.GoodsReceipt
    WHERE GrnId = p_GrnId;

    -- Already posted: hand back the document it created and do nothing else.
    -- This is what makes the call safe to repeat on every GRN save.
    IF v_existing IS NOT NULL THEN
        SELECT v_existing AS DocId, 'ALREADY_POSTED' AS Result;

    -- Only an accepted GRN moves stock. A draft or rejected receipt must not.
    ELSEIF COALESCE(v_status, '') <> 'Accepted' THEN
        SELECT NULL AS DocId, 'NOT_ACCEPTED' AS Result;

    ELSE
        -- The GRN stores a store NAME; inventory works in StoreIds.
        SELECT StoreId INTO v_storeId
        FROM admin.Master_Store
        WHERE StoreName = v_storeName COLLATE utf8mb4_general_ci
          AND COALESCE(IsDeleted, 0) = 0
        LIMIT 1;

        IF v_storeId IS NULL THEN
            -- Refuse rather than post into a guessed store: silently landing
            -- stock in the wrong place is worse than not posting.
            SELECT NULL AS DocId, 'UNKNOWN_STORE' AS Result;
        ELSE
            -- Accepted quantity only — rejected goods never enter stock.
            SELECT COUNT(*) INTO v_lineCount
            FROM inventory.GoodsReceiptItem
            WHERE GrnId = p_GrnId AND COALESCE(AcceptedQty, 0) > 0;

            IF v_lineCount = 0 THEN
                SELECT NULL AS DocId, 'NO_ACCEPTED_LINES' AS Result;
            ELSE
                SELECT JSON_ARRAYAGG(JSON_OBJECT(
                           'itemId',     ItemId,
                           'itemType',   COALESCE(NULLIF(TRIM(ItemType), ''), 'MEDICAL_ITEM'),
                           'batchNo',    COALESCE(NULLIF(TRIM(BatchNumber), ''), '-'),
                           'mfgDate',    ManufactureDate,
                           'expiryDate', ExpiryDate,
                           'quantity',   AcceptedQty,
                           'rate',       COALESCE(Rate, 0),
                           'remarks',    CONCAT('GRN ', v_grnNo)
                       ))
                  INTO v_items
                FROM inventory.GoodsReceiptItem
                WHERE GrnId = p_GrnId AND COALESCE(AcceptedQty, 0) > 0;

                -- Same entry point every other stock movement uses, so the
                -- moving-average rate and the ledger row come out identical to
                -- a hand-keyed Stock In.
                CALL inventory.SpInvDocument(
                    'CREATE', NULL, 'RECEIPT',
                    NULL,            -- fromStore (none: goods arrive from a vendor)
                    v_storeId,       -- toStore
                    NULL,            -- department
                    v_vendor,
                    v_grnNo,         -- referenceNo: ties the document back to the GRN
                    p_User, p_User,
                    'Goods Receipt',
                    CONCAT('Auto-posted from ', v_grnNo),
                    v_items, NULL, NULL, p_User
                );

                -- SpInvDocument returns its id as a result set, which a calling
                -- procedure cannot read; ReferenceNo is unique per GRN, so the
                -- document is recovered by that instead.
                SELECT MAX(DocId) INTO v_docId
                FROM inventory.Inventory_Document
                WHERE DocType = 'RECEIPT'
                  AND ReferenceNo = v_grnNo COLLATE utf8mb4_general_ci;

                UPDATE inventory.GoodsReceipt
                SET InventoryDocId = v_docId
                WHERE GrnId = p_GrnId;

                SELECT v_docId AS DocId, 'POSTED' AS Result;
            END IF;
        END IF;
    END IF;
END$$
DELIMITER ;


-- ── 3. Purchase Order fulfilment ──────────────────────────────
-- A PO was never told it had been received. Every PO in the system read
-- 'Approved' while its GRN sat Accepted and its goods were on the shelf, so
-- procurement could not distinguish an outstanding order from a finished one
-- and a short delivery raised nothing.
--
-- Status vocabulary matches what PurchaseOrders.tsx already renders:
--   Draft | Approved | Sent | Partially Received | Closed
DROP PROCEDURE IF EXISTS inventory.SpPoRefreshFulfilment;
DELIMITER $$
CREATE PROCEDURE inventory.SpPoRefreshFulfilment(
    IN p_PoNumber VARCHAR(50)
)
BEGIN
    DECLARE v_lines     INT DEFAULT 0;
    DECLARE v_complete  INT DEFAULT 0;
    DECLARE v_anyRecv   DECIMAL(18,3) DEFAULT 0;
    DECLARE v_status    VARCHAR(50);

    SELECT Status INTO v_status
    FROM inventory.PurchaseOrder
    WHERE PoNumber = p_PoNumber COLLATE utf8mb4_general_ci
    LIMIT 1;

    -- A cancelled or already-closed PO is left alone; receiving against it is a
    -- data problem to look at, not something to silently reopen or re-close.
    IF v_status IS NOT NULL AND v_status NOT IN ('Cancelled', 'Closed') THEN

        -- Ordered vs accepted, line by line. Accepted (not received) is the
        -- measure: rejected goods were never taken into stock.
        SELECT COUNT(*),
               SUM(CASE WHEN recv.Qty >= poi.OrderedQty THEN 1 ELSE 0 END),
               COALESCE(SUM(recv.Qty), 0)
          INTO v_lines, v_complete, v_anyRecv
        FROM inventory.PurchaseOrderItem poi
        JOIN inventory.PurchaseOrder po ON po.PoId = poi.PoId
        LEFT JOIN (
            SELECT g.PoNumber, gi.ItemId,
                   COALESCE(NULLIF(TRIM(gi.ItemType), ''), 'MEDICAL_ITEM') AS ItemType,
                   SUM(COALESCE(gi.AcceptedQty, 0)) AS Qty
            FROM inventory.GoodsReceipt g
            JOIN inventory.GoodsReceiptItem gi ON gi.GrnId = g.GrnId
            WHERE g.Status = 'Accepted'
            GROUP BY g.PoNumber, gi.ItemId, ItemType
        ) recv
               ON recv.PoNumber = po.PoNumber COLLATE utf8mb4_general_ci
              AND recv.ItemId   = poi.ItemId
              AND recv.ItemType = COALESCE(NULLIF(TRIM(poi.ItemType), ''), 'MEDICAL_ITEM')
        WHERE po.PoNumber = p_PoNumber COLLATE utf8mb4_general_ci;

        IF v_lines > 0 AND v_complete = v_lines THEN
            UPDATE inventory.PurchaseOrder
            SET Status = 'Closed', ModifiedDate = NOW()
            WHERE PoNumber = p_PoNumber COLLATE utf8mb4_general_ci;

        ELSEIF v_anyRecv > 0 THEN
            UPDATE inventory.PurchaseOrder
            SET Status = 'Partially Received', ModifiedDate = NOW()
            WHERE PoNumber = p_PoNumber COLLATE utf8mb4_general_ci;
        END IF;
    END IF;

    SELECT p_PoNumber AS PoNumber,
           (SELECT Status FROM inventory.PurchaseOrder
            WHERE PoNumber = p_PoNumber COLLATE utf8mb4_general_ci LIMIT 1) AS Status,
           v_lines AS TotalLines, v_complete AS CompleteLines;
END$$
DELIMITER ;
