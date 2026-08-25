import type { ConnectionStatus } from "../lib/dataSource";

export type DashboardView = "live" | "history";

interface HeaderProps {
  status: ConnectionStatus;
  batteryVoltage: number | null;
  activeFaultCount: number;
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  savedTestCount: number;
}

function batteryLevel(voltage: number | null): "ok" | "low" | "unknown" {
  if (voltage === null) return "unknown";
  return voltage < 7.0 ? "low" : "ok";
}

export function Header({
  status,
  batteryVoltage,
  activeFaultCount,
  view,
  onViewChange,
  savedTestCount,
}: HeaderProps) {
  const level = batteryLevel(batteryVoltage);

  return (
    <header className="app-header">
      <div className="app-header-title">
        <h1 className="page-title gradient-text">Prosthetic Dashboard</h1>
        <nav className="view-tabs">
          <button
            type="button"
            className={`view-tab ${view === "live" ? "view-tab--active" : ""}`}
            onClick={() => onViewChange("live")}
          >
            Live Test
          </button>
          <button
            type="button"
            className={`view-tab ${view === "history" ? "view-tab--active" : ""}`}
            onClick={() => onViewChange("history")}
          >
            Test History
            {savedTestCount > 0 && <span className="view-tab-count">{savedTestCount}</span>}
          </button>
        </nav>
      </div>

      <div className="app-header-status">
        <span className={`status status--${status}`}>
          {status === "connected" && <span className="status-dot" />}
          {status}
        </span>

        <span className={`status status--battery-${level}`}>
          {batteryVoltage !== null ? `${batteryVoltage.toFixed(2)} V` : "Battery —"}
        </span>

        <span className={`status ${activeFaultCount > 0 ? "status--error" : "status--disconnected"}`}>
          {activeFaultCount > 0 ? `${activeFaultCount} fault${activeFaultCount > 1 ? "s" : ""}` : "No faults"}
        </span>
      </div>
    </header>
  );
}
