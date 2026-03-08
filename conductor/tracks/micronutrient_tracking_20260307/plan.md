# Implementation Plan: Micronutrient Tracking & Caching

## Phase 1: Database and Schema Updates
- [x] Task: Create Supabase migration to add `nutrient_details` (JSONB) to `food_logs` table. 42b680d
- [~] Task: Create Supabase migration to add `nutrient_cache` (JSONB) to `favorites` table.
- [ ] Task: Update Zod schemas in `src/components/food-search/types.ts` (or relevant file) to support detailed nutrients.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database and Schema Updates' (Protocol in workflow.md)

## Phase 2: Enhanced USDA API Integration
- [ ] Task: Write failing unit tests for the enhanced USDA nutrient parser.
- [ ] Task: Update the USDA API integration in `src/app/actions/food.ts` to fetch and parse full `foodNutrients`.
- [ ] Task: Implement nutrient mapping for common micronutrients (Fiber, Sodium, Potassium, Vitamins).
- [ ] Task: Verify tests pass and check coverage for the new parser.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Enhanced USDA API Integration' (Protocol in workflow.md)

## Phase 3: Nutrient Caching and Persistence
- [ ] Task: Write failing unit tests for the nutrient caching logic.
- [ ] Task: Update `favoriteFood` server action to fetch and store full nutrient data in `nutrient_cache`.
- [ ] Task: Update `logFood` server action to prefer cached nutrients for favorited items.
- [ ] Task: Verify tests pass and check coverage for caching logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Nutrient Caching and Persistence' (Protocol in workflow.md)

## Phase 4: UI Enhancements (Micronutrient Display)
- [ ] Task: Update `NutritionFactsDrawer.tsx` to display micronutrients below the main macros.
- [ ] Task: Implement a "Show More" / collapsible section for micronutrients to optimize for mobile.
- [ ] Task: Ensure the UI correctly reflects data from the new `nutrient_details` or `nutrient_cache`.
- [ ] Task: Verify mobile responsiveness and accessibility of the new nutrient display.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: UI Enhancements' (Protocol in workflow.md)

## Phase 5: Final Verification & Cleanup
- [ ] Task: Perform a full end-to-end test of logging a food item, favoriting it, and verifying cached data is used.
- [ ] Task: Final check of code coverage (>80%) and linting.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Verification' (Protocol in workflow.md)
