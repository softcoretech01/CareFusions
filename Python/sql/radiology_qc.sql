USE hospital;

-- Create Rad_QcLog Table
CREATE TABLE IF NOT EXISTS Rad_QcLog (
    QcId INT AUTO_INCREMENT PRIMARY KEY,
    QcNumber VARCHAR(20) NOT NULL UNIQUE,
    Category VARCHAR(20) NOT NULL DEFAULT 'Radiology',
    QcDate DATE NOT NULL,
    MachineName VARCHAR(150) NOT NULL,
    TestName VARCHAR(200) NOT NULL,
    ExpectedValue DECIMAL(12,3) NOT NULL,
    ActualValue DECIMAL(12,3) NOT NULL,
    Deviation DECIMAL(12,3) NOT NULL,
    Status VARCHAR(10) NOT NULL,
    Remarks VARCHAR(500),
    CreatedDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Drop Stored Procedure if exists
DROP PROCEDURE IF EXISTS SpRadQcLogs;

DELIMITER //

CREATE PROCEDURE SpRadQcLogs(
    IN p_Action VARCHAR(50),
    IN p_QcId INT,
    IN p_QcNumber VARCHAR(20),
    IN p_QcDate DATE,
    IN p_MachineName VARCHAR(150),
    IN p_TestName VARCHAR(200),
    IN p_ExpectedValue DECIMAL(12,3),
    IN p_ActualValue DECIMAL(12,3),
    IN p_Deviation DECIMAL(12,3),
    IN p_Status VARCHAR(10),
    IN p_Remarks VARCHAR(500)
)
BEGIN
    DECLARE v_QcId INT;

    IF p_Action = 'SELECT_ALL' THEN
        SELECT 
            QcId, QcNumber, Category, QcDate, MachineName, TestName,
            ExpectedValue, ActualValue, Deviation, Status, Remarks, CreatedDate
        FROM Rad_QcLog
        ORDER BY QcDate DESC, QcId DESC;

    ELSEIF p_Action = 'INSERT' THEN
        INSERT INTO Rad_QcLog (
            QcNumber, QcDate, MachineName, TestName, 
            ExpectedValue, ActualValue, Deviation, Status, Remarks
        )
        VALUES (
            p_QcNumber, p_QcDate, p_MachineName, p_TestName,
            p_ExpectedValue, p_ActualValue, p_Deviation, p_Status, p_Remarks
        );
        
        SET v_QcId = LAST_INSERT_ID();
        SELECT v_QcId AS QcId;

    END IF;
END //

DELIMITER ;

-- Insert Seed Data
TRUNCATE TABLE Rad_QcLog;

INSERT INTO Rad_QcLog (
    QcNumber, QcDate, MachineName, TestName, ExpectedValue, ActualValue, Deviation, Status, Remarks
) VALUES 
('R-QC-8123', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'MRI Scanner (Suite A)', 'Daily Phantom Calibration', 10.0, 10.1, 0.1, 'Pass', 'Normal calibration run'),
('R-QC-8124', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'MRI Scanner (Suite A)', 'Daily Phantom Calibration', 10.0, 10.05, 0.05, 'Pass', 'Normal calibration run'),
('R-QC-8125', CURDATE(), 'CT Scanner (Room 1)', 'Water Phantom QA', 0.0, 1.2, 1.2, 'Fail', 'Deviation out of bounds, re-calibrated');
