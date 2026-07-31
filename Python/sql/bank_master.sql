-- ============================================================
-- Bank Master - SQL Script
-- Database : admin
-- Table    : Master_Bank
-- SP       : SpMasterBank
-- Screen   : /admin/masters/bank
-- ============================================================

USE admin;

-- ============================================================
-- TABLE: Master_Bank
-- ============================================================
CREATE TABLE IF NOT EXISTS Master_Bank (
    BankId            INT           NOT NULL AUTO_INCREMENT,
    BankCode          VARCHAR(20)   NOT NULL,               -- Auto-generated: BNK-001
    BankName          VARCHAR(150)  NOT NULL,
    AccountNumber     VARCHAR(50)   NOT NULL,
    AccountHolderName VARCHAR(150)  NOT NULL,
    Branch            VARCHAR(150)  NOT NULL,
    IfscCode          VARCHAR(20)   NOT NULL,
    SwiftCode         VARCHAR(20)   NULL,
    Currency          VARCHAR(10)   NOT NULL DEFAULT 'INR',
    OpeningBalance    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    Status            ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    Remarks           TEXT          NULL,

    -- Audit
    CreatedBy         VARCHAR(100)  NULL,
    CreatedDate       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy         VARCHAR(100)  NULL,
    UpdatedDate       DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
    IsDeleted         TINYINT(1)    NOT NULL DEFAULT 0,

    CONSTRAINT PK_Master_Bank PRIMARY KEY (BankId),
    CONSTRAINT UQ_Bank_Code   UNIQUE (BankCode),
    -- NOTE: AccountNumber uniqueness is enforced in the SP for non-deleted rows only.

    KEY IDX_Bank_Name     (BankName),
    KEY IDX_Bank_Account  (AccountNumber),
    KEY IDX_Bank_Status   (Status),
    KEY IDX_Bank_IsDeleted(IsDeleted)
);


-- ============================================================
-- STORED PROCEDURE: SpMasterBank
-- p_Opt: GET | GETBYID | NEXTCODE | INSERT | UPDATE | TOGGLESTATUS | DELETE
--
-- Uniqueness: AccountNumber must be unique among NON-DELETED rows. Violations
-- raise SQLSTATE '45000' with MESSAGE_TEXT = 'DUPLICATE_ACCOUNT_NUMBER'.
-- ============================================================
DROP PROCEDURE IF EXISTS SpMasterBank;

DELIMITER $$

CREATE PROCEDURE SpMasterBank(
    IN  p_Opt               VARCHAR(20),
    IN  p_BankId            INT,
    IN  p_BankName          VARCHAR(150),
    IN  p_AccountNumber     VARCHAR(50),
    IN  p_AccountHolderName VARCHAR(150),
    IN  p_Branch            VARCHAR(150),
    IN  p_IfscCode          VARCHAR(20),
    IN  p_SwiftCode         VARCHAR(20),
    IN  p_Currency          VARCHAR(10),
    IN  p_OpeningBalance    DECIMAL(15,2),
    IN  p_Status            VARCHAR(20),
    IN  p_Remarks           TEXT,
    IN  p_CreatedBy         VARCHAR(100),
    IN  p_UpdatedBy         VARCHAR(100),
    IN  p_Search            VARCHAR(255),
    IN  p_BankFilter        VARCHAR(150),
    IN  p_StatusFilter      VARCHAR(20)
)
BEGIN

    IF p_Opt = 'GET' THEN
        SELECT
            BankId, BankCode, BankName, AccountNumber, AccountHolderName, Branch,
            IfscCode, SwiftCode, Currency, OpeningBalance, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Bank
        WHERE IsDeleted = 0
          AND (
            p_Search IS NULL OR p_Search = ''
            OR BankCode      LIKE CONCAT('%', p_Search, '%')
            OR BankName      LIKE CONCAT('%', p_Search, '%')
            OR AccountNumber LIKE CONCAT('%', p_Search, '%')
          )
          AND (p_BankFilter   IS NULL OR p_BankFilter   = '' OR BankName = p_BankFilter)
          AND (p_StatusFilter IS NULL OR p_StatusFilter = '' OR Status   = p_StatusFilter)
        ORDER BY BankId ASC;

    ELSEIF p_Opt = 'GETBYID' THEN
        SELECT
            BankId, BankCode, BankName, AccountNumber, AccountHolderName, Branch,
            IfscCode, SwiftCode, Currency, OpeningBalance, Status, Remarks,
            CreatedBy, CreatedDate, UpdatedBy, UpdatedDate
        FROM Master_Bank
        WHERE BankId = p_BankId
          AND IsDeleted = 0;

    ELSEIF p_Opt = 'NEXTCODE' THEN
        SELECT CONCAT('BNK-', LPAD(
            COALESCE(MAX(CAST(SUBSTRING(BankCode, 5) AS UNSIGNED)), 0) + 1,
            3, '0'
        )) AS BankCode
        FROM Master_Bank;

    ELSEIF p_Opt = 'INSERT' THEN
        BEGIN
            DECLARE v_NextNum INT DEFAULT 1;
            DECLARE v_Code    VARCHAR(20);

            IF EXISTS (SELECT 1 FROM Master_Bank WHERE AccountNumber = p_AccountNumber AND IsDeleted = 0) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ACCOUNT_NUMBER';
            END IF;

            SELECT COALESCE(MAX(CAST(SUBSTRING(BankCode, 5) AS UNSIGNED)), 0) + 1
            INTO v_NextNum
            FROM Master_Bank;

            SET v_Code = CONCAT('BNK-', LPAD(v_NextNum, 3, '0'));

            INSERT INTO Master_Bank (
                BankCode, BankName, AccountNumber, AccountHolderName, Branch,
                IfscCode, SwiftCode, Currency, OpeningBalance, Status, Remarks, CreatedBy
            ) VALUES (
                v_Code, p_BankName, p_AccountNumber, p_AccountHolderName, p_Branch,
                p_IfscCode, p_SwiftCode, p_Currency, p_OpeningBalance, p_Status, p_Remarks, p_CreatedBy
            );

            SELECT LAST_INSERT_ID() AS BankId, v_Code AS BankCode;
        END;

    ELSEIF p_Opt = 'UPDATE' THEN
        IF EXISTS (SELECT 1 FROM Master_Bank WHERE AccountNumber = p_AccountNumber AND IsDeleted = 0 AND BankId <> p_BankId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ACCOUNT_NUMBER';
        END IF;

        UPDATE Master_Bank
        SET
            BankName          = p_BankName,
            AccountNumber     = p_AccountNumber,
            AccountHolderName = p_AccountHolderName,
            Branch            = p_Branch,
            IfscCode          = p_IfscCode,
            SwiftCode         = p_SwiftCode,
            Currency          = p_Currency,
            OpeningBalance    = p_OpeningBalance,
            Status            = p_Status,
            Remarks           = p_Remarks,
            UpdatedBy         = p_UpdatedBy,
            UpdatedDate       = CURRENT_TIMESTAMP
        WHERE BankId = p_BankId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'TOGGLESTATUS' THEN
        UPDATE Master_Bank
        SET
            Status      = CASE WHEN Status = 'Active' THEN 'Inactive' ELSE 'Active' END,
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE BankId = p_BankId
          AND IsDeleted = 0;
        SELECT ROW_COUNT() AS AffectedRows;

    ELSEIF p_Opt = 'DELETE' THEN
        UPDATE Master_Bank
        SET
            IsDeleted   = 1,
            Status      = 'Inactive',
            UpdatedBy   = p_UpdatedBy,
            UpdatedDate = CURRENT_TIMESTAMP
        WHERE BankId = p_BankId;
        SELECT ROW_COUNT() AS AffectedRows;

    END IF;

END$$

DELIMITER ;
