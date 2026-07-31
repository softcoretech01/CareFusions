-- ==============================================================================
-- Procedure Type Master Schema & Data
-- ==============================================================================

CREATE TABLE IF NOT EXISTS Master_ProcedureType (
    ProcedureTypeId INT AUTO_INCREMENT PRIMARY KEY,
    TypeName        VARCHAR(100) NOT NULL UNIQUE
);

-- Insert default procedure types if the table is empty
INSERT IGNORE INTO Master_ProcedureType (TypeName) VALUES 
('Consultation'), 
('Dressing'), 
('Injection'), 
('Minor Surgery'), 
('Major Surgery'), 
('Endoscopy'), 
('Dialysis'), 
('Physiotherapy'), 
('ICU Procedure'), 
('Emergency Procedure');
