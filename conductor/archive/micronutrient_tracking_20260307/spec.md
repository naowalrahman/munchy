# Track Specification: Micronutrient Tracking & Caching

## Overview
This track focuses on expanding the nutritional data available to users beyond basic macronutrients (Calories, Protein, Fat, Carbs) to include detailed micronutrients (Fiber, Sodium, Potassium, Vitamins, etc.). It also implements a caching mechanism for favorited items to ensure high performance and reduce API latency.

## Objectives
- **Detailed Nutrition:** Fetch and display a wider range of nutritional data from the USDA API.
- **Improved Performance:** Cache nutrient details for favorited items in Supabase to avoid redundant API calls.
- **Enhanced UI:** Update the food details and logging interface to present this data in a clean, professional, and accessible manner.

## Tech Stack Changes
- **Database (Supabase):**
    - Update the `food_logs` table (or associated nutrients table) to store detailed micronutrients as JSONB or individual columns.
    - Update the `favorites` table to include a `nutrient_cache` column (JSONB) or link to a shared `nutrient_definitions` table.
- **API (USDA FoodData Central):**
    - Update fetch logic in `src/app/actions/food.ts` (or relevant action) to request and parse the full `labelNutrients` or `foodNutrients` list.
- **Validation (Zod):**
    - Update Zod schemas to include optional micronutrient fields.

## Requirements

### 1. Data Layer
- **USDA Integration:** Enhance the USDA API wrapper to include a `full_nutrients` flag that fetches all available nutritional data.
- **Nutrient Mapping:** Map USDA nutrient IDs to internal human-readable labels (e.g., ID 307 -> "Sodium").
- **Caching Logic:** When a user favorites a food item, fetch its full nutrient profile and store it in the `favorites` table's `nutrient_cache` field.

### 2. Implementation Flow
- **Logging:** When a user logs a food item, if it's already in the "favorites" cache, use the cached values. Otherwise, fetch from USDA and store the full profile with the log.
- **Schema Update:** Create a Supabase migration to add necessary columns/tables.

### 3. User Interface (UI/UX)
- **Detailed View:** Update the `NutritionFactsDrawer.tsx` (or similar) to display micronutrients.
- **Mobile Experience:** Ensure the list of micronutrients is collapsible or scrollable on mobile to avoid overwhelming the user. Use clear visual hierarchy (macros on top, micros below).
- **Favorites Integration:** Surface cached data instantly when viewing a favorite item.

## Quality Standards
- **Test-Driven Development:** Write unit tests for the USDA nutrient parser and the caching service before implementation.
- **Coverage:** Maintain >80% coverage for the new logic.
- **Accessibility:** Ensure all nutrient labels and values are readable and accessible according to WCAG standards (as per `product-guidelines.md`).
