import type { EventLogEntry } from "../lib/events";

interface StatusChip {
  id: string;
  label: string;
  state: "idle" | "running" | "fault";
}

interface SystemStatusPanelProps {
  chips: StatusChip[];
  events: EventLogEntry[];
}

export function SystemStatusPanel({ chips, events }: SystemStatusPanelProps) {
  return (
    <section className="card system-status-panel">
      <h2 className="panel-title">System Status</h2>

      <div className="status-chip-row">
        {chips.map((chip) => (
          <span key={chip.id} className={`status status--chip-${chip.state}`}>
            {chip.label}: {chip.state}
          </span>
        ))}
      </div>

      <div className="event-log">
        {events.length === 0 ? (
          <p className="panel-empty">No events yet.</p>
        ) : (
          <ul className="event-log-list">
            {events
              .slice()
              .reverse()
              .map((event) => (
                <li key={event.id} className={`event-log-item event-log-item--${event.type}`}>
                  <span className="event-log-time">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="event-log-message">{event.message}</span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  );
}
