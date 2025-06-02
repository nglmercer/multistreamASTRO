// src/components/DialogManagerSolid.tsx
import { createSignal, createEffect, Show, onMount } from 'solid-js';
import type { DialogOptions, QueuedDialog } from '../types/dialog';
import '@components/dialog/dialog.css';

// Estado global
const [dialogQueue, setDialogQueue] = createSignal<QueuedDialog[]>([]);
const [currentDialog, setCurrentDialog] = createSignal<QueuedDialog | null>(null);
const [isVisible, setIsVisible] = createSignal(false);

// NUEVO: Set para rastrear identificadores de diálogos en cola o activos
const [activeDialogIdentifiers, setActiveDialogIdentifiers] = createSignal(new Set<string>());

// Referencias DOM
let dialogOverlayRef: HTMLDivElement | undefined;
let acceptButtonRef: HTMLButtonElement | undefined;

const HIDE_ANIMATION_DURATION = 300;

// Función auxiliar para generar un identificador basado en el contenido del diálogo
const getDialogIdentifier = (options: DialogOptions): string => {
  // Concatenamos los campos que consideramos definen la unicidad.
  // Es importante ser consistente.
  // Usamos '|| ""' para manejar campos opcionales que puedan ser undefined.
  return `${options.title}|${options.message || ''}|${options.acceptText || ''}|${options.rejectText || ''}`;
};

export const showQueuedDialogSolid = (options: DialogOptions): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    const identifier = getDialogIdentifier(options);

    if (activeDialogIdentifiers().has(identifier)) {
      console.warn('DialogManagerSolid: Un diálogo con datos idénticos ya está en cola o mostrándose. No se agregará.', options);
      // Resolvemos la promesa como si se hubiera cancelado o rechazado,
      // para que el código que llamó a showQueuedDialog no quede esperando indefinidamente.
      resolve(false); // O podrías lanzar un error o retornar un objeto con un status.
      return;
    }

    const newDialog: QueuedDialog = {
      ...options,
      identifier, // Guardamos el identificador
      promiseResolve: (value) => {
        resolve(value);
        if (options.onClose) {
          options.onClose(value);
        }
        
        // Antes de limpiar, removemos el identificador del diálogo actual del Set
        // Hacemos esto aquí porque 'currentDialog()' todavía tiene el diálogo que se está cerrando.
        const closingDialog = currentDialog(); // Capturamos el diálogo actual antes de que cambie
        if (closingDialog) {
          setActiveDialogIdentifiers(prev => {
            const newSet = new Set(prev);
            newSet.delete(closingDialog.identifier || 'DEFAULT'); // Aseguramos que el identificador sea seguro
            return newSet;
          });
        }

        setIsVisible(false);
        setTimeout(() => {
          setCurrentDialog(null);
        }, HIDE_ANIMATION_DURATION);
      },
    };

    // Agregamos el identificador al Set y el diálogo a la cola
    setActiveDialogIdentifiers(prev => new Set(prev).add(identifier));
    setDialogQueue(prev => [...prev, newDialog]);
  });
};

if (typeof window !== 'undefined') {
  (window as any).showQueuedDialog = showQueuedDialogSolid;
}

export function DialogManagerSolid() {
  createEffect(() => {
    if (!currentDialog() && dialogQueue().length > 0) {
      const nextDialog = dialogQueue()[0];
      
      if (nextDialog.onOpen) {
        nextDialog.onOpen();
      }
      setCurrentDialog(nextDialog);
      setDialogQueue(prev => prev.slice(1));
      // El identificador ya fue agregado a activeDialogIdentifiers cuando se llamó a showQueuedDialogSolid.
      // Y se quitará cuando se resuelva el diálogo (en promiseResolve).
      setIsVisible(true);
    }
  });

  createEffect(() => {
    if (isVisible() && currentDialog() && acceptButtonRef) {
      acceptButtonRef.focus();
    }
  });

  const handleResolve = (value: boolean) => {
    const dialog = currentDialog();
    if (dialog) {
      dialog.promiseResolve(value);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isVisible() && currentDialog()) {
      handleResolve(false);
    }
  };

  createEffect(() => {
    if (isVisible()) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  });

  return (
    <Show when={isVisible() && currentDialog()}>
      <div
        ref={dialogOverlayRef}
        class="dialog-overlay show"
        aria-hidden={!isVisible()}
        role="alertdialog"
        aria-modal="true"
      >
        <div class="dialog-box" role="document">
          <h3 class="dialog-title">{currentDialog()?.title}</h3>
          <Show when={currentDialog()?.message}>
            <p class="dialog-message">{currentDialog()!.message}</p>
          </Show>
          <div class="dialog-actions">
            <button
              ref={acceptButtonRef}
              class="dialog-btn dialog-accept"
              onClick={() => handleResolve(true)}
            >
              {currentDialog()?.acceptText || 'Aceptar'}
            </button>
            <button
              class="dialog-btn dialog-reject"
              onClick={() => handleResolve(false)}
            >
              {currentDialog()?.rejectText || 'Cancelar'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}