# Prosthetic Test-Data Dashboard

## Step 1 — connection layer

- `src/lib/dataSource.ts` — shared `DataSource` interface. Both the real
  connection and the fake one implement this, so the rest of the app
  never has to know which one it's talking to.
- `src/lib/serialConnection.ts` — wraps the Web Serial API: device picker,
  opening the port, reading newline-delimited text off the wire.
- `src/lib/mockDataSource.ts` — a fake device on the same interface. Emits
  realistic JSON telemetry lines (FSR, battery voltage, per-actuator
  current/position/PWM, and an occasional simulated fault) roughly 6-7
  times a second, with no hardware required.
- `src/lib/telemetry.ts` — the placeholder `TelemetryFrame` shape and a
  JSON line parser. Still a guess at the firmware's real format.

## Step 2 — dashboard layout

Live Test view: header, connection bar, test controls, FSR/battery
charts, per-actuator tabs (small-multiples grid or one actuator in
detail), parameter tuning, and a status/event panel.

## Step 3 — polish + Test History

**Visual polish**, all on the Apple design tokens in `src/index.css`:

- Two-column dashboard layout on wider screens — live charts as the main
  column, connection/parameters/status as a sticky side rail — instead of
  one long stack of cards.
- Gradient brand title, a pulsing dot on "connected" status, gradient
  area fills under every chart line, and a subtle fade-up entrance
  animation on cards.
- Hover-lift on the actuator mini-cards for a livelier, more tactile
  feel.

**Test History**, built on top of the recording/save flow:

- `src/lib/savedTests.ts` — saved tests persist to `localStorage` (no
  backend yet, per the blueprint's assumption). This is the only file
  that knows the storage key.
- `src/lib/csvExport.ts` — exports one saved test to CSV, one row per
  sample index and one column per channel.
- `components/MultiLineChart.tsx` — overlays two series on shared axes,
  used to compare the same channel across two saved tests.
- `components/TestHistoryView.tsx` — the saved test list; select one for
  a detail view (charts, parameter snapshot, event log, CSV export), or
  two for a side-by-side comparison (overlaid charts per channel, an
  actuator-focus selector limited to actuators both tests share, and a
  parameter diff table that highlights differing values). Comparison is
  capped at two tests — more than that gets visually unreadable fast.

**How a test gets saved:** while a test is running, samples are recorded
into a separate uncapped buffer (`recordingRef` in `App.tsx`) — not the
same rolling window the live charts use, which is capped and would lose
early samples on anything but a short test. Stopping a test freezes that
recording and shows a **Save Test / Discard** prompt in the test control
bar before anything is written to history, matching the blueprint's
stopped-state workflow.

Actuator IDs (`thumb`, `fingers`, `wrist1`, `wrist2`) are still
placeholders, defined in `mockDataSource.ts` and reused throughout the
UI. Swap them for the real actuator names once known.

## Running it

```
npm install
npm run dev
```

Open the local URL in **Chrome or Edge**. Click **Use Simulated Device**
to see the dashboard working immediately with fake data, or
**Connect Device** for a real serial connection (Web Serial isn't
supported in Safari or Firefox, and only works over HTTPS or localhost).

## Known unknowns to confirm before going further

- **Baud rate** and **serial data format** — still unconfirmed against
  the real firmware.
- **Fault message format** — the mock's `"<Actuator>: simulated
  overcurrent"` string is a placeholder; fault-to-actuator matching in
  the status chips relies on that exact shape via a text match, which
  should become a structured field once the real format is known.
- **Outbound parameter writes** — "Apply" in the parameter panel still
  only updates local state and logs an event. Sending parameters to the
  real device needs the firmware's command protocol.
- **Sample rate / timing** — CSV export and saved-test charts use sample
  index as the x-axis, not real elapsed time, since the real device's
  sample rate isn't confirmed yet.

## Next step

With the core workflow (connect → test → save → compare → export) now
complete end to end against simulated data, the next real milestone is
swapping the placeholders for the actual firmware: confirmed serial
format, real actuator names, real fault structure, and the outbound
command protocol for parameter writes.
