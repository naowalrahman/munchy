-- Drop orphaned tables from a previous recipe implementation
-- These are no longer used by the application

DROP TABLE IF EXISTS public.food_log_recipe_ingredients;
DROP TABLE IF EXISTS public.recipe_ingredients;
