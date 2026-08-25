export interface TelemetryFrame {
  timestamp: number;
  fsr?: number;
  batteryVoltage?: number;
  actuators?: Record<
    string,
    {
      current?: number;
      position?: number;
      pwm?: number;
    }
  >;
  fault?: string;
}

export function parseTelemetryLine(line: string): TelemetryFrame | null {
  try {
    const parsed = JSON.parse(line);
    return { timestamp: Date.now(), ...parsed };
  } catch {
    return null;
  }
}
