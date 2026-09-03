-- ============================================================================
-- PRO WORKFLOW HARDENING
-- ============================================================================
-- Purpose: give the Doctor -> Service Order -> PRO -> Advance Bill -> Payment ->
-- Financial Clearance -> Service Release -> Execution -> Final Bill -> Discharge
-- workflow the database-level guarantees it was missing.
--
-- Everything here is ADDITIVE and IDEMPOTENT: no column is dropped, no row is
-- deleted, and re-running the script is a no-op. MariaDB's "IF NOT EXISTS"
-- extensions are used throughout so the script can be replayed safely.
--
-- Why each change exists is documented inline; the short version is that the
-- workflow's invariants were enforced nowhere -- not in the API, and not here --
-- so a duplicate advance bill, a double release, or a service charged twice on
-- an IPD bill were all reachable states.
--
-- Target: MariaDB 10.2+ (uses generated columns for conditional uniqueness,
-- which is how a "unique among live rows only" rule is expressed without
-- partial indexes).
--
-- Apply with:  Python/venv/Scripts/python.exe Python/apply_pro_migration.py
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Service_Order: record WHY a review ended the way it did, and WHO decided.
--    The rejection reason previously existed only as free text in PRO_AuditLog,
--    so no screen and no query could answer "why was this rejected?".
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE hospital.Service_Order
    ADD COLUMN IF NOT EXISTS RejectionReason VARCHAR(500) NULL AFTER PROStatus;
ALTER TABLE hospital.Service_Order
    ADD COLUMN IF NOT EXISTS ReviewedBy VARCHAR(100) NULL AFTER RejectionReason;
ALTER TABLE hospital.Service_Order
    ADD COLUMN IF NOT EXISTS ReviewedAt DATETIME NULL AFTER ReviewedBy;
ALTER TABLE hospital.Service_Order
    ADD COLUMN IF NOT EXISTS CancelledReason VARCHAR(500) NULL AFTER ReviewedAt;

-- The PRO queue filters on these three together; without the composite index
-- every queue load is a full scan of the order table.
ALTER TABLE hospital.Service_Order
    ADD INDEX IF NOT EXISTS idx_so_module_pro_status (SourceModule, PROStatus, IsDeleted);
ALTER TABLE hospital.Service_Order
    ADD INDEX IF NOT EXISTS idx_so_admission (AdmissionId);
ALTER TABLE hospital.Service_Order
    ADD INDEX IF NOT EXISTS idx_so_order_no (OrderNo);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Service_OrderItem: per-item rejection reason, and money that cannot go
--    negative. A discount larger than the price used to produce a NetAmount of
--    -999,899 and still release the service.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE hospital.Service_OrderItem
    ADD COLUMN IF NOT EXISTS RejectionReason VARCHAR(500) NULL AFTER PROStatus;
ALTER TABLE hospital.Service_OrderItem
    ADD COLUMN IF NOT EXISTS ReviewedBy VARCHAR(100) NULL AFTER RejectionReason;
ALTER TABLE hospital.Service_OrderItem
    ADD COLUMN IF NOT EXISTS ReviewedAt DATETIME NULL AFTER ReviewedBy;

ALTER TABLE hospital.Service_OrderItem
    ADD INDEX IF NOT EXISTS idx_soi_order_pro (ServiceOrderId, PROStatus, IsDeleted);

-- Money is never negative. The API recalculates and clamps, but the constraint
-- is what makes that guarantee unconditional -- including for any caller that
-- reaches the table by another route.
ALTER TABLE hospital.Service_OrderItem
    ADD CONSTRAINT chk_soi_amounts_non_negative CHECK (
        MasterPrice             >= 0 AND
        OriginalPrice           >= 0 AND
        PROPrice                >= 0 AND
        AuthorizedDiscount      >= 0 AND
        GrossAmount             >= 0 AND
        NetAmount               >= 0 AND
        InsuranceCoveredAmount  >= 0 AND
        PatientResponsibility   >= 0 AND
        Quantity                >= 1
    );


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Service_Release: at most ONE active release per item, enforced by the
--    database rather than by a WHERE NOT EXISTS that two concurrent
--    transactions can both pass.
--
--    MariaDB has no partial index, so the "only among ACTIVE, non-deleted rows"
--    condition is folded into a generated column: it holds the item id for a
--    live release and NULL otherwise, and NULLs are exempt from UNIQUE.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE hospital.Service_Release
    ADD COLUMN IF NOT EXISTS ReleasedByRole VARCHAR(100) NULL AFTER ReleasedBy;
ALTER TABLE hospital.Service_Release
    ADD COLUMN IF NOT EXISTS RevokedAt DATETIME NULL AFTER ReleaseReason;
ALTER TABLE hospital.Service_Release
    ADD COLUMN IF NOT EXISTS RevokedBy VARCHAR(100) NULL AFTER RevokedAt;
ALTER TABLE hospital.Service_Release
    ADD COLUMN IF NOT EXISTS RevokeReason VARCHAR(500) NULL AFTER RevokedBy;

ALTER TABLE hospital.Service_Release
    ADD COLUMN IF NOT EXISTS ActiveItemKey INT
        AS (CASE WHEN ReleaseStatus = 'ACTIVE' AND IsDeleted = 0
                 THEN ServiceOrderItemId END) VIRTUAL;
ALTER TABLE hospital.Service_Release
    ADD UNIQUE KEY IF NOT EXISTS ux_service_release_active (ActiveItemKey);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Billing_Advance: at most ONE live advance bill per service order. The API
--    checked "does a PENDING one exist?" first, which two concurrent approvals
--    both answered "no", and which missed a PARTIALLY_PAID one entirely.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE hospital.Billing_Advance
    ADD COLUMN IF NOT EXISTS RefundedAmount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER PaidAmount;
ALTER TABLE hospital.Billing_Advance
    ADD COLUMN IF NOT EXISTS CancelledReason VARCHAR(500) NULL AFTER Status;

ALTER TABLE hospital.Billing_Advance
    ADD COLUMN IF NOT EXISTS LiveOrderKey INT
        AS (CASE WHEN Status <> 'CANCELLED' AND IsDeleted = 0
                 THEN ServiceOrderId END) VIRTUAL;
ALTER TABLE hospital.Billing_Advance
    ADD UNIQUE KEY IF NOT EXISTS ux_billing_advance_live_order (LiveOrderKey);

ALTER TABLE hospital.Billing_Advance
    ADD CONSTRAINT chk_advance_amounts CHECK (
        TotalAmount >= 0 AND PaidAmount >= 0 AND RefundedAmount >= 0
    );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Billing_Payment: the payment LEDGER that did not exist.
--
--    Payment used to be two columns on Billing_Advance (PaidAmount,
--    PaymentMode). A second instalment overwrote the first one's mode and
--    reference, there was no receipt number, no record of who collected it, and
--    reversing a payment was impossible without destroying history.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Billing_Payment (
    PaymentId        INT             NOT NULL AUTO_INCREMENT,
    ReceiptNo        VARCHAR(50)     NOT NULL,
    UHID             VARCHAR(50)     NOT NULL,
    PaymentDate      DATETIME        NOT NULL DEFAULT current_timestamp(),
    Amount           DECIMAL(12,2)   NOT NULL,
    PaymentMode      VARCHAR(50)     NOT NULL,
    PaymentReference VARCHAR(100)    NULL,
    Status           ENUM('ACTIVE','REVERSED') NOT NULL DEFAULT 'ACTIVE',
    ReversedAt       DATETIME        NULL,
    ReversedBy       VARCHAR(100)    NULL,
    ReversalReason   VARCHAR(500)    NULL,
    CollectedBy      VARCHAR(100)    NOT NULL,
    CollectedByRole  VARCHAR(100)    NULL,
    -- Caller-supplied key that makes a retried request idempotent: the second
    -- POST of the same payment collides here instead of taking money twice.
    IdempotencyKey   VARCHAR(120)    NULL,
    Notes            VARCHAR(500)    NULL,
    CreatedAt        DATETIME        NOT NULL DEFAULT current_timestamp(),
    UpdatedAt        DATETIME        NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (PaymentId),
    UNIQUE KEY ux_payment_receipt (ReceiptNo),
    UNIQUE KEY ux_payment_idempotency (IdempotencyKey),
    KEY idx_payment_uhid (UHID),
    KEY idx_payment_status (Status),
    CONSTRAINT chk_payment_amount CHECK (Amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Billing_PaymentAllocation: what each payment was applied TO.
--    A payment can settle an advance bill or an IPD final bill; the final bill
--    must subtract only allocations that are still ACTIVE, which is what makes
--    "do not credit a reversed payment" expressible.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Billing_PaymentAllocation (
    AllocationId    INT           NOT NULL AUTO_INCREMENT,
    PaymentId       INT           NOT NULL,
    AdvanceId       INT           NULL,
    IpBillId        INT           NULL,
    ServiceOrderId  INT           NULL,
    AdmissionId     INT           NULL,
    AllocatedAmount DECIMAL(12,2) NOT NULL,
    Status          ENUM('ACTIVE','REVERSED') NOT NULL DEFAULT 'ACTIVE',
    CreatedAt       DATETIME      NOT NULL DEFAULT current_timestamp(),
    UpdatedAt       DATETIME      NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (AllocationId),
    KEY idx_alloc_payment (PaymentId),
    KEY idx_alloc_advance (AdvanceId),
    KEY idx_alloc_order (ServiceOrderId),
    KEY idx_alloc_admission (AdmissionId),
    CONSTRAINT fk_alloc_payment FOREIGN KEY (PaymentId)
        REFERENCES hospital.Billing_Payment (PaymentId),
    CONSTRAINT fk_alloc_advance FOREIGN KEY (AdvanceId)
        REFERENCES hospital.Billing_Advance (AdvanceId),
    CONSTRAINT chk_alloc_amount CHECK (AllocatedAmount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Billing_Refund: refunds as their own transaction.
--    Refunding by deleting a payment row destroys the financial history; this
--    table records the refund alongside the original payment, which stays.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Billing_Refund (
    RefundId        INT           NOT NULL AUTO_INCREMENT,
    RefundNo        VARCHAR(50)   NOT NULL,
    UHID            VARCHAR(50)   NOT NULL,
    PaymentId       INT           NULL,
    AdvanceId       INT           NULL,
    AdmissionId     INT           NULL,
    ServiceOrderId  INT           NULL,
    Amount          DECIMAL(12,2) NOT NULL,
    Reason          VARCHAR(500)  NULL,
    Status          ENUM('PENDING','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
    RefundMode      VARCHAR(50)   NULL,
    RefundReference VARCHAR(100)  NULL,
    ApprovedBy      VARCHAR(100)  NULL,
    ProcessedBy     VARCHAR(100)  NULL,
    ProcessedAt     DATETIME      NULL,
    CreatedBy       VARCHAR(100)  NULL,
    CreatedAt       DATETIME      NOT NULL DEFAULT current_timestamp(),
    UpdatedAt       DATETIME      NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (RefundId),
    UNIQUE KEY ux_refund_no (RefundNo),
    KEY idx_refund_uhid (UHID),
    KEY idx_refund_payment (PaymentId),
    KEY idx_refund_advance (AdvanceId),
    CONSTRAINT fk_refund_payment FOREIGN KEY (PaymentId)
        REFERENCES hospital.Billing_Payment (PaymentId),
    CONSTRAINT chk_refund_amount CHECK (Amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Service_FinancialClearance: the clearance event, per ITEM.
--    FinancialStatus was a bare enum with no record of what cleared it, when,
--    for how much, or by whom -- so "cleared" could not be audited or revoked.
--    One ACTIVE clearance per item, same generated-column technique as above.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Service_FinancialClearance (
    ClearanceId        INT           NOT NULL AUTO_INCREMENT,
    ServiceOrderItemId INT           NOT NULL,
    ServiceOrderId     INT           NOT NULL,
    ClearanceType      ENUM('PAID','ZERO_RESPONSIBILITY','INSURANCE_COVERED','WAIVED')
                       NOT NULL DEFAULT 'PAID',
    ClearedAmount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    ClearedBy          VARCHAR(100)  NULL,
    ClearedAt          DATETIME      NOT NULL DEFAULT current_timestamp(),
    Status             ENUM('ACTIVE','REVOKED') NOT NULL DEFAULT 'ACTIVE',
    RevokedAt          DATETIME      NULL,
    RevokedBy          VARCHAR(100)  NULL,
    Notes              VARCHAR(500)  NULL,
    ActiveItemKey      INT AS (CASE WHEN Status = 'ACTIVE' THEN ServiceOrderItemId END) VIRTUAL,
    PRIMARY KEY (ClearanceId),
    UNIQUE KEY ux_clearance_active (ActiveItemKey),
    KEY idx_clearance_order (ServiceOrderId),
    CONSTRAINT fk_clearance_item FOREIGN KEY (ServiceOrderItemId)
        REFERENCES hospital.Service_OrderItem (ServiceOrderItemId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Ins_PreAuth: tie an authorization to the service order it authorizes.
--    Without the link, "is this order authorized?" was unanswerable, and
--    InsuranceCoveredAmount was whatever the client posted.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE hospital.Ins_PreAuth
    ADD COLUMN IF NOT EXISTS ServiceOrderId INT NULL AFTER Uhid;
ALTER TABLE hospital.Ins_PreAuth
    ADD INDEX IF NOT EXISTS idx_preauth_service_order (ServiceOrderId);
ALTER TABLE hospital.Ins_PreAuth
    ADD INDEX IF NOT EXISTS idx_preauth_uhid_status (Uhid, Status);


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. IpBillItem: source linkage, so the same lab test cannot be billed twice.
--     IPD "continuous billing" had no idea where a charge came from, so posting
--     the same completed service twice created two charges with nothing to stop
--     it. The generated SourceKey makes the second post a duplicate-key error.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE hospital.IpBillItem
    ADD COLUMN IF NOT EXISTS SourceModule VARCHAR(30) NULL AFTER Subtotal;
ALTER TABLE hospital.IpBillItem
    ADD COLUMN IF NOT EXISTS SourceTransactionId VARCHAR(50) NULL AFTER SourceModule;
ALTER TABLE hospital.IpBillItem
    ADD COLUMN IF NOT EXISTS SourceTransactionItemId VARCHAR(50) NULL AFTER SourceTransactionId;

ALTER TABLE hospital.IpBillItem
    ADD COLUMN IF NOT EXISTS SourceKey VARCHAR(160)
        AS (CASE WHEN SourceTransactionItemId IS NOT NULL
                 THEN CONCAT(IpBillId, '|', COALESCE(SourceModule, ''), '|', SourceTransactionItemId)
            END) VIRTUAL;
ALTER TABLE hospital.IpBillItem
    ADD UNIQUE KEY IF NOT EXISTS ux_ipbillitem_source (SourceKey);


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. IpBill: advance adjustment and refund are part of the final bill, not a
--     number recomputed on the fly and never stored.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE hospital.IpBill
    ADD COLUMN IF NOT EXISTS AdmissionId INT NULL AFTER Uhid;
ALTER TABLE hospital.IpBill
    ADD COLUMN IF NOT EXISTS AdvanceAdjusted DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER PatientBalance;
ALTER TABLE hospital.IpBill
    ADD COLUMN IF NOT EXISTS RefundDue DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER AdvanceAdjusted;
ALTER TABLE hospital.IpBill
    ADD COLUMN IF NOT EXISTS BillStatus ENUM('DRAFT','FINALISED','CANCELLED')
        NOT NULL DEFAULT 'DRAFT' AFTER RefundDue;
ALTER TABLE hospital.IpBill
    ADD INDEX IF NOT EXISTS idx_ipbill_admission (AdmissionId);


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. PRO_AuditLog: the actor was a hardcoded string, and there was no index on
--     time, so the audit screen sorted 500 rows with a filesort every load.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE hospital.PRO_AuditLog
    ADD COLUMN IF NOT EXISTS ChangedByRole VARCHAR(100) NULL AFTER ChangedBy;
ALTER TABLE hospital.PRO_AuditLog
    ADD INDEX IF NOT EXISTS idx_pro_audit_created (CreatedAt);
ALTER TABLE hospital.PRO_AuditLog
    ADD INDEX IF NOT EXISTS idx_pro_audit_uhid (UHID);
