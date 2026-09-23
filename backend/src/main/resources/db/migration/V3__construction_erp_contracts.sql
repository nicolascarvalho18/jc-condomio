-- Migration V3: Campos de ERP de Construção Civil e Dados do Responsável
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS service_type VARCHAR(50);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS service_description TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(30) DEFAULT 'TOTAL_VALUE';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS billing_type VARCHAR(30) DEFAULT 'PARCELED';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) DEFAULT 'BOLETO';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) DEFAULT 0.00;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS termination_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS termination_reason TEXT;

ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS manager_name VARCHAR(150);
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS manager_phone VARCHAR(20);
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS manager_email VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_contracts_service_type ON contracts(service_type);
CREATE INDEX IF NOT EXISTS idx_contracts_pricing_model ON contracts(pricing_model);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
