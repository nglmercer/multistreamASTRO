// globalSignals.ts
import type { DialogOptions } from './types/dialog';
export {};
declare global {
  interface Window {
    showDialog: (
      title: string,
      acceptText?: string,
      rejectText?: string
    ) => Promise<boolean>;
    showQueuedDialog: (options: DialogOptions) => Promise<boolean>;
  }
}
