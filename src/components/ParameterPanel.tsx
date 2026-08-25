export interface ParamSet {
  sensitivity: number;
  deadband: number;
  maxMotorOutput: number;
  currentLimit: number;
}

interface ParameterPanelProps {
  selected: string;
  actuatorLabel: string | null;
  params: ParamSet;
  onChange: (key: keyof ParamSet, value: number) => void;
  applyToAll: boolean;
  setApplyToAll: (value: boolean) => void;
  onApply: () => void;
}

export function ParameterPanel({
  selected,
  actuatorLabel,
  params,
  onChange,
  applyToAll,
  setApplyToAll,
  onApply,
}: ParameterPanelProps) {
  if (selected === "all") {
    return (
      <section className="card parameter-panel">
        <h2 className="panel-title">Controller Tuning</h2>
        <p className="panel-empty">Select an actuator tab above to tune its parameters.</p>
      </section>
    );
  }

  return (
    <section className="card parameter-panel">
      <h2 className="panel-title">Controller Tuning — {actuatorLabel}</h2>

      <div className="param-row">
        <span className="param-name">Sensitivity</span>
        <input
          type="range"
          min={0}
          max={100}
          value={params.sensitivity}
          onChange={(e) => onChange("sensitivity", Number(e.target.value))}
        />
        <span className="param-value">{params.sensitivity}</span>
      </div>

      <div className="param-row">
        <span className="param-name">Deadband</span>
        <input
          type="range"
          min={0}
          max={50}
          value={params.deadband}
          onChange={(e) => onChange("deadband", Number(e.target.value))}
        />
        <span className="param-value">{params.deadband}</span>
      </div>

      <div className="param-row">
        <span className="param-name">Max motor output</span>
        <input
          type="number"
          min={0}
          max={255}
          value={params.maxMotorOutput}
          onChange={(e) => onChange("maxMotorOutput", Number(e.target.value))}
        />
      </div>

      <div className="param-row">
        <span className="param-name">Current limit</span>
        <input
          type="number"
          min={0}
          max={2000}
          value={params.currentLimit}
          onChange={(e) => onChange("currentLimit", Number(e.target.value))}
        />
        <span className="param-unit">mA</span>
      </div>

      <div className="control-row param-footer">
        <label className="field">
          <input type="checkbox" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} />
          Apply to all actuators
        </label>
        <button type="button" className="btn btn-primary" onClick={onApply}>
          Apply
        </button>
      </div>

      <p className="panel-note">
        Apply updates local state only for now.
      </p>
    </section>
  );
}
