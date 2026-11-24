# Importing the spreadsheet

A one-off script loads a budget spreadsheet (one sheet per month, one or more years) into the app and checks the result against the spreadsheet's own totals.

## Requirements

- Local Supabase is running and seeded (`pnpm exec supabase start`, `pnpm exec supabase db reset`).
- `.env.local` contains `SUPABASE_SECRET_KEY` (the `SECRET_KEY` from `pnpm exec supabase status`). The key is only used by this script and never reaches the browser.

## Sheet names

Each month is one sheet named after the month, optionally followed by the year: `January 2026`, `Mai 2025`, or just `January`. Sheets without a year are imported into `--year`. Other sheets (such as `Totals`) are skipped.

## Steps

**1. Generate the category map**

```bash
pnpm import:xlsx "<path-to-xlsx>" --dry-run
```

This writes `scripts/import/category-map.json`, which lists every item name with a guessed category. The file is gitignored because it contains personal data.

**2. Review the map**

Open the file and correct any category. The values must match category names in the app, for example `"Transport"` or `"Fun & trips"`. Your edits are kept when you re-run the dry run.

**3. Import**

```bash
pnpm import:xlsx "<path-to-xlsx>"
```

The script replaces the data of every year in the file and prints a table comparing each month's **Available now** and **End forecast** with the spreadsheet. If any month differs, it exits with an error.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `--dry-run` | off | Only write the category map |
| `--year` | `2026` | Year for sheets whose name has no year |
| `--email` | `test@email.com` | User who owns the data |

## How the data is mapped

- **Income:** imported as "Salary". The regular salary is the median monthly income of that year; if a month's income is well above it, the extra becomes a one-off "Extra salary" line.
- **Opening balance:** the first month's "Start of the month" becomes the opening balance; later months carry over automatically. A later "Start of the month" is only kept as an opening balance if it differs from the previous month's result.
- **Savings and End forecast:** older sheets without these rows are treated as no savings and an end forecast equal to "Available now".
- **Paid:** a ticked checkbox counts as paid, an unticked one as unpaid, and a blank one as paid (as the spreadsheet's formulas treat it).
- **Regular bills:** items whose names match a regular bill are linked to it.
- **Dates:** the spreadsheet has no dates, so every item is dated the 1st of its month.

## Good to know

- Re-running the import is safe: it replaces the imported years each time. Run it again after `supabase db reset`, which clears all data.
- A month whose carry-over checkbox wasn't ticked yet ("From previous month" unticked, for example a month that hasn't started) shows a higher balance in the app, because the app always carries over. The script reports this as expected rather than as an error.

## Seeding instead of importing

To have the spreadsheet data come back on every `supabase db reset`, generate a seed file instead:

```bash
pnpm import:xlsx "<path-to-xlsx>" --dry-run   # review scripts/import/category-map.json first
pnpm seed:xlsx "<path-to-xlsx>"
pnpm exec supabase db reset
```

`pnpm seed:xlsx` uses the same mapping as the import, checks every month's totals against the spreadsheet, and writes `supabase/seed-data.sql`. `supabase db reset` loads it after `seed.sql`, which creates the user, categories and regular bills. The file is gitignored because it contains personal data; without it, the reset seeds only the empty account. Regenerate it after changing the spreadsheet or the category map. It accepts the same `--year` and `--email` options.
