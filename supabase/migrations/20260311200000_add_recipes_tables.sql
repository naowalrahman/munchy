-- Custom recipes feature: recipes, recipe_ingredients, food_log_recipe_ingredients
-- and recipe metadata on food_logs

-- recipes: user-owned reusable recipes with aggregated nutrition
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  servings numeric not null default 1 check (servings > 0),
  calories numeric not null default 0,
  protein numeric,
  carbohydrates numeric,
  total_fat numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on public.recipes(user_id);

-- recipe_ingredients: ingredients that make up a recipe (source definition)
create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_fdc_id bigint not null,
  food_description text not null,
  serving_amount numeric not null,
  serving_unit text not null default 'g',
  calories numeric not null default 0,
  protein numeric,
  carbohydrates numeric,
  total_fat numeric,
  barcode text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients(recipe_id);

-- food_logs: add recipe_id and source discriminator for recipe log entries
alter table public.food_logs add column if not exists recipe_id uuid references public.recipes(id) on delete set null;
alter table public.food_logs add column if not exists entry_type text default 'food' check (entry_type in ('food', 'recipe'));

create index if not exists food_logs_recipe_id_idx on public.food_logs(recipe_id);

-- food_log_recipe_ingredients: per-log snapshot of recipe ingredients (for expand/collapse and per-entry edits)
create table if not exists public.food_log_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  food_log_id uuid not null references public.food_logs(id) on delete cascade,
  food_fdc_id bigint not null,
  food_description text not null,
  serving_amount numeric not null,
  serving_unit text not null default 'g',
  calories numeric not null default 0,
  protein numeric,
  carbohydrates numeric,
  total_fat numeric,
  barcode text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists food_log_recipe_ingredients_food_log_id_idx on public.food_log_recipe_ingredients(food_log_id);

-- RLS for recipes
alter table public.recipes enable row level security;

create policy "Users can view own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);

create policy "Users can insert own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on public.recipes for update
  using (auth.uid() = user_id);

create policy "Users can delete own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);

-- RLS for recipe_ingredients (via recipe ownership)
alter table public.recipe_ingredients enable row level security;

create policy "Users can view ingredients of own recipes"
  on public.recipe_ingredients for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

create policy "Users can insert ingredients to own recipes"
  on public.recipe_ingredients for insert
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

create policy "Users can update ingredients of own recipes"
  on public.recipe_ingredients for update
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

create policy "Users can delete ingredients of own recipes"
  on public.recipe_ingredients for delete
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

-- RLS for food_log_recipe_ingredients (via food_log ownership)
alter table public.food_log_recipe_ingredients enable row level security;

create policy "Users can view logged recipe ingredients of own food logs"
  on public.food_log_recipe_ingredients for select
  using (
    exists (
      select 1 from public.food_logs fl
      where fl.id = food_log_id and fl.user_id = auth.uid()
    )
  );

create policy "Users can insert logged recipe ingredients to own food logs"
  on public.food_log_recipe_ingredients for insert
  with check (
    exists (
      select 1 from public.food_logs fl
      where fl.id = food_log_id and fl.user_id = auth.uid()
    )
  );

create policy "Users can update logged recipe ingredients of own food logs"
  on public.food_log_recipe_ingredients for update
  using (
    exists (
      select 1 from public.food_logs fl
      where fl.id = food_log_id and fl.user_id = auth.uid()
    )
  );

create policy "Users can delete logged recipe ingredients of own food logs"
  on public.food_log_recipe_ingredients for delete
  using (
    exists (
      select 1 from public.food_logs fl
      where fl.id = food_log_id and fl.user_id = auth.uid()
    )
  );
