// Safe Storage Helper with Fallback (handles QuotaExceededError gracefully)

class SafeStorage {
  private memoryFallback: Map<string, string> = new Map();

  public setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e: any) {
      console.warn(`[SafeStorage] localStorage quota exceeded for key "${key}", purging bloated cache...`, e);
      try {
        // Auto-purge bloated keys (high-res photo backups and bulky logs)
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('pplg3_foto_') || k === 'pplg3_activity_logs')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        localStorage.setItem(key, value);
      } catch {
        try {
          // Try sessionStorage as second layer
          sessionStorage.setItem(key, value);
        } catch {
          this.memoryFallback.set(key, value);
        }
      }
    }
  }

  public getItem(key: string): string | null {
    try {
      const localVal = localStorage.getItem(key);
      if (localVal !== null) return localVal;
    } catch {
      // Ignore
    }

    try {
      const sessionVal = sessionStorage.getItem(key);
      if (sessionVal !== null) return sessionVal;
    } catch {
      // Ignore
    }

    return this.memoryFallback.get(key) ?? null;
  }

  public removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {}

    try {
      sessionStorage.removeItem(key);
    } catch {}

    this.memoryFallback.delete(key);
  }

  public clear(): void {
    try {
      localStorage.clear();
    } catch {}
    try {
      sessionStorage.clear();
    } catch {}
    this.memoryFallback.clear();
  }
}

export const safeStorage = new SafeStorage();
