export const DATABASE_PROBE = Symbol('DATABASE_PROBE');

export interface DatabaseProbe {
  ping(): Promise<void>;
}
