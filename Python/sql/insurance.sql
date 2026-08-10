-- ============================================================
-- Insurance (Eligibility / Pre-Auth / Claims / Appeals / Settlements)
-- Database : hospital  (operational data, alongside IPD, Pharmacy, Lab)
-- Tables   : hospital.Ins_Policy, Ins_PreAuth, Ins_Claim, Ins_Appeal, Ins_Settlement
-- SPs      : hospital.SpInsClaimSettle, SpInsClaimDeny (helpers)
--            hospital.SpInsPolicy, SpInsPreAuth, SpInsClaim, SpInsAppeal, SpInsSettlement
-- Screens  : /insurance/* (Dashboard, Eligibility, Pre-Auth, Claims, Appeals, Settlements)
--
-- Relationships (FK):
--   Ins_Policy.ProviderId     -> admin.Master_InsuranceProvider.InsuranceProviderId
--   Ins_Policy.TpaId          -> admin.Master_Tpa.TpaId
--   Ins_PreAuth.ProviderId    -> admin.Master_InsuranceProvider.InsuranceProviderId
--   Ins_Claim.ProviderId      -> admin.Master_InsuranceProvider.InsuranceProviderId
--   Ins_Claim.PreAuthId       -> hospital.Ins_PreAuth.PreAuthId
--   Ins_Claim.AdmissionId     -> hospital.IPD_Admission.AdmissionId
--   Ins_Appeal.ClaimId        -> hospital.Ins_Claim.ClaimId       (ON DELETE CASCADE)
--   Ins_Settlement.ClaimId    -> hospital.Ins_Claim.ClaimId       (ON DELETE CASCADE)
--
-- The prototype stored everything as free text with client-generated random
-- ids and localized display dates. This replaces that with real relationships,
-- server-owned document numbers and proper DATE/DECIMAL types. Insurer names
-- are snapshotted alongside the FK (same pattern as pharmacy/lab lines).
-- ============================================================
CREATE DATABASE IF NOT EXISTS hospital;

-- ── Policy / eligibility ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Ins_Policy (
    PolicyId        INT           NOT NULL AUTO_INCREMENT,
    Uhid            VARCHAR(30)   NOT NULL,
    PatientName     VARCHAR(150)  NOT NULL,
    PolicyNumber    VARCHAR(50)   NOT NULL,
    ProviderId      INT           NULL,
    InsurerName     VARCHAR(150)  NOT NULL,
    TpaId           INT           NULL,
    TpaName         VARCHAR(150)  NULL,
    PlanName        VARCHAR(150)  NULL,
    Status          VARCHAR(20)   NOT NULL DEFAULT 'Active',   -- Active | Expired
    ValidUntil      DATE          NULL,
    SumInsured      DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    BalanceAmount   DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    NetworkHospital TINYINT(1)    NOT NULL DEFAULT 1,
    CopayPercentage DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
    Deductible      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    CreatedBy       VARCHAR(100)  NULL,
    CreatedDate     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy      VARCHAR(100)  NULL,
    ModifiedDate    DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT PK_Ins_Policy PRIMARY KEY (PolicyId),
    CONSTRAINT UQ_Ins_Policy_Number UNIQUE (PolicyNumber),
    CONSTRAINT FK_Ins_Policy_Provider FOREIGN KEY (ProviderId)
        REFERENCES admin.Master_InsuranceProvider (InsuranceProviderId),
    CONSTRAINT FK_Ins_Policy_Tpa FOREIGN KEY (TpaId)
        REFERENCES admin.Master_Tpa (TpaId),
    KEY IDX_Ins_Policy_Uhid (Uhid),
    KEY IDX_Ins_Policy_Status (Status)
);

-- ── Pre-authorisation ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Ins_PreAuth (
    PreAuthId     INT           NOT NULL AUTO_INCREMENT,
    PreAuthNumber VARCHAR(20)   NOT NULL,                       -- AUTH-YYYYNNNN
    Uhid          VARCHAR(30)   NOT NULL,
    PatientName   VARCHAR(150)  NOT NULL,
    ProviderId    INT           NULL,
    InsurerName   VARCHAR(150)  NOT NULL,
    Diagnosis     VARCHAR(500)  NULL,
    RequestedAmount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    ApprovedAmount  DECIMAL(14,2) NULL,
    Status        VARCHAR(20)   NOT NULL DEFAULT 'Pending',     -- Pending | Approved | Rejected
    DecisionReason VARCHAR(500) NULL,
    RequestDate   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    DecisionDate  DATETIME      NULL,
    CreatedBy     VARCHAR(100)  NULL,
    CreatedDate   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy    VARCHAR(100)  NULL,
    ModifiedDate  DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT PK_Ins_PreAuth PRIMARY KEY (PreAuthId),
    CONSTRAINT UQ_Ins_PreAuth_Number UNIQUE (PreAuthNumber),
    CONSTRAINT FK_Ins_PreAuth_Provider FOREIGN KEY (ProviderId)
        REFERENCES admin.Master_InsuranceProvider (InsuranceProviderId),
    KEY IDX_Ins_PreAuth_Uhid (Uhid),
    KEY IDX_Ins_PreAuth_Status (Status)
);

-- ── Claim ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Ins_Claim (
    ClaimId       INT           NOT NULL AUTO_INCREMENT,
    ClaimNumber   VARCHAR(20)   NOT NULL,                       -- CLM-YYYYNNNN
    Uhid          VARCHAR(30)   NOT NULL,
    PatientName   VARCHAR(150)  NOT NULL,
    ProviderId    INT           NULL,
    InsurerName   VARCHAR(150)  NOT NULL,
    PreAuthId     INT           NULL,
    AdmissionId   INT           NULL,                           -- links the claim to its IPD stay
    Diagnosis     VARCHAR(500)  NULL,
    BilledAmount  DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    PreAuthAmount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    ClaimedAmount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    ApprovedAmount DECIMAL(14,2) NULL,
    BalanceAmount DECIMAL(14,2) NOT NULL DEFAULT 0.00,          -- patient responsibility
    Status        VARCHAR(20)   NOT NULL DEFAULT 'Submitted',   -- Submitted | In Process | Settled | Denied
    DenialReason  VARCHAR(500)  NULL,
    ClaimDate     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    SettledDate   DATETIME      NULL,
    CreatedBy     VARCHAR(100)  NULL,
    CreatedDate   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy    VARCHAR(100)  NULL,
    ModifiedDate  DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT PK_Ins_Claim PRIMARY KEY (ClaimId),
    CONSTRAINT UQ_Ins_Claim_Number UNIQUE (ClaimNumber),
    CONSTRAINT FK_Ins_Claim_Provider FOREIGN KEY (ProviderId)
        REFERENCES admin.Master_InsuranceProvider (InsuranceProviderId),
    CONSTRAINT FK_Ins_Claim_PreAuth FOREIGN KEY (PreAuthId)
        REFERENCES hospital.Ins_PreAuth (PreAuthId),
    CONSTRAINT FK_Ins_Claim_Admission FOREIGN KEY (AdmissionId)
        REFERENCES hospital.IPD_Admission (AdmissionId),
    KEY IDX_Ins_Claim_Uhid (Uhid),
    KEY IDX_Ins_Claim_Status (Status),
    KEY IDX_Ins_Claim_Date (ClaimDate)
);

-- ── Appeal (against a denied claim) ──────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Ins_Appeal (
    AppealId      INT           NOT NULL AUTO_INCREMENT,
    AppealNumber  VARCHAR(20)   NOT NULL,                       -- APP-YYYYNNNN
    ClaimId       INT           NOT NULL,
    DeniedAmount  DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    DenialReason  VARCHAR(500)  NULL,
    DenialCode    VARCHAR(20)   NULL,
    AppealReason  VARCHAR(500)  NULL,
    Status        VARCHAR(20)   NOT NULL DEFAULT 'Denied',      -- Denied | Appealing | Resolved
    AppealDate    DATETIME      NULL,
    ResolvedDate  DATETIME      NULL,
    CreatedDate   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy    VARCHAR(100)  NULL,
    ModifiedDate  DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT PK_Ins_Appeal PRIMARY KEY (AppealId),
    CONSTRAINT UQ_Ins_Appeal_Number UNIQUE (AppealNumber),
    CONSTRAINT UQ_Ins_Appeal_Claim UNIQUE (ClaimId),            -- one open appeal per claim
    CONSTRAINT FK_Ins_Appeal_Claim FOREIGN KEY (ClaimId)
        REFERENCES hospital.Ins_Claim (ClaimId) ON DELETE CASCADE,
    KEY IDX_Ins_Appeal_Status (Status)
);

-- ── Settlement ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital.Ins_Settlement (
    SettlementId     INT           NOT NULL AUTO_INCREMENT,
    SettlementNumber VARCHAR(20)   NOT NULL,                    -- SET-YYYYNNNN
    ClaimId          INT           NOT NULL,
    BilledAmount     DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    ApprovedAmount   DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    TdsAmount        DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    NetReceivable    DECIMAL(14,2) NOT NULL DEFAULT 0.00,       -- approved - tds (persisted)
    Status           VARCHAR(20)   NOT NULL DEFAULT 'Pending',  -- Pending | Reconciled
    UtrReference     VARCHAR(50)   NULL,                        -- bank remittance reference
    SettlementDate   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ReconciledDate   DATETIME      NULL,
    CreatedDate      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy       VARCHAR(100)  NULL,
    ModifiedDate     DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT PK_Ins_Settlement PRIMARY KEY (SettlementId),
    CONSTRAINT UQ_Ins_Settlement_Number UNIQUE (SettlementNumber),
    CONSTRAINT UQ_Ins_Settlement_Claim UNIQUE (ClaimId),
    CONSTRAINT FK_Ins_Settlement_Claim FOREIGN KEY (ClaimId)
        REFERENCES hospital.Ins_Claim (ClaimId) ON DELETE CASCADE,
    KEY IDX_Ins_Settlement_Status (Status)
);


-- ── Integrity fix: the UNIQUE code constraints declared in
--    insurance_provider_master.sql / tpa_master.sql were never applied to the
--    live tables (CREATE TABLE IF NOT EXISTS silently skips them once the
--    table exists) — the same drift already found on Master_Medicine and
--    Master_LabTest. Applied idempotently here.
DROP PROCEDURE IF EXISTS admin.SpTmpAddInsuranceUq;
DELIMITER $$
CREATE PROCEDURE admin.SpTmpAddInsuranceUq()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                   WHERE TABLE_SCHEMA='admin' AND TABLE_NAME='Master_InsuranceProvider'
                     AND INDEX_NAME='UQ_InsuranceProvider_Code') THEN
        ALTER TABLE admin.Master_InsuranceProvider
            ADD CONSTRAINT UQ_InsuranceProvider_Code UNIQUE (ProviderCode);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                   WHERE TABLE_SCHEMA='admin' AND TABLE_NAME='Master_Tpa'
                     AND INDEX_NAME='UQ_Tpa_Code') THEN
        ALTER TABLE admin.Master_Tpa
            ADD CONSTRAINT UQ_Tpa_Code UNIQUE (TpaCode);
    END IF;
END$$
DELIMITER ;
CALL admin.SpTmpAddInsuranceUq();
DROP PROCEDURE IF EXISTS admin.SpTmpAddInsuranceUq;


-- ── Demo seed: the insurers the prototype hardcoded in its dropdowns, so the
--    pickers can be master-driven instead of a fixed 4-option list. ─────
INSERT IGNORE INTO admin.Master_InsuranceProvider
    (ProviderCode, ProviderName, InsuranceType, ContactPerson, PhoneNumber, Email,
     AddressLine1, Country, State, City, PostalCode, CashlessFacility, PreAuthRequired,
     ClaimSettlementDays, Status, CreatedBy)
VALUES
    ('INS-101','Star Health','Health Insurance','Claims Desk','9000000101','claims@starhealth.example','1 Star Plaza','India','Tamil Nadu','Chennai','600001',1,1,21,'Active','Seed'),
    ('INS-102','HDFC ERGO','Health Insurance','Claims Desk','9000000102','claims@hdfcergo.example','2 Ergo House','India','Maharashtra','Mumbai','400001',1,1,30,'Active','Seed'),
    ('INS-103','Care Health','Health Insurance','Claims Desk','9000000103','claims@carehealth.example','3 Care Tower','India','Delhi','New Delhi','110001',1,1,25,'Active','Seed'),
    ('INS-104','ICICI Lombard','Health Insurance','Claims Desk','9000000104','claims@icicilombard.example','4 Lombard Centre','India','Maharashtra','Pune','411001',1,0,28,'Active','Seed');


-- ============================================================
-- Helper SP: settle a claim and raise its settlement.
-- balance = billed - approved; settlement carries TDS and net receivable.
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpInsClaimSettle;
DELIMITER $$
CREATE PROCEDURE hospital.SpInsClaimSettle(
    IN p_ClaimId INT,
    IN p_ApprovedAmount DECIMAL(14,2),
    IN p_TdsPercent DECIMAL(5,2),
    IN p_User VARCHAR(100)
)
BEGIN
    DECLARE v_billed DECIMAL(14,2) DEFAULT 0.00;
    DECLARE v_tds DECIMAL(14,2) DEFAULT 0.00;

    SELECT BilledAmount INTO v_billed FROM hospital.Ins_Claim WHERE ClaimId = p_ClaimId;
    SET v_tds = ROUND(p_ApprovedAmount * COALESCE(p_TdsPercent, 10.00) / 100, 2);

    UPDATE hospital.Ins_Claim
    SET Status = 'Settled',
        ApprovedAmount = p_ApprovedAmount,
        -- never negative: an over-approval does not create a credit balance
        BalanceAmount = GREATEST(v_billed - p_ApprovedAmount, 0),
        SettledDate = NOW(),
        ModifiedBy = p_User
    WHERE ClaimId = p_ClaimId;

    IF NOT EXISTS (SELECT 1 FROM hospital.Ins_Settlement WHERE ClaimId = p_ClaimId) THEN
        SET @yr = YEAR(CURDATE());
        SELECT COALESCE(MAX(CAST(SUBSTRING(SettlementNumber, 9) AS UNSIGNED)), 0) + 1 INTO @roll
        FROM hospital.Ins_Settlement WHERE SettlementNumber LIKE CONCAT('SET-', @yr, '%');

        INSERT INTO hospital.Ins_Settlement
            (SettlementNumber, ClaimId, BilledAmount, ApprovedAmount, TdsAmount, NetReceivable, Status)
        VALUES
            (CONCAT('SET-', @yr, LPAD(@roll, 4, '0')), p_ClaimId, v_billed,
             p_ApprovedAmount, v_tds, p_ApprovedAmount - v_tds, 'Pending');
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- Helper SP: deny a claim and open its appeal record.
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpInsClaimDeny;
DELIMITER $$
CREATE PROCEDURE hospital.SpInsClaimDeny(
    IN p_ClaimId INT,
    IN p_DenialReason VARCHAR(500),
    IN p_User VARCHAR(100)
)
BEGIN
    DECLARE v_amount DECIMAL(14,2) DEFAULT 0.00;

    UPDATE hospital.Ins_Claim
    SET Status = 'Denied', DenialReason = p_DenialReason, ApprovedAmount = 0,
        ModifiedBy = p_User
    WHERE ClaimId = p_ClaimId;

    SELECT ClaimedAmount INTO v_amount FROM hospital.Ins_Claim WHERE ClaimId = p_ClaimId;

    IF NOT EXISTS (SELECT 1 FROM hospital.Ins_Appeal WHERE ClaimId = p_ClaimId) THEN
        SET @yr = YEAR(CURDATE());
        SELECT COALESCE(MAX(CAST(SUBSTRING(AppealNumber, 9) AS UNSIGNED)), 0) + 1 INTO @roll
        FROM hospital.Ins_Appeal WHERE AppealNumber LIKE CONCAT('APP-', @yr, '%');

        INSERT INTO hospital.Ins_Appeal
            (AppealNumber, ClaimId, DeniedAmount, DenialReason, DenialCode, Status)
        VALUES
            (CONCAT('APP-', @yr, LPAD(@roll, 4, '0')), p_ClaimId, v_amount,
             p_DenialReason, 'PR-96', 'Denied');
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- SP: SpInsPolicy  (LIST | GETBYUHID | SEARCH | UPSERT | DELETE)
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpInsPolicy;
DELIMITER $$
CREATE PROCEDURE hospital.SpInsPolicy(
    IN p_Opt VARCHAR(20),
    IN p_PolicyId INT,
    IN p_Uhid VARCHAR(30),
    IN p_PatientName VARCHAR(150),
    IN p_PolicyNumber VARCHAR(50),
    IN p_ProviderId INT,
    IN p_InsurerName VARCHAR(150),
    IN p_TpaId INT,
    IN p_TpaName VARCHAR(150),
    IN p_PlanName VARCHAR(150),
    IN p_Status VARCHAR(20),
    IN p_ValidUntil DATE,
    IN p_SumInsured DECIMAL(14,2),
    IN p_BalanceAmount DECIMAL(14,2),
    IN p_NetworkHospital TINYINT,
    IN p_CopayPercentage DECIMAL(5,2),
    IN p_Deductible DECIMAL(12,2),
    IN p_Search VARCHAR(100),
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT * FROM hospital.Ins_Policy ORDER BY PolicyId DESC;

    ELSEIF p_Opt = 'SEARCH' THEN
        -- Eligibility lookup: exact match on UHID or policy number.
        SELECT * FROM hospital.Ins_Policy
        WHERE LOWER(Uhid) = LOWER(p_Search) OR LOWER(PolicyNumber) = LOWER(p_Search)
        LIMIT 1;

    ELSEIF p_Opt = 'GETBYUHID' THEN
        SELECT * FROM hospital.Ins_Policy WHERE LOWER(Uhid) = LOWER(p_Uhid) ORDER BY PolicyId DESC;

    ELSEIF p_Opt = 'UPSERT' THEN
        INSERT INTO hospital.Ins_Policy
            (Uhid, PatientName, PolicyNumber, ProviderId, InsurerName, TpaId, TpaName, PlanName,
             Status, ValidUntil, SumInsured, BalanceAmount, NetworkHospital, CopayPercentage, Deductible, CreatedBy)
        VALUES
            (p_Uhid, p_PatientName, p_PolicyNumber, p_ProviderId, p_InsurerName, p_TpaId, p_TpaName,
             COALESCE(p_PlanName, 'Standard Plan'), COALESCE(p_Status, 'Active'), p_ValidUntil,
             COALESCE(p_SumInsured, 0), COALESCE(p_BalanceAmount, p_SumInsured, 0),
             COALESCE(p_NetworkHospital, 1), COALESCE(p_CopayPercentage, 0), COALESCE(p_Deductible, 0), p_User)
        ON DUPLICATE KEY UPDATE
            Uhid = VALUES(Uhid), PatientName = VALUES(PatientName), ProviderId = VALUES(ProviderId),
            InsurerName = VALUES(InsurerName), TpaId = VALUES(TpaId), TpaName = VALUES(TpaName),
            PlanName = VALUES(PlanName), Status = VALUES(Status), ValidUntil = VALUES(ValidUntil),
            SumInsured = VALUES(SumInsured), BalanceAmount = VALUES(BalanceAmount),
            NetworkHospital = VALUES(NetworkHospital), CopayPercentage = VALUES(CopayPercentage),
            Deductible = VALUES(Deductible), ModifiedBy = p_User;

        SELECT * FROM hospital.Ins_Policy WHERE PolicyNumber = p_PolicyNumber;

    ELSEIF p_Opt = 'DELETE' THEN
        DELETE FROM hospital.Ins_Policy WHERE PolicyId = p_PolicyId;
        SELECT p_PolicyId AS PolicyId;
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- SP: SpInsPreAuth  (LIST | GETBYID | CREATE | UPDATE | SETSTATUS | DELETE)
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpInsPreAuth;
DELIMITER $$
CREATE PROCEDURE hospital.SpInsPreAuth(
    IN p_Opt VARCHAR(20),
    IN p_PreAuthId INT,
    IN p_Uhid VARCHAR(30),
    IN p_PatientName VARCHAR(150),
    IN p_ProviderId INT,
    IN p_InsurerName VARCHAR(150),
    IN p_Diagnosis VARCHAR(500),
    IN p_RequestedAmount DECIMAL(14,2),
    IN p_ApprovedAmount DECIMAL(14,2),
    IN p_Status VARCHAR(20),
    IN p_DecisionReason VARCHAR(500),
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT * FROM hospital.Ins_PreAuth
        WHERE (p_Status IS NULL OR Status = p_Status)
          AND (p_Uhid IS NULL OR LOWER(Uhid) = LOWER(p_Uhid))
        ORDER BY PreAuthId DESC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT * FROM hospital.Ins_PreAuth WHERE PreAuthId = p_PreAuthId;

    ELSEIF p_Opt = 'CREATE' THEN
        SET @yr = YEAR(CURDATE());
        SELECT COALESCE(MAX(CAST(SUBSTRING(PreAuthNumber, 10) AS UNSIGNED)), 0) + 1 INTO @roll
        FROM hospital.Ins_PreAuth WHERE PreAuthNumber LIKE CONCAT('AUTH-', @yr, '%');

        INSERT INTO hospital.Ins_PreAuth
            (PreAuthNumber, Uhid, PatientName, ProviderId, InsurerName, Diagnosis,
             RequestedAmount, Status, CreatedBy)
        VALUES
            (CONCAT('AUTH-', @yr, LPAD(@roll, 4, '0')), p_Uhid, p_PatientName, p_ProviderId,
             p_InsurerName, p_Diagnosis, COALESCE(p_RequestedAmount, 0), 'Pending', p_User);

        SELECT * FROM hospital.Ins_PreAuth WHERE PreAuthId = LAST_INSERT_ID();

    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE hospital.Ins_PreAuth
        SET Uhid = p_Uhid, PatientName = p_PatientName, ProviderId = p_ProviderId,
            InsurerName = p_InsurerName, Diagnosis = COALESCE(p_Diagnosis, Diagnosis),
            RequestedAmount = p_RequestedAmount, Status = COALESCE(p_Status, Status),
            ModifiedBy = p_User
        WHERE PreAuthId = p_PreAuthId;
        SELECT * FROM hospital.Ins_PreAuth WHERE PreAuthId = p_PreAuthId;

    ELSEIF p_Opt = 'SETSTATUS' THEN
        UPDATE hospital.Ins_PreAuth
        SET Status = p_Status,
            -- an approved pre-auth carries the amount the insurer sanctioned
            ApprovedAmount = IF(p_Status = 'Approved',
                                COALESCE(p_ApprovedAmount, RequestedAmount), NULL),
            DecisionReason = p_DecisionReason,
            DecisionDate = NOW(), ModifiedBy = p_User
        WHERE PreAuthId = p_PreAuthId;
        SELECT * FROM hospital.Ins_PreAuth WHERE PreAuthId = p_PreAuthId;

    ELSEIF p_Opt = 'DELETE' THEN
        DELETE FROM hospital.Ins_PreAuth WHERE PreAuthId = p_PreAuthId;
        SELECT p_PreAuthId AS PreAuthId;
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- SP: SpInsClaim  (LIST | GETBYID | CREATE | UPDATE | SETSTATUS | DELETE)
-- SETSTATUS routes through the settle/deny helpers so appeals and settlements
-- are raised automatically, which the prototype never did.
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpInsClaim;
DELIMITER $$
CREATE PROCEDURE hospital.SpInsClaim(
    IN p_Opt VARCHAR(20),
    IN p_ClaimId INT,
    IN p_Uhid VARCHAR(30),
    IN p_PatientName VARCHAR(150),
    IN p_ProviderId INT,
    IN p_InsurerName VARCHAR(150),
    IN p_PreAuthId INT,
    IN p_AdmissionId INT,
    IN p_Diagnosis VARCHAR(500),
    IN p_BilledAmount DECIMAL(14,2),
    IN p_PreAuthAmount DECIMAL(14,2),
    IN p_ClaimedAmount DECIMAL(14,2),
    IN p_ApprovedAmount DECIMAL(14,2),
    IN p_Status VARCHAR(20),
    IN p_Reason VARCHAR(500),
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT * FROM hospital.Ins_Claim
        WHERE (p_Status IS NULL OR Status = p_Status)
          AND (p_Uhid IS NULL OR LOWER(Uhid) = LOWER(p_Uhid))
          AND (p_FromDate IS NULL OR DATE(ClaimDate) >= p_FromDate)
          AND (p_ToDate IS NULL OR DATE(ClaimDate) <= p_ToDate)
        ORDER BY ClaimId DESC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT * FROM hospital.Ins_Claim WHERE ClaimId = p_ClaimId;

    ELSEIF p_Opt = 'CREATE' THEN
        SET @yr = YEAR(CURDATE());
        SELECT COALESCE(MAX(CAST(SUBSTRING(ClaimNumber, 9) AS UNSIGNED)), 0) + 1 INTO @roll
        FROM hospital.Ins_Claim WHERE ClaimNumber LIKE CONCAT('CLM-', @yr, '%');

        INSERT INTO hospital.Ins_Claim
            (ClaimNumber, Uhid, PatientName, ProviderId, InsurerName, PreAuthId, AdmissionId,
             Diagnosis, BilledAmount, PreAuthAmount, ClaimedAmount, BalanceAmount, Status, CreatedBy)
        VALUES
            (CONCAT('CLM-', @yr, LPAD(@roll, 4, '0')), p_Uhid, p_PatientName, p_ProviderId,
             p_InsurerName, p_PreAuthId, p_AdmissionId, p_Diagnosis,
             COALESCE(p_BilledAmount, 0), COALESCE(p_PreAuthAmount, 0), COALESCE(p_ClaimedAmount, 0),
             GREATEST(COALESCE(p_BilledAmount, 0) - COALESCE(p_ClaimedAmount, 0), 0),
             'Submitted', p_User);

        SELECT * FROM hospital.Ins_Claim WHERE ClaimId = LAST_INSERT_ID();

    ELSEIF p_Opt = 'UPDATE' THEN
        UPDATE hospital.Ins_Claim
        SET Uhid = p_Uhid, PatientName = p_PatientName, ProviderId = p_ProviderId,
            InsurerName = p_InsurerName, Diagnosis = COALESCE(p_Diagnosis, Diagnosis),
            BilledAmount = p_BilledAmount, PreAuthAmount = COALESCE(p_PreAuthAmount, 0),
            ClaimedAmount = COALESCE(p_ClaimedAmount, 0),
            BalanceAmount = GREATEST(COALESCE(p_BilledAmount, 0) - COALESCE(p_ClaimedAmount, 0), 0),
            ModifiedBy = p_User
        WHERE ClaimId = p_ClaimId;
        SELECT * FROM hospital.Ins_Claim WHERE ClaimId = p_ClaimId;

    ELSEIF p_Opt = 'SETSTATUS' THEN
        IF p_Status = 'Settled' THEN
            CALL hospital.SpInsClaimSettle(p_ClaimId,
                 COALESCE(p_ApprovedAmount,
                          (SELECT ClaimedAmount FROM hospital.Ins_Claim WHERE ClaimId = p_ClaimId)),
                 10.00, p_User);
        ELSEIF p_Status = 'Denied' THEN
            CALL hospital.SpInsClaimDeny(p_ClaimId,
                 COALESCE(p_Reason, 'Pending review of medical necessity'), p_User);
        ELSE
            UPDATE hospital.Ins_Claim SET Status = p_Status, ModifiedBy = p_User
            WHERE ClaimId = p_ClaimId;
        END IF;
        SELECT * FROM hospital.Ins_Claim WHERE ClaimId = p_ClaimId;

    ELSEIF p_Opt = 'DELETE' THEN
        DELETE FROM hospital.Ins_Claim WHERE ClaimId = p_ClaimId;
        SELECT p_ClaimId AS ClaimId;
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- SP: SpInsAppeal  (LIST | FILE | RESOLVE)
-- RESOLVE settles the underlying claim through the shared helper.
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpInsAppeal;
DELIMITER $$
CREATE PROCEDURE hospital.SpInsAppeal(
    IN p_Opt VARCHAR(20),
    IN p_AppealId INT,
    IN p_AppealReason VARCHAR(500),
    IN p_ApprovedAmount DECIMAL(14,2),
    IN p_Status VARCHAR(20),
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT a.*, c.ClaimNumber, c.Uhid, c.PatientName, c.InsurerName
        FROM hospital.Ins_Appeal a
        JOIN hospital.Ins_Claim c ON c.ClaimId = a.ClaimId
        WHERE (p_Status IS NULL OR a.Status = p_Status)
        ORDER BY a.AppealId DESC;

    ELSEIF p_Opt = 'FILE' THEN
        UPDATE hospital.Ins_Appeal
        SET Status = 'Appealing', AppealReason = p_AppealReason, AppealDate = NOW(), ModifiedBy = p_User
        WHERE AppealId = p_AppealId;
        SELECT p_AppealId AS AppealId;

    ELSEIF p_Opt = 'RESOLVE' THEN
        UPDATE hospital.Ins_Appeal
        SET Status = 'Resolved', ResolvedDate = NOW(), ModifiedBy = p_User
        WHERE AppealId = p_AppealId;

        SELECT ClaimId, DeniedAmount INTO @cid, @denied
        FROM hospital.Ins_Appeal WHERE AppealId = p_AppealId;

        CALL hospital.SpInsClaimSettle(@cid, COALESCE(p_ApprovedAmount, @denied), 10.00, p_User);
        SELECT p_AppealId AS AppealId, @cid AS ClaimId;
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- SP: SpInsSettlement  (LIST | RECONCILE)
-- ============================================================
DROP PROCEDURE IF EXISTS hospital.SpInsSettlement;
DELIMITER $$
CREATE PROCEDURE hospital.SpInsSettlement(
    IN p_Opt VARCHAR(20),
    IN p_SettlementId INT,
    IN p_UtrReference VARCHAR(50),
    IN p_Status VARCHAR(20),
    IN p_User VARCHAR(100)
)
BEGIN
    IF p_Opt = 'LIST' THEN
        SELECT s.*, c.ClaimNumber, c.Uhid, c.PatientName, c.InsurerName
        FROM hospital.Ins_Settlement s
        JOIN hospital.Ins_Claim c ON c.ClaimId = s.ClaimId
        WHERE (p_Status IS NULL OR s.Status = p_Status)
        ORDER BY s.SettlementId DESC;

    ELSEIF p_Opt = 'RECONCILE' THEN
        UPDATE hospital.Ins_Settlement
        SET Status = 'Reconciled', UtrReference = p_UtrReference,
            ReconciledDate = NOW(), ModifiedBy = p_User
        WHERE SettlementId = p_SettlementId;
        SELECT p_SettlementId AS SettlementId;
    END IF;
END$$
DELIMITER ;
