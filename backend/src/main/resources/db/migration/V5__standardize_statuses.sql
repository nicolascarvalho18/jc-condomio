-- V5: Padronização Unificada de Status (ACTIVE, PAUSED, FINISHED, CANCELLED)

-- 1. CONDOMINIUMS & OBRAS
ALTER TABLE condominiums ADD COLUMN status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE condominiums ADD COLUMN status_reason TEXT;
ALTER TABLE condominiums ADD COLUMN status_notes TEXT;
ALTER TABLE condominiums ADD COLUMN status_date DATE;

UPDATE condominiums 
SET status = CASE 
    WHEN construction_status IN ('PLANNING', 'IN_PROGRESS') THEN 'ACTIVE'
    WHEN construction_status = 'PAUSED' THEN 'PAUSED'
    WHEN construction_status = 'COMPLETED' THEN 'FINISHED'
    WHEN construction_status = 'CANCELLED' THEN 'CANCELLED'
    ELSE 'ACTIVE'
END,
status_date = CURRENT_DATE;

-- 2. CUSTOMERS (CLIENTES)
ALTER TABLE customers ADD COLUMN status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE customers ADD COLUMN status_reason TEXT;
ALTER TABLE customers ADD COLUMN status_notes TEXT;
ALTER TABLE customers ADD COLUMN status_date DATE;

UPDATE customers 
SET status = 'ACTIVE', status_date = CURRENT_DATE;

-- 3. CONTRACTS (CONTRATOS E SERVIÇOS)
ALTER TABLE contracts ADD COLUMN status_reason TEXT;
ALTER TABLE contracts ADD COLUMN status_notes TEXT;
ALTER TABLE contracts ADD COLUMN status_date DATE;

UPDATE contracts
SET status = CASE 
    WHEN status IN ('DRAFT', 'ACTIVE', 'IN_RENEGOTIATION') THEN 'ACTIVE'
    WHEN status IN ('SETTLED', 'TERMINATED') THEN 'FINISHED'
    WHEN status IN ('CANCELLED', 'RESCINDED') THEN 'CANCELLED'
    ELSE 'ACTIVE'
END,
status_date = CURRENT_DATE;

-- 4. INSTALLMENTS (PARCELAS A RECEBER / FINANCEIRO)
ALTER TABLE installments ADD COLUMN status_reason TEXT;
ALTER TABLE installments ADD COLUMN status_notes TEXT;
ALTER TABLE installments ADD COLUMN status_date DATE;

UPDATE installments
SET status = CASE 
    WHEN status IN ('PENDING', 'OVERDUE', 'PARTIALLY_PAID') THEN 'ACTIVE'
    WHEN status = 'PAID' THEN 'FINISHED'
    WHEN status IN ('CANCELLED', 'RENEGOTIATED') THEN 'CANCELLED'
    ELSE 'ACTIVE'
END,
status_date = CURRENT_DATE;

-- 5. USERS (USUÁRIOS DO SISTEMA)
ALTER TABLE users ADD COLUMN status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL;
ALTER TABLE users ADD COLUMN status_reason TEXT;
ALTER TABLE users ADD COLUMN status_notes TEXT;
ALTER TABLE users ADD COLUMN status_date DATE;

UPDATE users
SET status = CASE 
    WHEN active = TRUE THEN 'ACTIVE'
    ELSE 'CANCELLED'
END,
status_date = CURRENT_DATE;
