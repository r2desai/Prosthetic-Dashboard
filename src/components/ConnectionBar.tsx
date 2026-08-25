import type { ConnectionStatus } from "../lib/dataSource";

interface ConnectionBarProps {
  status: ConnectionStatus;
  baudRate: number;
  setBaudRate: (rate: number) => void;
  onConnectReal: () => void;
  onConnectMock: () => void;
  onDisconnect: () => void;
  errorMessage: string | null;
  activeSource: "real" | "mock" | null;
}

export function ConnectionBar({
  status,
  baudRate,
  setBaudRate,
  onConnectReal,
  onConnectMock,
  onDisconnect,
  errorMessage,
  activeSource,
}: ConnectionBarProps) {
  const isBusy = status === "connecting";
  const isConnected = status === "connected";

  return (
    <section className="card connection-bar">
      <div className="control-row">
        <label className="field">
          Baud rate
          <input
            type="number"
            value={baudRate}
            disabled={isConnected || isBusy}
            onChange={(e) => setBaudRate(Number(e.target.value))}
          />
        </label>

        {isConnected ? (
          <>
            <span className="connection-bar-source">
              Source: {activeSource === "mock" ? "simulated device" : "real device"}
            </span>
            <button className="btn btn-secondary" onClick={onDisconnect}>
              Disconnect
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary" onClick={onConnectReal} disabled={isBusy}>
              {isBusy && activeSource === "real" ? "Connecting…" : "Connect Device"}
            </button>
            <button className="btn btn-ghost" onClick={onConnectMock} disabled={isBusy}>
              {isBusy && activeSource === "mock" ? "Connecting…" : "Use Simulated Device"}
            </button>
          </>
        )}
      </div>

      {errorMessage && <p className="error">{errorMessage}</p>}
    </section>
  );
}
