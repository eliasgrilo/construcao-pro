-- Drop the old uuid overload that doesn't include mão de obra.
-- The text overload (created in 20260417010000) already includes mão de obra costs.
DROP FUNCTION IF EXISTS public.get_obra_custos(uuid);
