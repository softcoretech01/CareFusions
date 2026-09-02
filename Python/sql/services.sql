-- services.sql
-- Central Service Order tables for HMS Financial & Service Workflow

-- 1. Service_Order table (Central Backbone)
CREATE TABLE IF NOT EXISTS Service_Order (
    ServiceOrderId INT AUTO_INCREMENT PRIMARY KEY,
    OrderNo VARCHAR(50) UNIQUE NOT NULL,
    UHID VARCHAR(50) NOT NULL,
    EncounterId INT NULL, -- For OPD visits if applicable
    AdmissionId INT NULL, -- For IPD admissions
    DoctorId INT NULL,
    DepartmentId INT NULL,
    OrderType ENUM('LAB', 'RADIOLOGY', 'OPERATION', 'OTHER') NOT NULL,
    SourceModule ENUM('OPD', 'IPD', 'EMERGENCY') NOT NULL,
    OrderDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    OrderStatus ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'ACTIVE',
    PROStatus ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    PaymentStatus ENUM('NOT_REQUIRED', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED') DEFAULT 'UNPAID',
    FinancialStatus ENUM('NOT_CLEARED', 'PARTIALLY_CLEARED', 'CLEARED', 'REFUND_PENDING', 'REFUNDED') DEFAULT 'NOT_CLEARED',
    ServiceStatus ENUM('NOT_RELEASED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'NOT_RELEASED',
    AuthorizationStatus ENUM('NOT_REQUIRED', 'PENDING', 'SUBMITTED', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'EXPIRED') DEFAULT 'NOT_REQUIRED',
    IsDeleted BOOLEAN DEFAULT 0,
    CreatedBy VARCHAR(100),
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedBy VARCHAR(100),
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_service_order_uhid (UHID),
    INDEX idx_service_order_status (OrderStatus),
    INDEX idx_service_order_pro (PROStatus)
);

-- 2. Service_OrderItem table (Item level workflow)
CREATE TABLE IF NOT EXISTS Service_OrderItem (
    ServiceOrderItemId INT AUTO_INCREMENT PRIMARY KEY,
    ServiceOrderId INT NOT NULL,
    ItemType ENUM('LAB', 'RADIOLOGY', 'OPERATION', 'MEDICINE', 'OTHER') NOT NULL,
    ItemId VARCHAR(50) NOT NULL, -- The ID from the master table (e.g. TestId)
    ItemName VARCHAR(255) NOT NULL,
    Quantity INT DEFAULT 1,
    UOM VARCHAR(50) NULL,
    MasterPrice DECIMAL(10, 2) DEFAULT 0.00,
    OriginalPrice DECIMAL(10, 2) DEFAULT 0.00,
    PROPrice DECIMAL(10, 2) DEFAULT 0.00,
    AuthorizedDiscount DECIMAL(10, 2) DEFAULT 0.00,
    GrossAmount DECIMAL(10, 2) DEFAULT 0.00,
    NetAmount DECIMAL(10, 2) DEFAULT 0.00,
    InsuranceCoveredAmount DECIMAL(10, 2) DEFAULT 0.00,
    PatientResponsibility DECIMAL(10, 2) DEFAULT 0.00,
    PROStatus ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    PaymentStatus ENUM('NOT_REQUIRED', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED') DEFAULT 'UNPAID',
    FinancialStatus ENUM('NOT_CLEARED', 'PARTIALLY_CLEARED', 'CLEARED', 'REFUND_PENDING', 'REFUNDED') DEFAULT 'NOT_CLEARED',
    ServiceStatus ENUM('NOT_RELEASED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'NOT_RELEASED',
    AuthorizationStatus ENUM('NOT_REQUIRED', 'PENDING', 'SUBMITTED', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'EXPIRED') DEFAULT 'NOT_REQUIRED',
    IsDeleted BOOLEAN DEFAULT 0,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ServiceOrderId) REFERENCES Service_Order(ServiceOrderId) ON DELETE CASCADE,
    INDEX idx_service_item_status (ServiceStatus),
    INDEX idx_service_item_payment (PaymentStatus)
);

-- 3. Service_Release table (The Final Gate)
CREATE TABLE IF NOT EXISTS Service_Release (
    ServiceReleaseId INT AUTO_INCREMENT PRIMARY KEY,
    ServiceOrderItemId INT NOT NULL,
    ReleaseDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    ReleasedBy VARCHAR(100),
    ReleaseStatus ENUM('ACTIVE', 'CANCELLED', 'REVOKED') DEFAULT 'ACTIVE',
    ReleaseReason VARCHAR(500) NULL,
    IsDeleted BOOLEAN DEFAULT 0,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ServiceOrderItemId) REFERENCES Service_OrderItem(ServiceOrderItemId) ON DELETE CASCADE,
    INDEX idx_service_release_status (ReleaseStatus)
);
