-- Migration V2: Suporte a Contratos de Condomínio e Tipos de Contrato
ALTER TABLE contracts ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE contracts ALTER COLUMN unit_id DROP NOT NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER_PURCHASE';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS condominium_id BIGINT REFERENCES condominiums(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS description VARCHAR(255);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_condition VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_contracts_condominium ON contracts(condominium_id);
CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(contract_type);
