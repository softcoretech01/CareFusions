-- 4. Billing_Advance table (For Advance Payment)
CREATE TABLE IF NOT EXISTS Billing_Advance (
    AdvanceId INT AUTO_INCREMENT PRIMARY KEY,
    AdvanceNo VARCHAR(50) UNIQUE NOT NULL,
    ServiceOrderId INT NOT NULL,
    UHID VARCHAR(50) NOT NULL,
    TotalAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    PaidAmount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    PaymentMode VARCHAR(50) NULL,
    PaymentReference VARCHAR(100) NULL,
    Status ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED') DEFAULT 'PENDING',
    IsDeleted BOOLEAN DEFAULT 0,
    CreatedBy VARCHAR(100),
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy VARCHAR(100),
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ServiceOrderId) REFERENCES Service_Order(ServiceOrderId) ON DELETE CASCADE,
    INDEX idx_billing_advance_status (Status)
);
