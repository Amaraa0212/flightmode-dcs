# FlightMode DCS

Check-in counter app (React 19 + Vite + TanStack Router/Query/Table + shadcn), structured like `xmeta-admin`.
Talks to `../flightmode-api` (`/api/v1/dcs/*`) with a Sanctum Bearer token.

## Run

```bash
# 1. API
cd ../flightmode-api
php artisan migrate --seed
php artisan db:seed --class=DcsDemoSeeder   # demo UBN departures, re-run any time to reset
php artisan serve                            # http://localhost:8000
php artisan reverb:start                     # ws://localhost:8090 — live updates between counters

# 2. DCS
cd ../flightmode-dcs
pnpm install
pnpm dev                                     # http://localhost:5175 (proxies /api → :8000)
```

Demo login: `DCS_DEMO_EMAIL` / `DCS_DEMO_PASSWORD` from `flightmode-api/.env.example`.

## Config

| Variable | Default | |
|---|---|---|
| `VITE_API_URL` | `/api/v1` | API base (absolute URL in production) |
| `VITE_API_PROXY_TARGET` | `http://localhost:8000` | Vite dev proxy target |
| `VITE_REVERB_APP_KEY` | — | Reverb client key (= API `REVERB_APP_KEY`); empty → live updates off. Put it in `.env.local` |
| `VITE_REVERB_HOST` / `PORT` / `SCHEME` | page host / `8090` / `http` | Reverb websocket |

## Structure

```
src/
├── services/
│   ├── api/shared/client.ts     axios + Bearer token + 401 → sign-in, ApiError
│   ├── api/dcs/dcs.service.ts   every DCS endpoint
│   ├── api/dcs/adapters.ts      API JSON → UI types
│   ├── types/dcs/api.types.ts   raw flightmode-api resources
│   └── types/dcs/dcs.types.ts   UI types
├── features/departures/         departures board
└── features/flight-checkin/     counter workspace: Passengers | General Info | Baggages Info | Seat Map
```

The API returns full lists for a flight (no pagination); search / filters / pages run client side
(`services/lib/list.ts`).

## Counter features

- **Live**: `useFlightChannel` listens on `private-dcs.flight.{id}`; any check-in, seat, bag, group or status change
  reloads the passenger / baggage / seat queries (badge in the flight bar). The flight bar figures (booked, checked in,
  boarded, infants, waitlist, bags) are loaded once with the flight and then taken from the event's `statistics`
  (`FlightStatistics::summary`) — the flight itself is reloaded only on `flight.*` events, check-in open/close or
  Ctrl+R. With the channel off, DCS actions reload the flight as before.
- **Printing** — same as the legacy DCS: QZ Tray on the counter PC prints straight to the thermal printers
  (`lib/qz.ts`, `lib/print-jobs.ts`). Designs are the legacy ones (`lib/print-templates.ts`): 80 mm boarding pass
  with a QR of the IATA BCBP string, 51 mm bag tag with CODE128. Printer names are set per PC from the **QZ** chip
  in the flight bar (defaults `Printer POS-80`, `PrinterBagTag` → `BTP`). Without QZ Tray the browser print dialog
  opens instead.
  - Seat map: click a free seat, press **Enter** → check in / move to that seat and print the boarding pass.
    Enter with no picked seat: auto seat (booked) or reprint (checked in). **Esc** drops the pick.
  - The seat map marks the load zones (a "Zone B" divider where the zone changes) and the emergency exit rows
    (orange seats + arrows on both sides, like the legacy `em_class`). Both come from the aircraft seats
    (`zone`, `is_emergency_exit`); the demo seeder marks the over-wing rows (B737 14-15, E190 12).
  - Bag tags print right after a bag is accepted.
  - Bags can be accepted before the check-in (booked or checked-in passengers, not banned). The first bag gives the
    passenger their boarding sequence (it is in the tag number) and the check-in keeps it. A passenger with bags
    cannot be un-checked, cancelled, waitlisted or rebooked until the bags are removed.
  - **Manifest** (button under the passenger list) — the legacy dialog and print: W&B seatmap (load per zone),
    Passenger Manifest and Baggage Manifest of the checked-in passengers, copies of each (default 3 / 5 / 5),
    "Үйлдсэн" printed as PREPARED BY. Design carried over from flightmodev2 `passenger_man.blade.php`
    (`lib/manifest-template.ts`); data from `GET /dcs/flights/{id}/documents/manifest` (`ManifestService`).
    The dialog also downloads the Excel version.
  - QZ requests are signed by the API (`/dcs/qz/certificate`, `/dcs/qz/sign`); the key lives in
    `flightmode-api/storage/app/private/qz/` (`QZ_CERTIFICATE_PATH` / `QZ_PRIVATE_KEY_PATH`).
- **Keyboard shortcuts** — the legacy DCS ones (`features/flight-checkin/shortcuts.ts`; the keyboard chip in the
  flight bar lists them). Matched by physical key, so they also work with the Cyrillic layout; none fire while a
  dialog is open.

  | Key | Command |
  |---|---|
  | Ctrl/Cmd+S | Search passengers |
  | Ctrl/Cmd+R | Refresh — clears the passenger and the search, back to the passenger view |
  | Ctrl/Cmd+E / D | Passenger view / Baggage view |
  | Ctrl/Cmd+V | Print boarding pass (in a text field it still pastes) |
  | Ctrl/Cmd+B | Baggage weight input (Enter accepts the bag and prints the tag) |
  | Ctrl/Cmd+1-9 | Reprint the tags of bag no. 1-9 of the passenger |
  | Ctrl/Cmd+P | Check in & print — same as Enter on the seat map |
  | Ctrl/Cmd+G | Group the ticked passengers |
  | Alt+↓ / Alt+↑ | Next / previous passenger in the list |
  | Esc | Leave a text field; otherwise close the passenger |

  A panel registers its own command with `useCommand(id, handler)`; return `false` to leave the key to the browser.
- **Passenger log** (legacy PassengerLogModal "Зорчигчийн үйлдлийн түүх"): the list icon at the end of every
  passenger row, or "View all" under General Info → Activity, shows every action on the passenger, newest first —
  action, time, where (counter / gate / online / admin), description, user (`GET /dcs/passengers/{id}/activity`).
  Infant actions are logged on the accompanying adult.
- **Prices** come from the API (`POST /dcs/segments/{id}/baggage/quote`); the counter never calculates them.
