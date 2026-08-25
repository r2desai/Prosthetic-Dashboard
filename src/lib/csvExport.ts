import type { SavedTest } from "./savedTests";

/**
 * Builds a CSV with one row per sample index and one column per channel
 * (FSR, battery, then current/position/pwm per actuator tested), and
 * triggers a browser download. Sample index stands in for time until we
 * know the real device's actual sample rate — see the dashboard's "Known
 * unknowns" notes.
 */
export function exportTestToCsv(test: SavedTest): void {
  const actuatorKeys = test.actuatorsTested;
  const rowCount = Math.max(
    test.history.fsr.length,
    test.history.battery.length,
    ...actuatorKeys.map((key) => test.history.actuators[key]?.current.length ?? 0)
  );

  const header = [
    "sample",
    "fsr",
    "battery_voltage",
    ...actuatorKeys.flatMap((key) => [`${key}_current_ma`, `${key}_position_pct`, `${key}_pwm`]),
  ];

  const rows: string[] = [header.join(",")];

  for (let i = 0; i < rowCount; i += 1) {
    const cells = [
      String(i),
      test.history.fsr[i] ?? "",
      test.history.battery[i] ?? "",
      ...actuatorKeys.flatMap((key) => {
        const actuator = test.history.actuators[key];
        return [actuator?.current[i] ?? "", actuator?.position[i] ?? "", actuator?.pwm[i] ?? ""];
      }),
    ];
    rows.push(cells.join(","));
  }

  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${test.name || "test"}-${new Date(test.startedAt).toISOString().slice(0, 19)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
