-- Migration V4: Cadastro completo de condomínio/obra e estrutura
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS manager_cpf VARCHAR(14);
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS administrator_name VARCHAR(150);
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS administrator_cnpj VARCHAR(18);
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS financial_contact_name VARCHAR(150);
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS financial_contact_phone VARCHAR(20);
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS financial_contact_email VARCHAR(120);

ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS work_type VARCHAR(100);
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS expected_completion_date DATE;
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS halt_reason TEXT;
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS construction_company VARCHAR(150);
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS chief_engineer VARCHAR(150);
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS crea_cau VARCHAR(50);

ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS total_blocks INT DEFAULT 0;
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS total_towers INT DEFAULT 0;
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS total_units_planned INT DEFAULT 0;
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS parking_spaces INT DEFAULT 0;
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS total_area DECIMAL(12,2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_condominiums_name ON condominiums(name);
CREATE INDEX IF NOT EXISTS idx_condominiums_cnpj ON condominiums(cnpj);
