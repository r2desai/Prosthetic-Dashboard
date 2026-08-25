/**
 * Placeholder shape for one telemetry sample from the microcontroller,
 * guessed from the dashboard blueprint's data list. Nothing downstream
 * should assume this is final — swap it out once we know what the
 * firmware actually sends over serial, and this is the only file that
 * should need to change.
 */
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

/**
 * Attempts to parse one line of serial output as a JSON telemetry frame.
 * Returns null instead of throwing so a malformed or unrelated line
 * (e.g. a firmware boot message) doesn't take down the read loop —
 * the caller decides whether to log it, count it, or ignore it.
 */
export function parseTelemetryLine(line: string): TelemetryFrame | null {
  try {
    const parsed = JSON.parse(line);
    return { timestamp: Date.now(), ...parsed };
  } catch {
    return null;
  }
}
