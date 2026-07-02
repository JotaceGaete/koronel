-- Categorías: separa el tipo (business/classified_ad/event) y permite
-- categorías propias por ciudad (city_id NULL = catálogo global compartido).
-- Depende de 20260601000001_create_community_cities.sql (FK).
-- No depende de A2/A3. No toca ninguna política RLS de categories.
-- Ver docs/diseno-multi-ciudad.md y docs/plan-fase-a-b.md.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS category_type TEXT NOT NULL DEFAULT 'business'
    CHECK (category_type IN ('business', 'classified_ad', 'event')),
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.community_cities(id);

CREATE INDEX IF NOT EXISTS idx_categories_category_type ON public.categories(category_type);
CREATE INDEX IF NOT EXISTS idx_categories_city_id ON public.categories(city_id);

-- Las ~40 filas existentes quedan category_type='business' (correcto, son
-- todas de negocio) y city_id=NULL (correcto: catálogo global compartido).
-- Verificado en docs/plan-fase-a-b.md que categories.name_key tiene UNIQUE
-- desde la migración inicial, sin alterar desde entonces.
