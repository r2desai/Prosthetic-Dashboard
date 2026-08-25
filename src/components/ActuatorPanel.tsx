import { LineChart } from "./LineChart";

interface ActuatorHistory {
  current: number[];
  position: number[];
  pwm: number[];
}

interface ActuatorPanelProps {
  actuators: readonly { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  histories: Record<string, ActuatorHistory>;
}

const EMPTY_HISTORY: ActuatorHistory = { current: [], position: [], pwm: [] };

export function ActuatorPanel({ actuators, selected, onSelect, histories }: ActuatorPanelProps) {
  return (
    <section className="card actuator-panel">
      <div className="actuator-tabs">
        <button
          type="button"
          className={`actuator-tab ${selected === "all" ? "actuator-tab--active" : ""}`}
          onClick={() => onSelect("all")}
        >
          All
        </button>
        {actuators.map((actuator) => (
          <button
            type="button"
            key={actuator.id}
            className={`actuator-tab ${selected === actuator.id ? "actuator-tab--active" : ""}`}
            onClick={() => onSelect(actuator.id)}
          >
            {actuator.label}
          </button>
        ))}
      </div>

      {selected === "all" ? (
        <div className="actuator-grid">
          {actuators.map((actuator) => {
            const history = histories[actuator.id] ?? EMPTY_HISTORY;
            return (
              <div key={actuator.id} className="actuator-mini-card">
                <h3 className="actuator-mini-title">{actuator.label}</h3>
                <LineChart data={history.current} label="Current" unit=" mA" height={44} color="var(--accent-orange)" />
                <LineChart
                  data={history.position}
                  label="Position"
                  unit="%"
                  height={44}
                  color="var(--accent-blue)"
                  min={0}
                  max={100}
                />
                <LineChart data={history.pwm} label="PWM" unit="" height={44} color="var(--accent-green)" min={0} max={255} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="chart-grid chart-grid--3">
          <LineChart
            data={(histories[selected] ?? EMPTY_HISTORY).current}
            label="Motor current"
            unit=" mA"
            color="var(--accent-orange)"
          />
          <LineChart
            data={(histories[selected] ?? EMPTY_HISTORY).position}
            label="Position"
            unit="%"
            color="var(--accent-blue)"
            min={0}
            max={100}
          />
          <LineChart
            data={(histories[selected] ?? EMPTY_HISTORY).pwm}
            label="PWM"
            unit=""
            color="var(--accent-green)"
            min={0}
            max={255}
          />
        </div>
      )}
    </section>
  );
}
