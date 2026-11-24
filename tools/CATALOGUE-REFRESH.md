# Parts catalogue: daily refresh

The draft theme's parts list (`assets/cx-data-catalog.json`: every product, price, sale price, stock label, the cars it fits)
is rebuilt from the store every day, so cards, search, the finder and the one-time offer stay current.
Product pages and checkout already read live data; this keeps the lists in step with them.

## Where it runs
GitHub Actions, repo `milkyano-cpu/iilumolab-revamp`, workflow **Catalogue refresh (iilumolab draft)**
(`.github/workflows/catalogue-refresh.yml`), every day at about 5am Melbourne time.

It only ever pushes `assets/cx-data-catalog.json`, only to draft theme #168316534946, always with `--nodelete`.
If that theme is ever published (or deleted) the job stops by itself: switching it to the live theme is a deliberate edit.

## Secrets it needs (repo Settings > Secrets and variables > Actions)
| Secret | What | Required |
|---|---|---|
| `SHOPIFY_CLI_THEME_TOKEN` | Theme Access password (Theme Access app > Create theme password) | yes |
| `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` | Admin API app made by the store owner in the Dev Dashboard, scopes `read_products`, `read_inventory`, installed on the store | no, but better |

Without the Admin API keys it reads the public storefront (about 350 requests, a second apart). With them it makes one
bulk export and no storefront requests, so the store's bot protection can never block it.

## Run it by hand
- On GitHub: Actions > Catalogue refresh > **Run workflow**. Tick *dry run* to build and check without pushing.
- On the Mac (uses your Shopify CLI login):

      python3 tools/refresh_catalog.py              # build, check, push, confirm
      python3 tools/refresh_catalog.py --dry-run    # build and check only

## How you know it failed
- GitHub emails you when a run fails (Settings > Notifications > Actions, on by default for workflows you set up).
- The run page shows a red cross and a summary at the top: what it saw and why it stopped.
- A failed run never touches the theme: the last good catalogue stays up.
- The `built` stamp in the catalogue (open `assets/cx-data-catalog.json` on the draft, last field) shows the last good build.

## Why a run stops instead of pushing
The store blocked the requests (403), a sign-in failed, or the new catalogue looks wrong next to the current one:
10%+ fewer parts or fitted parts, a car losing more than half its parts, stock missing, Sold out / Pre-order shares jumping
by 15+ points, cars removed, or the BMW M2 G87 DRL modules gone. If the change is real (the client removed a range),
run it once by hand with **accept** ticked. The format and DRL checks still apply.

## Not covered
New cars in the Vehicles menu still need `tools/build_vehicles.py` and the theme's finder update by hand.
After this job is live, don't push the local `iilumolab-theme/assets/cx-data-catalog.json`: it will be older than the draft's.
