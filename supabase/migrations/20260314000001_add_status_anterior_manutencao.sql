-- Add status_anterior to obra_manutencao so we can revert obra status when maintenance concludes
ALTER TABLE obra_manutencao ADD COLUMN IF NOT EXISTS status_anterior TEXT;
