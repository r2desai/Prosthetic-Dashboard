export type EventType = "fault" | "test" | "param";

export interface EventLogEntry {
  id: number;
  timestamp: number;
  type: EventType;
  message: string;
}
