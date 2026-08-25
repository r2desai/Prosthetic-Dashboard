import type { ConnectionStatus, DataSource, DataSourceOptions } from "./dataSource";

export interface SerialConnectionOptions extends DataSourceOptions {
  baudRate?: number;
}

const DEFAULT_BAUD_RATE = 115200;

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
      this.readLoop(); 
    } catch (err) {
      this.setStatus("error");
      this.options.onError?.(err as Error);
      throw err;
    }
  }
 async disconnect(): Promise<void> {
    try {
      await this.reader?.cancel();
    } catch {
    
    }
    try {
      await this.readableClosed;
    } catch {
    
    }
    try {
      await this.port?.close();
    } catch {
    
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
