-- Preserva os dados existentes e separa a base original dos encargos calculados.
ALTER TABLE installments ADD COLUMN original_amount NUMERIC(15, 2);
ALTER TABLE installments ADD COLUMN days_late INT NOT NULL DEFAULT 0;
ALTER TABLE installments ADD COLUMN updated_amount NUMERIC(15, 2);

UPDATE installments
SET original_amount = base_amount,
    updated_amount = base_amount + COALESCE(penalty_amount, 0) + COALESCE(interest_amount, 0) - COALESCE(discount_amount, 0)
WHERE original_amount IS NULL;

ALTER TABLE installments ALTER COLUMN original_amount SET NOT NULL;
ALTER TABLE installments ALTER COLUMN updated_amount SET NOT NULL;
