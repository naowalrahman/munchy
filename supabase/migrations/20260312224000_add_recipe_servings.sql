-- Add servings to recipes (how many servings the recipe makes)
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS servings INTEGER NOT NULL DEFAULT 1;

-- Add servings_consumed to food_logs for recipe groups
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS servings_consumed DOUBLE PRECISION DEFAULT 1;
