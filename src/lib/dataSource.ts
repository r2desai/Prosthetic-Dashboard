export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface DataSourceOptions {
  onLine?: (line: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: Error) => void;
}

/**
 * Anything that can hand the app a live stream of telemetry lines —
 * a real serial port or a simulated one — implements this. The rest of
 * the app only ever talks to this interface, so swapping the mock for
 * the real device later is a one-line change, not a rewrite.
 */
export interface DataSource {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): ConnectionStatus;
}
