import { useEffect, useRef, useState } from "react";
import type { ConnectionStatus, DataSource } from "./lib/dataSource";
import { SerialConnection } from "./lib/serialConnection";
import { MockDataSource, MOCK_ACTUATORS } from "./lib/mockDataSource";
import { parseTelemetryLine } from "./lib/telemetry";
import type { EventLogEntry } from "./lib/events";
import { addSavedTest, deleteSavedTest, loadSavedTests, type SavedTest } from "./lib/savedTests";
import { Header, type DashboardView } from "./components/Header";
import { ConnectionBar } from "./components/ConnectionBar";
import { TestControlBar } from "./components/TestControlBar";
import { GlobalTelemetryRow } from "./components/GlobalTelemetryRow";
import { ActuatorPanel } from "./components/ActuatorPanel";
import { ParameterPanel, type ParamSet } from "./components/ParameterPanel";
import { SystemStatusPanel } from "./components/SystemStatusPanel";
import { TestHistoryView } from "./components/TestHistoryView";
import "./App.css";

const HISTORY_LENGTH = 60;
const FAULT_HIGHLIGHT_MS = 3000;

interface ActuatorHistory {
  current: number[];
  position: number[];
  pwm: number[];
}

interface RecordingState {
  active: boolean;
  startedAt: number;
  testName: string;
  actuatorsTested: string[];
  fsr: number[];
  battery: number[];
  actuators: Record<string, ActuatorHistory>;
  events: EventLogEntry[];
}

const DEFAULT_PARAMS: ParamSet = {
  sensitivity: 50,
  deadband: 5,
  maxMotorOutput: 200,
  currentLimit: 800,
};

function cap(values: number[]): number[] {
  return values.length > HISTORY_LENGTH ? values.slice(values.length - HISTORY_LENGTH) : values;
}

function App() {
  const dataSourceRef = useRef<DataSource | null>(null);
  const nextEventId = useRef(0);
  const recordingRef = useRef<RecordingState | null>(null);

  const [view, setView] = useState<DashboardView>("live");

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [baudRate, setBaudRate] = useState(115200);
  const [activeSource, setActiveSource] = useState<"real" | "mock" | null>(null);

  const [fsrHistory, setFsrHistory] = useState<number[]>([]);
  const [batteryHistory, setBatteryHistory] = useState<number[]>([]);
  const [actuatorHistories, setActuatorHistories] = useState<Record<string, ActuatorHistory>>({});

  const [selectedActuator, setSelectedActuator] = useState<string>("all");

  const [testName, setTestName] = useState("");
  const [selectedActuatorsForTest, setSelectedActuatorsForTest] = useState<Set<string>>(
    new Set(MOCK_ACTUATORS.map((a) => a.id))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [pendingTest, setPendingTest] = useState<SavedTest | null>(null);

  const [paramsByActuator, setParamsByActuator] = useState<Record<string, ParamSet>>(() =>
    Object.fromEntries(MOCK_ACTUATORS.map((a) => [a.id, { ...DEFAULT_PARAMS }]))
  );
  const [applyToAll, setApplyToAll] = useState(false);

  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [savedTests, setSavedTests] = useState<SavedTest[]>(() => loadSavedTests());

  useEffect(() => {
    return () => {
      dataSourceRef.current?.disconnect();
    };
  }, []);

  const pushEvent = (type: EventLogEntry["type"], message: string) => {
    nextEventId.current += 1;
    setEvents((prev) => [...prev, { id: nextEventId.current, timestamp: Date.now(), type, message }]);
  };

  const handleLine = (line: string) => {
    const frame = parseTelemetryLine(line);
    if (!frame) return;

    if (typeof frame.fsr === "number") {
      const value = frame.fsr;
      setFsrHistory((prev) => cap([...prev, value]));
    }
    if (typeof frame.batteryVoltage === "number") {
      const value = frame.batteryVoltage;
      setBatteryHistory((prev) => cap([...prev, value]));
    }
    if (frame.actuators) {
      const actuators = frame.actuators;
      setActuatorHistories((prev) => {
        const next = { ...prev };
        for (const [id, sample] of Object.entries(actuators)) {
          const existing = next[id] ?? { current: [], position: [], pwm: [] };
          next[id] = {
            current: cap([...existing.current, sample.current ?? 0]),
            position: cap([...existing.position, sample.position ?? 0]),
            pwm: cap([...existing.pwm, sample.pwm ?? 0]),
          };
        }
        return next;
      });
    }
    if (frame.fault) {
      pushEvent("fault", frame.fault);
    }

    // Recording is tracked through a ref (mutated directly, not via setState)
    // so this closure — fixed at connect() time — always sees the current
    // recording rather than a stale snapshot of component state.
    const recording = recordingRef.current;
    if (recording?.active) {
      if (typeof frame.fsr === "number") recording.fsr.push(frame.fsr);
      if (typeof frame.batteryVoltage === "number") recording.battery.push(frame.batteryVoltage);
      if (frame.actuators) {
        for (const [id, sample] of Object.entries(frame.actuators)) {
          const bucket = recording.actuators[id];
          if (!bucket) continue; // only actuators selected for this test are recorded
          bucket.current.push(sample.current ?? 0);
          bucket.position.push(sample.position ?? 0);
          bucket.pwm.push(sample.pwm ?? 0);
        }
      }
      if (frame.fault) {
        recording.events.push({
          id: recording.events.length + 1,
          timestamp: Date.now(),
          type: "fault",
          message: frame.fault,
        });
      }
    }
  };

  const startSource = async (source: DataSource, kind: "real" | "mock") => {
    setErrorMessage(null);
    setActiveSource(kind);
    dataSourceRef.current = source;
    try {
      await source.connect();
    } catch {
      // status/errorMessage already updated via the callbacks passed to the source
    }
  };

  const handleConnectReal = () => {
    startSource(
      new SerialConnection({
        baudRate,
        onStatusChange: setStatus,
        onError: (err) => setErrorMessage(err.message),
        onLine: handleLine,
      }),
      "real"
    );
  };

  const handleConnectMock = () => {
    startSource(
      new MockDataSource({
        onStatusChange: setStatus,
        onError: (err) => setErrorMessage(err.message),
        onLine: handleLine,
      }),
      "mock"
    );
  };

  const handleDisconnect = async () => {
    await dataSourceRef.current?.disconnect();
    dataSourceRef.current = null;
    setActiveSource(null);
  };

  const toggleTestActuator = (id: string) => {
    setSelectedActuatorsForTest((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartTest = () => {
    const name = testName || "Untitled test";
    const actuatorsTested = Array.from(selectedActuatorsForTest);
    recordingRef.current = {
      active: true,
      startedAt: Date.now(),
      testName: name,
      actuatorsTested,
      fsr: [],
      battery: [],
      actuators: Object.fromEntries(actuatorsTested.map((id) => [id, { current: [], position: [], pwm: [] }])),
      events: [],
    };
    setIsRunning(true);
    pushEvent("test", `Test started: ${name}`);
  };

  const handleStopTest = () => {
    const recording = recordingRef.current;
    setIsRunning(false);

    if (!recording) return;
    recording.active = false;

    const draft: SavedTest = {
      id: `test-${recording.startedAt}`,
      name: recording.testName,
      startedAt: recording.startedAt,
      endedAt: Date.now(),
      durationMs: Date.now() - recording.startedAt,
      actuatorsTested: recording.actuatorsTested,
      faultCount: recording.events.length,
      params: { ...paramsByActuator },
      history: {
        fsr: recording.fsr,
        battery: recording.battery,
        actuators: recording.actuators,
      },
      events: recording.events,
    };

    setPendingTest(draft);
    pushEvent("test", `Test stopped: ${recording.testName}`);
  };

  const handleSaveTest = () => {
    if (!pendingTest) return;
    setSavedTests((prev) => addSavedTest(pendingTest, prev));
    pushEvent("test", `Saved to Test History: ${pendingTest.name}`);
    setPendingTest(null);
    setTestName("");
  };

  const handleDiscardTest = () => {
    if (!pendingTest) return;
    pushEvent("test", `Discarded: ${pendingTest.name}`);
    setPendingTest(null);
    setTestName("");
  };

  const handleDeleteSavedTest = (id: string) => {
    setSavedTests((prev) => deleteSavedTest(id, prev));
  };

  const handleParamChange = (key: keyof ParamSet, value: number) => {
    if (selectedActuator === "all") return;
    setParamsByActuator((prev) => ({
      ...prev,
      [selectedActuator]: { ...prev[selectedActuator], [key]: value },
    }));
  };

  const handleApplyParams = () => {
    if (selectedActuator === "all") return;
    const source = paramsByActuator[selectedActuator];
    const actuatorLabel = MOCK_ACTUATORS.find((a) => a.id === selectedActuator)?.label ?? selectedActuator;

    if (applyToAll) {
      setParamsByActuator((prev) => {
        const next = { ...prev };
        for (const actuator of MOCK_ACTUATORS) next[actuator.id] = { ...source };
        return next;
      });
    }

    pushEvent("param", `Params applied: ${actuatorLabel}${applyToAll ? " (all actuators)" : ""}`);
  };

  const isFaulted = (label: string) =>
    events.some(
      (event) =>
        event.type === "fault" && event.message.includes(label) && Date.now() - event.timestamp < FAULT_HIGHLIGHT_MS
    );

  const statusChips = MOCK_ACTUATORS.map((actuator) => ({
    id: actuator.id,
    label: actuator.label,
    state: (isFaulted(actuator.label) ? "fault" : isRunning ? "running" : "idle") as "idle" | "running" | "fault",
  }));

  const selectedActuatorLabel =
    selectedActuator === "all" ? null : MOCK_ACTUATORS.find((a) => a.id === selectedActuator)?.label ?? null;

  return (
    <div className="dashboard">
      <Header
        status={status}
        batteryVoltage={batteryHistory.length > 0 ? batteryHistory[batteryHistory.length - 1] : null}
        activeFaultCount={events.filter((e) => e.type === "fault").length}
        view={view}
        onViewChange={setView}
        savedTestCount={savedTests.length}
      />

      <main className="dashboard-body">
        <ConnectionBar
          status={status}
          baudRate={baudRate}
          setBaudRate={setBaudRate}
          onConnectReal={handleConnectReal}
          onConnectMock={handleConnectMock}
          onDisconnect={handleDisconnect}
          errorMessage={errorMessage}
          activeSource={activeSource}
        />

        {view === "live" ? (
          <>
            <TestControlBar
              testName={testName}
              setTestName={setTestName}
              actuators={MOCK_ACTUATORS}
              selectedActuators={selectedActuatorsForTest}
              toggleActuator={toggleTestActuator}
              isRunning={isRunning}
              onStart={handleStartTest}
              onStop={handleStopTest}
              disabled={status !== "connected" || selectedActuatorsForTest.size === 0}
              pendingSaveName={pendingTest?.name ?? null}
              onSave={handleSaveTest}
              onDiscard={handleDiscardTest}
            />

            <div className="dashboard-grid">
              <div className="dashboard-main">
                <GlobalTelemetryRow fsrHistory={fsrHistory} batteryHistory={batteryHistory} />
                <ActuatorPanel
                  actuators={MOCK_ACTUATORS}
                  selected={selectedActuator}
                  onSelect={setSelectedActuator}
                  histories={actuatorHistories}
                />
              </div>

              <div className="dashboard-rail">
                <ParameterPanel
                  selected={selectedActuator}
                  actuatorLabel={selectedActuatorLabel}
                  params={selectedActuator === "all" ? DEFAULT_PARAMS : paramsByActuator[selectedActuator]}
                  onChange={handleParamChange}
                  applyToAll={applyToAll}
                  setApplyToAll={setApplyToAll}
                  onApply={handleApplyParams}
                />

                <SystemStatusPanel chips={statusChips} events={events} />
              </div>
            </div>
          </>
        ) : (
          <TestHistoryView tests={savedTests} onDelete={handleDeleteSavedTest} />
        )}
      </main>
    </div>
  );
}

export default App;
