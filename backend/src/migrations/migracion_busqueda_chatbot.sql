BEGIN;

-- 1. Extensión de trigramas
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Índices GIN trigram por columna buscable
--    `gin_trgm_ops` soporta tanto `LIKE` como `ILIKE`.

-- Noticias: título, descripción y categoría
CREATE INDEX IF NOT EXISTS "noticias_titulo_trgm" ON public.noticias USING GIN ("titulo" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "noticias_descripcion_trgm" ON public.noticias USING GIN ("descripcion" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "noticias_categoria_trgm" ON public.noticias USING GIN ("categoria" gin_trgm_ops);

-- Agenda: título, descripción, lugar, disertante y etiqueta
CREATE INDEX IF NOT EXISTS "agenda_titulo_trgm" ON public.agenda USING GIN ("titulo" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "agenda_descripcion_trgm" ON public.agenda USING GIN ("descripcion" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "agenda_lugar_trgm" ON public.agenda USING GIN ("lugar" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "agenda_disertante_trgm" ON public.agenda USING GIN ("disertante" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "agenda_etiqueta_trgm" ON public.agenda USING GIN ("etiqueta" gin_trgm_ops);

-- Ejes temáticos: nombre y descripción
CREATE INDEX IF NOT EXISTS "ejes_nombre_trgm" ON public.ejes USING GIN ("nombre" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "ejes_descripcion_trgm" ON public.ejes USING GIN ("descripcion" gin_trgm_ops);

-- Expositores: nombre, descripción, subtítulo, categoría y origen
CREATE INDEX IF NOT EXISTS "expositores_name_trgm" ON public.expositores USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "expositores_description_trgm" ON public.expositores USING GIN ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "expositores_subtitle_trgm" ON public.expositores USING GIN ("subtitle" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "expositores_category_trgm" ON public.expositores USING GIN ("category" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "expositores_origin_trgm" ON public.expositores USING GIN ("origin" gin_trgm_ops);

-- Galería: título, descripción y sección
CREATE INDEX IF NOT EXISTS "galeria_titulo_trgm" ON public.galeria USING GIN ("titulo" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "galeria_descripcion_trgm" ON public.galeria USING GIN ("descripcion" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "galeria_seccion_trgm" ON public.galeria USING GIN ("seccion" gin_trgm_ops);

COMMIT;

-- Estadísticas actualizadas para que el planificador use los índices.
ANALYZE public.noticias;

ANALYZE public.agenda;

ANALYZE public.ejes;

ANALYZE public.expositores;

ANALYZE public.galeria;