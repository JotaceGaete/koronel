-- Clear all seeded/demo categories so admin can create their own
-- This removes all categories inserted by the hierarchy migration seed
-- Businesses with category_id will have it set to NULL (ON DELETE SET NULL)

DELETE FROM public.categories;
