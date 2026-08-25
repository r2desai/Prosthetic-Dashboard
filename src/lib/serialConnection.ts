import type { ConnectionStatus, DataSource, DataSourceOptions } from "./dataSource";

export interface SerialConnectionOptions extends DataSourceOptions {
  /**
   * Baud rate to open the port at. 115200 is a common default for USB-serial
   * microcontroller links, but this needs to match the firmware's actual
   * UART config once we know it.
   */
  baudRate?: number;
}

const DEFAULT_BAUD_RATE = 115200;

/**
 * Thin wrapper around the Web Serial API: request a port, open it, and
 * stream newline-delimited text lines out via a callback. Deliberately
 * doesn't know anything about the telemetry format on top of that — see
 * telemetry.ts for parsing the lines this hands back.
 */
export class SerialConnection implements DataSource {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private readableClosed: Promise<void> | null = null;
  private status: ConnectionStatus = "disconnected";
  private lineBuffer = "";
  private options: SerialConnectionOptions;

  constructor(options: SerialConnectionOptions = {}) {
    this.options = options;
  }

  static isSupported(): boolean {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.options.onStatusChange?.(status);
  }

  /** Opens the browser's device picker, then opens the port the user selects. */
  async connect(): Promise<void> {
    if (!SerialConnection.isSupported()) {
      const err = new Error(
        "Web Serial API isn't available in this browser. Use Chrome or Edge, served over HTTPS or localhost."
      );
      this.setStatus("error");
      this.options.onError?.(err);
      throw err;
    }

    this.setStatus("connecting");

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: this.options.baudRate ?? DEFAULT_BAUD_RATE });

      this.port.addEventListener("disconnect", () => {
        this.setStatus("disconnected");
      });

      this.setStatus("connected");
      this.readLoop(); // runs until disconnect() is called or the device drops
    } catch (err) {
      this.setStatus("error");
      this.options.onError?.(err as Error);
      throw err;
    }
  }

  /** Closes the port and stops reading. Safe to call even if not connected. */
  async disconnect(): Promise<void> {
    try {
      await this.reader?.cancel();
    } catch {
      // reader may already be closed — nothing to do
    }
    try {
      await this.readableClosed;
    } catch {
      // pipeTo rejects when the reader is cancelled mid-read — expected here
    }
    try {
      await this.port?.close();
    } catch {
      // port may already be closed, e.g. the device was physically unplugged
    }

    this.port = null;
    this.reader = null;
    this.readableClosed = null;
    this.lineBuffer = "";
    this.setStatus("disconnected");
  }

  private async readLoop(): Promise<void> {
    if (!this.port?.readable) return;

    const textDecoder = new TextDecoderStream();
    this.readableClosed = this.port.readable
      .pipeTo(textDecoder.writable as WritableStream<Uint8Array>)
      .catch(() => {
        // expected when we cancel the reader on disconnect, or the port drops
      });
    this.reader = textDecoder.readable.getReader();

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) this.handleChunk(value);
      }
    } catch (err) {
      this.setStatus("error");
      this.options.onError?.(err as Error);
    }
  }

  /** Splits incoming text on newlines, holding onto any partial line for the next chunk. */
  private handleChunk(chunk: string): void {
    this.lineBuffer += chunk;
    const lines = this.lineBuffer.split("\n");
    this.lineBuffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0) this.options.onLine?.(trimmed);
    }
  }
}
