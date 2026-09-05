# Prosthetic Test-Data Dashboard

## 1 — connection layer

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
  JSON line parser. Guesses hand's real format.

## 2 — dashboard layout

Live Test view: header, connection bar, test controls, FSR/battery
charts, per-actuator tabs (small-multiples grid or one actuator in
detail), parameter tuning, and a status/event panel.

## 3 — polish + Test History

**Test History**, built on top of the recording/save flow:

- `src/lib/savedTests.ts` — saved tests persist to `localStorage`. This is the only file
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
  capped at two tests, more than that gets visually unreadable fast.

**Saving a test:** while a test is running, samples are recorded
into a separate uncapped buffer (`recordingRef` in `App.tsx`) and not the
same rolling window the live charts use, which is capped and would lose
early samples on anything but a short test. Stopping a test freezes that
recording and shows a **Save Test / Discard** prompt in the test control
bar before anything is written to history, matching the blueprint's
stopped-state workflow.

## Using it

Run it on a browser then click **Use Simulated Device**
to see the dashboard working immediately with fake data, or
**Connect Device** for a real serial connection (Web Serial isn't
supported in Safari or Firefox, and only works over HTTPS or localhost).

