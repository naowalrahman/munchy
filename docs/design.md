# Munchy: a kitchen notebook, built for repetition

Palette: paper #FFFFFF, ice #F2F5FA, blueberry #25345A, plum #76518B, cucumber #427A65, apricot #C47C3E. Blueberry text on white; plum for primary actions; the other colors identify nutrients consistently.

Typography: locally bundled IBM Plex Sans for the interface, with tabular numerals. 14/16/20/28/36px scale; regular body, medium controls, semibold headings. No remote font requests.

Layout, left aligned:

    munchy       Diary   Recipes   Insights             Settings
    Friday, September 4                  previous / date / next
    [ Search foods or pick a recent item...                ]
    [ Breakfast ][ Lunch ][ Dinner ][ Snacks ]
    ---------------------------------------------------------
    Diary, wide column                 Today, narrow column
    Meal / kcal / protein              Macro totals and goals
    compact editable food rows         Complete nutrient list
    one-click meal suggestions         Water / notes

On a phone, quick add stays close to the top, navigation stays at the bottom, and the nutrient panel follows meals. Search opens an accessible focused dialog; the keyboard can complete the entire logging path. Detailed nutrient rows are visible without accordion hunting.

Review: discarded a conventional analytics dashboard with equal cards and oversized calorie rings. Repetitive food logging needs a work surface, not a dashboard. The memorable feature is the compact portion composer: quantity, meaningful units, live nutrients, and log action on one surface. Everything else stays quiet. No animation unless it responds to a user action.

Architecture: Next static shell; browser-only components where local SQLite, events, and offline storage are required. Server Actions cannot mutate an on-device database, so the local-first requirement supersedes the former server-mutation convention. SQLite executes in a dedicated worker, persisted atomically through IndexedDB under a cross-tab Web Lock. The remote Bun proxy exposes only food search, food details, and capabilities; it never receives diary data.
