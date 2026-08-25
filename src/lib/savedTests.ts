import type { EventLogEntry } from "./events";
import type { ParamSet } from "../components/ParameterPanel";

export interface ActuatorHistorySnapshot {
  current: number[];
  position: number[];
  pwm: number[];
}

export interface SavedTest {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  actuatorsTested: string[];
  faultCount: number;
  params: Record<string, ParamSet>;
  history: {
    fsr: number[];
    battery: number[];
    actuators: Record<string, ActuatorHistorySnapshot>;
  };
  events: EventLogEntry[];
}

const STORAGE_KEY = "prosthetic-dashboard:saved-tests";


export function loadSavedTests(): SavedTest[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(tests: SavedTest[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
  } catch {
    
  }
}

export function addSavedTest(test: SavedTest, existing: SavedTest[]): SavedTest[] {
  const next = [test, ...existing];
  persist(next);
  return next;
}

export function deleteSavedTest(id: string, existing: SavedTest[]): SavedTest[] {
  const next = existing.filter((t) => t.id !== id);
  persist(next);
  return next;
}
