interface TestControlBarProps {
  testName: string;
  setTestName: (name: string) => void;
  actuators: readonly { id: string; label: string }[];
  selectedActuators: Set<string>;
  toggleActuator: (id: string) => void;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled: boolean;
  pendingSaveName: string | null;
  onSave: () => void;
  onDiscard: () => void;
}

export function TestControlBar({
  testName,
  setTestName,
  actuators,
  selectedActuators,
  toggleActuator,
  isRunning,
  onStart,
  onStop,
  disabled,
  pendingSaveName,
  onSave,
  onDiscard,
}: TestControlBarProps) {
  if (pendingSaveName !== null) {
    return (
      <section className="card test-control-bar test-control-bar--pending">
        <div className="control-row">
          <div className="pending-save-text">
            <strong>{pendingSaveName}</strong> finished recording. Save it to Test History?
          </div>
          <button className="btn btn-primary" onClick={onSave}>
            Save Test
          </button>
          <button className="btn btn-secondary" onClick={onDiscard}>
            Discard
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card test-control-bar">
      <div className="control-row">
        <label className="field field--grow">
          Test name
          <input
            type="text"
            value={testName}
            disabled={isRunning}
            placeholder="e.g. grip-tuning-run-1"
            onChange={(e) => setTestName(e.target.value)}
          />
        </label>

        {isRunning ? (
          <button className="btn btn-secondary" onClick={onStop}>
            Stop Test
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onStart} disabled={disabled}>
            Start Test
          </button>
        )}
      </div>

      <div className="actuator-checkboxes">
        {actuators.map((actuator) => (
          <label key={actuator.id} className="checkbox-chip">
            <input
              type="checkbox"
              checked={selectedActuators.has(actuator.id)}
              disabled={isRunning}
              onChange={() => toggleActuator(actuator.id)}
            />
            {actuator.label}
          </label>
        ))}
      </div>
    </section>
  );
}
