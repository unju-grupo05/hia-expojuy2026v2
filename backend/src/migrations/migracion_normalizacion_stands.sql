-- MIGRACIÓN DDL Y NORMALIZACIÓN: Stands, Ubicaciones 3D y Expositores (3NF)
BEGIN;

-- 1. Crear tabla de ubicaciones espaciales 3D (Relación 1 a 1 estricta con stands)
CREATE TABLE IF NOT EXISTS public.ubicaciones_stand (
    id SERIAL PRIMARY KEY,
    stand_id VARCHAR(50) NOT NULL UNIQUE,
    x DOUBLE PRECISION NOT NULL DEFAULT 0,
    y DOUBLE PRECISION NOT NULL DEFAULT 0,
    z DOUBLE PRECISION NOT NULL DEFAULT 0,
    rot_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    w DOUBLE PRECISION NOT NULL DEFAULT 3,
    l DOUBLE PRECISION NOT NULL DEFAULT 3,
    h DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    carpet_color INTEGER DEFAULT 3359061,
    type VARCHAR(50) DEFAULT 'cubierto',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ubicacion_stand FOREIGN KEY (stand_id)
        REFERENCES public.stands (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 2. Migrar los valores geométricos de todos los stands actuales hacia ubicaciones_stand
-- Se verifica si las columnas espaciales aún residen en la tabla stands antes de migrar
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'stands' 
          AND column_name = 'x'
    ) THEN
        INSERT INTO public.ubicaciones_stand (
            stand_id, x, y, z, rot_y, w, l, h, carpet_color, type, "createdAt", "updatedAt"
        )
        SELECT
            s.id,
            COALESCE(s.x, 0),
            COALESCE(s.y, 0),
            COALESCE(s.z, 0),
            COALESCE(s."rotY", 0),
            COALESCE(s.w, 3),
            COALESCE(s.l, 3),
            COALESCE(s.h, 2.5),
            COALESCE(s."carpetColor", 3359061),
            COALESCE(s.type, 'cubierto'),
            NOW(),
            NOW()
        FROM public.stands s
        ON CONFLICT (stand_id) DO UPDATE SET
            x = EXCLUDED.x,
            y = EXCLUDED.y,
            z = EXCLUDED.z,
            rot_y = EXCLUDED.rot_y,
            w = EXCLUDED.w,
            l = EXCLUDED.l,
            h = EXCLUDED.h,
            carpet_color = EXCLUDED.carpet_color,
            type = EXCLUDED.type,
            "updatedAt" = NOW();
    END IF;
END $$;

-- 3. Limpieza de columnas geométricas en la tabla stands
ALTER TABLE public.stands
    DROP COLUMN IF EXISTS x,
    DROP COLUMN IF EXISTS y,
    DROP COLUMN IF EXISTS z,
    DROP COLUMN IF EXISTS "rotY",
    DROP COLUMN IF EXISTS w,
    DROP COLUMN IF EXISTS l,
    DROP COLUMN IF EXISTS h,
    DROP COLUMN IF EXISTS "carpetColor",
    DROP COLUMN IF EXISTS type;

-- 4. Agregar columna notas si no existe
ALTER TABLE public.stands
    ADD COLUMN IF NOT EXISTS notas TEXT;

-- 5. Asegurar integridad referencial ON DELETE SET NULL y ON UPDATE CASCADE en stands.expositorId
ALTER TABLE public.stands
    DROP CONSTRAINT IF EXISTS "stands_expositorId_fkey";

ALTER TABLE public.stands
    ADD CONSTRAINT "stands_expositorId_fkey"
        FOREIGN KEY ("expositorId")
        REFERENCES public.expositores (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;

-- 6. Sincronizar el campo stand en la tabla expositores agrupando y concatenando los IDs reales
UPDATE public.expositores e
SET stand = sub.stands_list,
    "updatedAt" = NOW()
FROM (
    SELECT "expositorId", string_agg(id, ', ' ORDER BY id) AS stands_list
    FROM public.stands
    WHERE "expositorId" IS NOT NULL
    GROUP BY "expositorId"
) sub
WHERE e.id = sub."expositorId";

COMMIT;
