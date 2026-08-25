import type { ConnectionStatus, DataSource, DataSourceOptions } from "./dataSource";

export const MOCK_ACTUATORS = [
  { id: "thumb", label: "Thumb" },
  { id: "fingers", label: "Fingers" },
  { id: "wrist1", label: "Wrist 1" },
  { id: "wrist2", label: "Wrist 2" },
] as const;

export type MockActuatorId = (typeof MOCK_ACTUATORS)[number]["id"];

const TICK_MS = 150;
const FAULT_INTERVAL_TICKS = Math.round(15000 / TICK_MS); // roughly one simulated fault every 15s


export class MockDataSource implements DataSource {
  private status: ConnectionStatus = "disconnected";
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private batteryVoltage = 8.2;
  private options: DataSourceOptions;

  constructor(options: DataSourceOptions = {}) {
    this.options = options;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.options.onStatusChange?.(status);
  }

  async connect(): Promise<void> {
    this.setStatus("connecting");
    await new Promise((resolve) => setTimeout(resolve, 400));
    this.setStatus("connected");
    this.intervalId = setInterval(() => this.emitFrame(), TICK_MS);
  }

  async disconnect(): Promise<void> {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.setStatus("disconnected");
  }

  private emitFrame(): void {
    this.tick += 1;

    this.batteryVoltage = Math.max(
      6.4,
      this.batteryVoltage - 0.00015 + (Math.random() - 0.5) * 0.002
    );

    const fsr = Math.max(0, 40 + 35 * Math.sin(this.tick / 12) + (Math.random() - 0.5) * 8);

    const actuators: Record<string, { current: number; position: number; pwm: number }> = {};
    MOCK_ACTUATORS.forEach((actuator, i) => {
      const phase = this.tick / 15 + i * 1.3;
      const position = 50 + 45 * Math.sin(phase);
      const current = 60 + 40 * Math.abs(Math.sin(phase)) + Math.random() * 15;
      actuators[actuator.id] = {
        current: Math.round(current),
        position: Math.round(position),
        pwm: Math.round(position * 2.55),
      };
    });

    let fault: string | undefined;
    if (this.tick % FAULT_INTERVAL_TICKS === 0) {
      const actuator = MOCK_ACTUATORS[Math.floor(Math.random() * MOCK_ACTUATORS.length)];
      fault = `${actuator.label}: simulated overcurrent`;
    }

    const frame = {
      fsr: Math.round(fsr),
      batteryVoltage: Number(this.batteryVoltage.toFixed(2)),
      actuators,
      ...(fault ? { fault } : {}),
    };

    this.options.onLine?.(JSON.stringify(frame));
  }
}
