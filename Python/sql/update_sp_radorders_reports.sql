USE hospital;

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
            rt.OrderTestId, rt.TestId, rt.TestCode, rt.TestName, rt.Status AS TestStatus,
            rt.ResultValue, rt.ResultFile, rt.IsCritical, rt.CompletedAt, rt.VerifiedAt, rt.VerifiedBy,
            rt.AcknowledgedAt, rt.AcknowledgedBy,
            pr.Age, pr.Gender, pr.MobileNumber
        FROM Rad_Order ro
        LEFT JOIN Rad_OrderTest rt ON ro.OrderId = rt.OrderId
        LEFT JOIN registration.PatientRegistration pr ON ro.Uhid = pr.Uhid
        ORDER BY ro.OrderedAt DESC;

    ELSEIF p_Action = 'INSERT_ORDER' THEN
        INSERT INTO Rad_Order (OrderNumber, VisitType, Uhid, PatientName, OrderedBy, CreatedBy)
        VALUES (p_OrderNumber, p_VisitType, p_Uhid, p_PatientName, p_OrderedBy, p_UserId);
        
        SET v_OrderId = LAST_INSERT_ID();
        
        INSERT INTO Rad_OrderTest (OrderId, TestId, TestCode, TestName, Status)
        VALUES (v_OrderId, p_TestId, p_TestCode, p_TestName, 'Pending');
        
        SELECT v_OrderId AS OrderId;

    ELSEIF p_Action = 'UPDATE_RESULT' THEN
        UPDATE Rad_OrderTest
        SET 
            ResultValue = p_ResultValue,
            ResultFile = p_ResultFile,
            IsCritical = p_IsCritical,
            Status = 'Completed',
            CompletedAt = CURRENT_TIMESTAMP
        WHERE OrderTestId = p_OrderTestId;
        
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

    ELSEIF p_Action = 'ACKNOWLEDGE_ALERT' THEN
        UPDATE Rad_OrderTest 
        SET 
            AcknowledgedAt = CURRENT_TIMESTAMP, 
            AcknowledgedBy = p_UserId 
        WHERE OrderTestId = p_OrderTestId;
        
        SELECT 'Alert Acknowledged' AS Message;

    END IF;
END //

DELIMITER ;
