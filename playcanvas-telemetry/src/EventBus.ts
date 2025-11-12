type EventCallback = (data?: any) => void;

export class EventBus {
  private static listeners: Map<string, EventCallback[]> = new Map();

  static on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
  }

  static off(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) return;
    const arr = this.listeners.get(event)!;
    const idx = arr.indexOf(callback);
    if (idx !== -1) arr.splice(idx, 1);
  }

  static emit(event: string, data?: any) {
    if (!this.listeners.has(event)) return;
    for (const cb of this.listeners.get(event)!) cb(data);
  }
}