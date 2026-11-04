BEGIN;

-- 1. Agregar la columna solo si no existe (idempotente)
ALTER TABLE public.expositores
ADD COLUMN IF NOT EXISTS logo VARCHAR(255);

-- 2. Limpieza de datos: normalizar a NULL cualquier valor vacio o solo espacios
UPDATE public.expositores
SET
    logo = NULL
WHERE
    logo IS NOT NULL
    AND btrim (logo) = '';

COMMIT;