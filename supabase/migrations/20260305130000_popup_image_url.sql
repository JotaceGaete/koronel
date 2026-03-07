-- Add image_url column to popups table for welcome popup image support
ALTER TABLE public.popups
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update the existing sample popup with new content and activate it
UPDATE public.popups
SET
  title = 'Bienvenido',
  message = 'Descubre negocios, ofertas y clasificados cerca de ti.',
  button_text = 'Explorar negocios',
  button_link = '/business-directory-listing',
  active = true,
  updated_at = CURRENT_TIMESTAMP
WHERE button_link = '/business-directory-listing'
  AND title = 'Bienvenido a CoronelLocal';
