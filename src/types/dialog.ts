// src/types/dialog.ts
export type DialogResolve = (value: boolean) => void;
export type DialogReject = (reason?: any) => void; // Aunque no la usemos activamente para rechazar la promesa

export interface DialogOptions {
  title: string;
  message?: string;
  acceptText?: string;
  rejectText?: string;
  onOpen?: () => void;
  onClose?: (result: boolean) => void;
}

export interface QueuedDialog extends DialogOptions {
  promiseResolve: (value: boolean) => void;
  identifier?: string; // <--- AÑADIDO: para rastrear duplicados
}