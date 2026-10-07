export type PilotCommsEvent =
  | 'mission_start'
  | 'engaging_target'
  | 'taking_heavy_fire'
  | 'station_destroyed'
  | 'radar_warning'
  | 'rocket_launch'
  | 'mission_won';

export interface PilotRadioMessage {
  id: string;
  callsign: string;
  text: string;
  timestamp: number;
}

type Listener = (msg: PilotRadioMessage | null) => void;

class PilotCommsSystem {
  private listeners: Set<Listener> = new Set();

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Voice narration and written in-game comms removed as requested
  public trigger(_event: PilotCommsEvent, _force: boolean = false): void {
    // No-op: in-game voice commentary and written subtitles removed
  }

  public clear(): void {
    this.listeners.forEach((fn) => fn(null));
  }
}

export const pilotComms = new PilotCommsSystem();
