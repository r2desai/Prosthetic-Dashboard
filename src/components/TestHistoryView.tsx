import { useState } from "react";
import type { SavedTest } from "../lib/savedTests";
import { exportTestToCsv } from "../lib/csvExport";
import { MOCK_ACTUATORS } from "../lib/mockDataSource";
import type { ParamSet } from "./ParameterPanel";
import { LineChart } from "./LineChart";
import { MultiLineChart } from "./MultiLineChart";

interface TestHistoryViewProps {
  tests: SavedTest[];
  onDelete: (id: string) => void;
}

const PARAM_ROWS: { key: keyof ParamSet; label: string }[] = [
  { key: "sensitivity", label: "Sensitivity" },
  { key: "deadband", label: "Deadband" },
  { key: "maxMotorOutput", label: "Max motor output" },
  { key: "currentLimit", label: "Current limit" },
];

function actuatorLabel(id: string): string {
  return MOCK_ACTUATORS.find((a) => a.id === id)?.label ?? id;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function TestHistoryView({ tests, onDelete }: TestHistoryViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusActuator, setFocusActuator] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev; // capped at two — beyond that, overlays get unreadable
      return [...prev, id];
    });
  };

  const selectedTests = tests.filter((t) => selectedIds.includes(t.id));

  if (tests.length === 0) {
    return (
      <section className="card history-empty">
        <h2 className="panel-title">Test History</h2>
        <p className="panel-empty">
          No saved tests yet. Run a test from Live Test and save it when you stop — it'll show up here.
        </p>
      </section>
    );
  }

  const commonActuators =
    selectedTests.length === 2
      ? selectedTests[0].actuatorsTested.filter((a) => selectedTests[1].actuatorsTested.includes(a))
      : [];
  const activeFocus =
    focusActuator && commonActuators.includes(focusActuator) ? focusActuator : commonActuators[0] ?? null;

  return (
    <div className="history-view">
      <section className="card">
        <h2 className="panel-title">Saved Tests</h2>
        <p className="panel-note history-hint">Select up to two tests to compare them side by side.</p>

        <ul className="test-list">
          {tests.map((test) => (
            <li
              key={test.id}
              className={`test-list-item ${selectedIds.includes(test.id) ? "test-list-item--selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(test.id)}
                disabled={!selectedIds.includes(test.id) && selectedIds.length >= 2}
                onChange={() => toggleSelect(test.id)}
              />
              <div className="test-list-info">
                <span className="test-list-name">{test.name}</span>
                <span className="test-list-meta">
                  {new Date(test.startedAt).toLocaleString()} · {formatDuration(test.durationMs)} ·{" "}
                  {test.actuatorsTested.map(actuatorLabel).join(", ")}
                  {test.faultCount > 0 ? ` · ${test.faultCount} fault${test.faultCount > 1 ? "s" : ""}` : ""}
                </span>
              </div>
              <div className="test-list-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => exportTestToCsv(test)}>
                  Export CSV
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => onDelete(test.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {selectedTests.length === 1 && <TestDetail test={selectedTests[0]} />}

      {selectedTests.length === 2 && (
        <TestComparison
          tests={[selectedTests[0], selectedTests[1]]}
          commonActuators={commonActuators}
          focusActuator={activeFocus}
          onFocusActuator={setFocusActuator}
        />
      )}
    </div>
  );
}

function TestDetail({ test }: { test: SavedTest }) {
  return (
    <section className="card">
      <h2 className="panel-title">{test.name}</h2>

      <div className="chart-grid chart-grid--2">
        <LineChart data={test.history.fsr} label="FSR input" color="var(--accent-blue)" min={0} max={100} />
        <LineChart
          data={test.history.battery}
          label="Battery voltage"
          unit=" V"
          color="var(--accent-green)"
          min={6}
          max={9}
        />
      </div>

      <div className="actuator-grid history-actuator-grid">
        {test.actuatorsTested.map((id) => {
          const h = test.history.actuators[id];
          if (!h) return null;
          return (
            <div key={id} className="actuator-mini-card">
              <h3 className="actuator-mini-title">{actuatorLabel(id)}</h3>
              <LineChart data={h.current} label="Current" unit=" mA" height={44} color="var(--accent-orange)" />
              <LineChart
                data={h.position}
                label="Position"
                unit="%"
                height={44}
                color="var(--accent-blue)"
                min={0}
                max={100}
              />
              <LineChart data={h.pwm} label="PWM" height={44} color="var(--accent-green)" min={0} max={255} />
            </div>
          );
        })}
      </div>

      <h3 className="panel-title history-subheading">Parameters at time of test</h3>
      <table className="param-table">
        <thead>
          <tr>
            <th>Actuator</th>
            {PARAM_ROWS.map((row) => (
              <th key={row.key}>{row.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {test.actuatorsTested.map((id) => {
            const p = test.params[id];
            if (!p) return null;
            return (
              <tr key={id}>
                <td>{actuatorLabel(id)}</td>
                {PARAM_ROWS.map((row) => (
                  <td key={row.key}>{p[row.key]}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function TestComparison({
  tests,
  commonActuators,
  focusActuator,
  onFocusActuator,
}: {
  tests: [SavedTest, SavedTest];
  commonActuators: string[];
  focusActuator: string | null;
  onFocusActuator: (id: string) => void;
}) {
  const colors = ["var(--accent-blue)", "var(--accent-orange)"];

  return (
    <section className="card">
      <h2 className="panel-title">
        Comparing: {tests[0].name} vs {tests[1].name}
      </h2>

      <div className="chart-grid chart-grid--2">
        <MultiLineChart
          title="FSR input"
          series={tests.map((t, i) => ({ label: t.name, data: t.history.fsr, color: colors[i] }))}
          min={0}
          max={100}
        />
        <MultiLineChart
          title="Battery voltage"
          series={tests.map((t, i) => ({ label: t.name, data: t.history.battery, color: colors[i] }))}
          min={6}
          max={9}
        />
      </div>

      {commonActuators.length > 0 && focusActuator ? (
        <>
          <div className="control-row history-focus-row">
            <label className="field">
              Actuator focus
              <select value={focusActuator} onChange={(e) => onFocusActuator(e.target.value)}>
                {commonActuators.map((id) => (
                  <option key={id} value={id}>
                    {actuatorLabel(id)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="chart-grid chart-grid--3">
            <MultiLineChart
              title="Current (mA)"
              series={tests.map((t, i) => ({
                label: t.name,
                data: t.history.actuators[focusActuator]?.current ?? [],
                color: colors[i],
              }))}
            />
            <MultiLineChart
              title="Position (%)"
              series={tests.map((t, i) => ({
                label: t.name,
                data: t.history.actuators[focusActuator]?.position ?? [],
                color: colors[i],
              }))}
              min={0}
              max={100}
            />
            <MultiLineChart
              title="PWM"
              series={tests.map((t, i) => ({
                label: t.name,
                data: t.history.actuators[focusActuator]?.pwm ?? [],
                color: colors[i],
              }))}
              min={0}
              max={255}
            />
          </div>
        </>
      ) : (
        <p className="panel-empty history-focus-row">These two tests have no actuators in common to compare.</p>
      )}

      <h3 className="panel-title history-subheading">Parameter differences</h3>
      <table className="param-table">
        <thead>
          <tr>
            <th>Actuator</th>
            <th>Parameter</th>
            <th>{tests[0].name}</th>
            <th>{tests[1].name}</th>
          </tr>
        </thead>
        <tbody>
          {commonActuators.flatMap((id) => {
            const p0 = tests[0].params[id];
            const p1 = tests[1].params[id];
            if (!p0 || !p1) return [];
            return PARAM_ROWS.map((row) => (
              <tr key={`${id}-${row.key}`} className={p0[row.key] !== p1[row.key] ? "param-table-diff" : undefined}>
                <td>{actuatorLabel(id)}</td>
                <td>{row.label}</td>
                <td>{p0[row.key]}</td>
                <td>{p1[row.key]}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </section>
  );
}
