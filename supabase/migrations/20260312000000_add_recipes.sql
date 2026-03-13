-- Create recipes table
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create recipe_items table
CREATE TABLE IF NOT EXISTS public.recipe_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  food_fdc_id INTEGER NOT NULL,
  food_description TEXT NOT NULL,
  serving_amount DOUBLE PRECISION NOT NULL,
  serving_unit TEXT NOT NULL,
  calories DOUBLE PRECISION NOT NULL,
  protein DOUBLE PRECISION,
  carbohydrates DOUBLE PRECISION,
  total_fat DOUBLE PRECISION,
  barcode TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add recipe tracking to food_logs
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS recipe_group_id UUID;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS recipe_name TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe_id ON public.recipe_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_recipe_group_id ON public.food_logs(recipe_group_id);

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for recipes
CREATE POLICY "Users can view their own recipes"
  ON public.recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
  ON public.recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
  ON public.recipes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for recipe_items (through recipe ownership)
CREATE POLICY "Users can view their recipe items"
  ON public.recipe_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_items.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their recipe items"
  ON public.recipe_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_items.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their recipe items"
  ON public.recipe_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_items.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their recipe items"
  ON public.recipe_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_items.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- Updated_at trigger for recipes
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
