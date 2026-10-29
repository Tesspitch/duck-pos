# Catalog Enhancement — Apply Toppings to Category

**Status:** Complete

## Behavior

- Owner can apply one option group and all of its toppings to every other product in the same category
- Matching is case-insensitive by trimmed group/topping name
- Existing matching groups and toppings are updated from the source
- Missing groups and toppings are inserted
- Target-only toppings are preserved; the operation never deletes catalog data
- Repeating the operation is idempotent and does not create additional matching records
- Products in other categories and shops are untouched

## Security and integrity

- One server-side RPC performs the entire merge atomically
- Active Owner permission is checked on the server
- Source group, source product and category are derived from PostgreSQL rather than trusted client input
- A single audit event records target and insert/update counts

## Performance

- Catalog sizes are expected to be small for the MVP; target products and options are processed in deterministic locked order
- The catalog query cache is invalidated once after the complete operation

## Verification

- Production migration `202610290017_apply_toppings_to_category.sql` applied successfully
- Production pgTAP tests passed 11/11 and rolled test data back
- Local build, lint and unit tests passed (14/14 unit tests)
- The action is visible without console errors at mobile (390 px) and tablet (1024 px) widths
- With only one product in the category, the action is disabled as expected
- The live catalog action was not clicked during smoke testing to avoid changing real shop data
