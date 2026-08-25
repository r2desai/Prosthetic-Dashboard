import { LineChart } from "./LineChart";

interface GlobalTelemetryRowProps {
  fsrHistory: number[];
  batteryHistory: number[];
}

export function GlobalTelemetryRow({ fsrHistory, batteryHistory }: GlobalTelemetryRowProps) {
  return (
    <section className="card global-telemetry-row">
      <div className="chart-grid chart-grid--2">
        <LineChart data={fsrHistory} label="FSR input" unit="" color="var(--accent-blue)" min={0} max={100} />
        <LineChart
          data={batteryHistory}
          label="Battery voltage"
          unit=" V"
          color="var(--accent-green)"
          min={6}
          max={9}
        />
      </div>
    </section>
  );
}
