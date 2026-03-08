# Implementation Plan: Micronutrient Tracking & Caching

## Phase 1: Database and Schema Updates [checkpoint: 974aa62]
- [x] Task: Create Supabase migration to add `nutrient_details` (JSONB) to `food_logs` table. 42b680d
- [x] Task: Create Supabase migration to add `nutrient_cache` (JSONB) to `favorites` table. e65d7fc (Note: Reverted, favorites are locally stored)
- [x] Task: Update Zod schemas in `src/components/food-search/types.ts` (or relevant file) to support detailed nutrients. f76be41
- [x] Task: Conductor - User Manual Verification 'Phase 1: Database and Schema Updates' (Protocol in workflow.md) 974aa62

## Phase 2: Enhanced USDA API Integration [checkpoint: 2ba0ae7]
- [x] Task: Write failing unit tests for the enhanced USDA nutrient parser. 135ae98
- [x] Task: Update the USDA API integration in `src/app/actions/food.ts` to fetch and parse full `foodNutrients`. 5934817
- [x] Task: Implement nutrient mapping for common micronutrients (Fiber, Sodium, Potassium, Vitamins). 156d4ff
- [x] Task: Verify tests pass and check coverage for the new parser. b266889
- [x] Task: Conductor - User Manual Verification 'Phase 2: Enhanced USDA API Integration' (Protocol in workflow.md) 2ba0ae7

## Phase 3: Nutrient Caching and Persistence [checkpoint: d6c45c7]
- [x] Task: Update `useFavorites` hook to fetch and store full nutrient data in localStorage. 3edaa71
- [x] Task: Update the food logging flow to prefer cached nutrients for favorited items when added from the favorites list. 3edaa71
- [x] Task: Verify the caching logic. 3edaa71
- [x] Task: Conductor - User Manual Verification 'Phase 3: Nutrient Caching and Persistence' (Protocol in workflow.md) d6c45c7

## Phase 4: UI Enhancements (Micronutrient Display) [checkpoint: bab6ea0]
- [x] Task: Update `NutritionFactsDrawer.tsx` to display micronutrients below the main macros. 4e107d8
- [x] Task: Ensure the micronutrients section is always shown (reverted collapsible behavior per user request). 7e95fb4
- [x] Task: Ensure the UI correctly reflects data from the new `nutrient_details` or `nutrient_cache`. 5d1c115
- [x] Task: Verify mobile responsiveness and accessibility of the new nutrient display. 5d1c115
- [x] Task: Conductor - User Manual Verification 'Phase 4: UI Enhancements' (Protocol in workflow.md) bab6ea0

## Phase 5: Final Verification & Cleanup [checkpoint: 9302324]
- [x] Task: Perform a full end-to-end test of logging a food item, favoriting it, and verifying cached data is used. 0dd2462
- [x] Task: Final check of code coverage (>80%) and linting. e38e41c
- [x] Task: Conductor - User Manual Verification 'Phase 5: Final Verification' (Protocol in workflow.md) 9302324

## Phase: Review Fixes
- [x] Task: Apply review suggestions 83e95f3
