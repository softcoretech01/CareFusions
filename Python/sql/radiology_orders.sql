USE hospital;

-- Create Rad_Order Table
CREATE TABLE IF NOT EXISTS Rad_Order (
    OrderId INT AUTO_INCREMENT PRIMARY KEY,
    OrderNumber VARCHAR(20) NOT NULL UNIQUE,
    Category VARCHAR(20) NOT NULL DEFAULT 'Radiology',
    VisitType VARCHAR(10) NOT NULL, -- 'OP' or 'IP'
    Uhid VARCHAR(30) NOT NULL,
    PatientName VARCHAR(150) NOT NULL,
    OrderedBy VARCHAR(150),
    OrderedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    CreatedBy VARCHAR(100),
    CreatedDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ModifiedBy VARCHAR(100),
    ModifiedDate DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- Create Rad_OrderTest Table
CREATE TABLE IF NOT EXISTS Rad_OrderTest (
    OrderTestId INT AUTO_INCREMENT PRIMARY KEY,
    OrderId INT NOT NULL,
    TestId INT, -- References admin.Master_RadiologyService (RadiologyServiceId)
    TestCode VARCHAR(50),
    TestName VARCHAR(200) NOT NULL,
    BodyPart VARCHAR(150),
    Status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    ResultValue TEXT,
    ResultFile VARCHAR(500),
    IsCritical BOOLEAN NOT NULL DEFAULT 0,
    CompletedAt DATETIME,
    VerifiedAt DATETIME,
    VerifiedBy VARCHAR(150),
    AcknowledgedAt DATETIME,
    AcknowledgedBy VARCHAR(150),
    FOREIGN KEY (OrderId) REFERENCES Rad_Order(OrderId) ON DELETE CASCADE
);

-- Drop Stored Procedure if exists
DROP PROCEDURE IF EXISTS SpRadOrders;

DELIMITER //

CREATE PROCEDURE SpRadOrders(
    IN p_Action VARCHAR(50),
    IN p_OrderId INT,
    IN p_OrderTestId INT,
    IN p_OrderNumber VARCHAR(20),
    IN p_VisitType VARCHAR(10),
    IN p_Uhid VARCHAR(30),
    IN p_PatientName VARCHAR(150),
    IN p_OrderedBy VARCHAR(150),
    IN p_TestId INT,
    IN p_TestCode VARCHAR(50),
    IN p_TestName VARCHAR(200),
    IN p_BodyPart VARCHAR(150),
    IN p_ResultValue TEXT,
    IN p_ResultFile VARCHAR(500),
    IN p_IsCritical BOOLEAN,
    IN p_Status VARCHAR(30),
    IN p_UserId VARCHAR(100)
)
BEGIN
    DECLARE v_OrderId INT;
    
    IF p_Action = 'SELECT_ALL' THEN
        SELECT 
            ro.OrderId, ro.OrderNumber, ro.Category, ro.VisitType, ro.Uhid,
            ro.PatientName, ro.OrderedBy, ro.OrderedAt, ro.Status AS OrderStatus,
            rt.OrderTestId, rt.TestId, rt.TestCode, rt.TestName, rt.BodyPart, rt.Status AS TestStatus,
            rt.ResultValue, rt.ResultFile, rt.IsCritical, rt.CompletedAt, rt.VerifiedAt, rt.VerifiedBy
        FROM Rad_Order ro
        LEFT JOIN Rad_OrderTest rt ON ro.OrderId = rt.OrderId
        ORDER BY ro.OrderedAt DESC;

    ELSEIF p_Action = 'INSERT_ORDER' THEN
        INSERT INTO Rad_Order (OrderNumber, VisitType, Uhid, PatientName, OrderedBy, CreatedBy)
        VALUES (p_OrderNumber, p_VisitType, p_Uhid, p_PatientName, p_OrderedBy, p_UserId);
        
        SET v_OrderId = LAST_INSERT_ID();
        
        INSERT INTO Rad_OrderTest (OrderId, TestId, TestCode, TestName, BodyPart, Status)
        VALUES (v_OrderId, p_TestId, p_TestCode, p_TestName, p_BodyPart, 'Pending');
        
        SELECT v_OrderId AS OrderId;

    ELSEIF p_Action = 'UPDATE_RESULT' THEN
        -- Update the test status and results
        UPDATE Rad_OrderTest
        SET 
            ResultValue = p_ResultValue,
            ResultFile = p_ResultFile,
            IsCritical = p_IsCritical,
            Status = 'Completed',
            CompletedAt = CURRENT_TIMESTAMP
        WHERE OrderTestId = p_OrderTestId;
        
        -- Check if all tests for this order are completed
        SET v_OrderId = (SELECT OrderId FROM Rad_OrderTest WHERE OrderTestId = p_OrderTestId);
        
        IF (SELECT COUNT(*) FROM Rad_OrderTest WHERE OrderId = v_OrderId AND Status != 'Completed') = 0 THEN
            UPDATE Rad_Order
            SET Status = 'Completed'
            WHERE OrderId = v_OrderId;
        ELSEIF (SELECT COUNT(*) FROM Rad_OrderTest WHERE OrderId = v_OrderId AND Status = 'Completed') > 0 THEN
            UPDATE Rad_Order
            SET Status = 'Partial'
            WHERE OrderId = v_OrderId;
        END IF;
        
        SELECT 'Success' AS Message;

    END IF;
END //

DELIMITER ;

-- Insert Seed Data
TRUNCATE TABLE Rad_OrderTest;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Rad_Order;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO Rad_Order (OrderNumber, Category, VisitType, Uhid, PatientName, OrderedBy, OrderedAt, Status) VALUES
('RAD-2026-001', 'Radiology', 'OP', 'UHID-2026-0001', 'John Doe', 'Dr. Smith', DATE_SUB(NOW(), INTERVAL 2 HOUR), 'Pending'),
('RAD-2026-002', 'Radiology', 'IP', 'UHID-2026-0002', 'Jane Smith', 'Dr. Adams', DATE_SUB(NOW(), INTERVAL 24 HOUR), 'Partial'),
('RAD-2026-003', 'Radiology', 'IP', 'UHID-2026-0008', 'Sneha Gupta', 'Dr. Emily Brown', DATE_SUB(NOW(), INTERVAL 48 HOUR), 'Completed');

INSERT INTO Rad_OrderTest (OrderId, TestId, TestCode, TestName, BodyPart, Status, ResultValue, ResultFile, IsCritical, CompletedAt) VALUES
(1, 1, 'XRY01', 'Chest X-Ray', NULL, 'Pending', NULL, NULL, 0, NULL),
(2, 2, 'USG01', 'Ultrasound Abdomen', NULL, 'Completed', 'Mild fatty liver', 'report_1.pdf', 0, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(2, 3, 'CT01', 'CT Head', NULL, 'Pending', NULL, NULL, 0, NULL),
(3, 4, 'MRI01', 'MRI Brain', NULL, 'Completed', 'No acute infarct or hemorrhage', 'mri_report.pdf', 0, DATE_SUB(NOW(), INTERVAL 24 HOUR));
