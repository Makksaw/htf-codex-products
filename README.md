# Codex of products

A Delhaize shelf for Hack the Future 2026. The Dutch CSV is the catalog. The app turns it into a typed product feed, then a shopper (or the assistant) fills a basket from that feed.

The same selector runs twice: once on the raw cells, once on the enriched feed. Only the data changes.

## Run

```bash
cd app
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

The assistant needs a key in `app/.env` (gitignored):

```
REACT_APP_GROK_API_KEY=your-key
```

Restart `npm start` after you change it. The dev server proxies `/api/grok` to `https://api.x.ai`. The browser never sees the key.

## Shop

- Shelf, categories, and search. Product names stay Dutch.
- The assistant sits at the bottom. Its default job is filling the fridge. It plans meals only when you ask.
- It offers two baskets: a cheaper shop and a fuller one. **Use this basket** copies one into the drawer.
- Quantities are steppers. The basket is stored in `localStorage` under `delhaize-basket`.
- **Order now** asks whether the next shop should include that order.
- Voice types into the box through the browser. It does not send audio.

## Data

`initial_data/codex-producten_hackTheFuture.csv` is the source of truth: 73 products, semicolon-separated, UTF-8.

`initial_data/codex-producten_hackTheFuture.json` is a partial English translation of a few rows. It is not the catalog and is not merged into the CSV.

Allergens come from the label cell and a scan of the ingredients. An empty label stays unknown. Nothing is invented to fill a gap.

From `app/`:

```bash
npm run codex
```

That rebuilds the feed and checks the ten assignments:

- `app/src/data/rows.json` — parsed CSV rows
- `codex-enriched.json` and `app/public/codex-enriched.json` — the enriched feed

`select()` is shared. `raw` reads the original cells, so `parseFloat("1,19")` stops at the comma. `restored` reads the typed price, allergens, diet, and duplicates. The check expects the raw pick to fail the assignment and the restored pick to pass, except the organic case, which is safe both ways.

The assignments live in `app/src/lib/missions.js`. They are the test set, not a page on the shop.

## Layout

```
initial_data/           CSV and the partial JSON
codex-enriched.json     generated feed
app/src/lib/engine.js   enrichment, select, judge
app/src/lib/askMeal.js  assistant contract (grok-4.3)
app/src/lib/missions.js ten assignments
app/src/setupProxy.js   /api/grok → api.x.ai
app/scripts/check.cjs   npm run codex
app/public/products/    one photo per SKU
```
