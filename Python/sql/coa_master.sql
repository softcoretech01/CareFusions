-- ============================================================
-- Chart of Accounts (CoA) Master - SQL Script
-- Database : admin
-- Table    : Master_CoaAccount
-- SP       : SpMasterCoa
-- Screen   : /admin/masters/coa
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_CoaAccount
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_CoaAccount (
    CoaId                  INT           NOT NULL AUTO_INCREMENT,
    AccountCode            VARCHAR(20)   NOT NULL,          -- Auto-generated: COA-001
    AccountName            VARCHAR(150)  NOT NULL,
    AccountType            ENUM('Asset','Liability','Income','Expense','Equity') NOT NULL,
    ParentAccount          VARCHAR(150)  NULL,
    Description            VARCHAR(500)  NULL,
    OpeningBalance         DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    AllowManualJournal     TINYINT(1)    NOT NULL DEFAULT 1,
    ReconciliationRequired TINYINT(1)    NOT NULL DEFAULT 0,
    Status                 ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks                TEXT          NULL,

    -- Audit
    CreatedBy              VARCHAR(100)  NULL,
    CreatedDate            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy              VARCHAR(100)  NULL,
    UpdatedDate            DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted              TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_CoaAccount PRIMARY KEY (CoaId),
    CONSTRAINT UQ_Coa_Code          UNIQUE (AccountCode),
    -- NOTE: AccountName uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_Coa_Name     (AccountName),
    KEY IDX_Coa_Type     (AccountType),
    KEY IDX_Coa_Status   (Status),
    KEY IDX_Coa_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterCoa
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: AccountName must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_ACCOUNT_NAME'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterCoa;

DELIMITER $$

CREATE PROCEDURE SpMasterCoa(
    IN  p_Opt                    VARCHAR(20),
    IN  p_CoaId                  INT,
    IN  p_AccountName            VARCHAR(150),
    IN  p_AccountType            VARCHAR(20),
    IN  p_ParentAccount          VARCHAR(150),
    IN  p_Description            VARCHAR(500),
    IN  p_OpeningBalance         DECIMAL(15,2),
    IN  p_AllowManualJournal     TINYINT,
    IN  p_ReconciliationRequired TINYINT,
    IN  p_Status                 VARCHAR(20),
    IN  p_Remarks                TEXT,
    IN  p_CreatedBy              VARCHAR(100),
    IN  p_UpdatedBy              VARCHAR(100),
    IN  p_Search                 VARCHAR(255),
    IN  p_TypeFilter             VARCHAR(20),
    IN  p_StatusFilter           VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            CoaId, AccountCode, AccountName, AccountType, ParentAccount, Description,
            OpeningBalance, AllowManualJournal, ReconciliationRequired, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_CoaAccount
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR AccountCode LIKE CONCAT('%', p_Search, '%')
            OR AccountName LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_TypeFilter   IS NULL OR p_TypeFilter   = '' OR AccountType = p_TypeFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status      = p_StatusFilter)
        ORDER BY CoaId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            CoaId, AccountCode, AccountName, AccountType, ParentAccount, Description,
            OpeningBalance, AllowManualJournal, ReconciliationRequired, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_CoaAccount
        WHERE CoaId = p_CoaId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('COA-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(AccountCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS AccountCode
        FROM Master_CoaAccount;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_CoaAccount WHERE AccountName = p_AccountName AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ACCOUNT_NAME';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(AccountCode, 5) AS UNSIGNED)), 0) + 1
            INTO v_NextNum
            FROM Master_CoaAccount;

            SET v_Code = CONCAT('COA-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_CoaAccount (
                AccountCode, AccountName, AccountType, ParentAccount, Description,
                OpeningBalance, AllowManualJournal, ReconciliationRequired, Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_AccountName, p_AccountType, p_ParentAccount, p_Description,
                p_OpeningBalance, p_AllowManualJournal, p_ReconciliationRequired, p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS CoaId, v_Code AS AccountCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_CoaAccount WHERE AccountName = p_AccountName AND IsDeleted = 0 AND CoaId <> p_CoaId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ACCOUNT_NAME';
        END IF;

        UPDATE Master_CoaAccount
        SET
            AccountName            = p_AccountName,
            AccountType            = p_AccountType,
            ParentAccount          = p_ParentAccount,
            Description            = p_Description,
            OpeningBalance         = p_OpeningBalance,
            AllowManualJournal     = p_AllowManualJournal,
            ReconciliationRequired = p_ReconciliationRequired,
            Status                 = p_Status,
            Remarks                = p_Remarks,
            UpdatedBy              = p_UpdatedBy,
            UpdatedDate            = CURRENT_TIMESTAMP
        WHERE CoaId = p_CoaId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_CoaAccount
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE CoaId = p_CoaId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_CoaAccount
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE CoaId = p_CoaId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
