export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface DataSourceOptions {
  onLine?: (line: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: Error) => void;
}

export interface DataSource {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): ConnectionStatus;
}
