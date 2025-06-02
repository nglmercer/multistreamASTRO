export interface ShowIfCondition {
  field: string;
  value: boolean | string | number | (string | number | boolean)[];
  negate?: boolean;
}

export interface FieldConfig {
  label?: string;
  type?: 'text' | 'textarea' | 'switch' | 'checkbox' | 'boolean' | 'number' | 'range' | 'select' | 'radio' | 'email' | 'password' | 'tel' | 'url' | 'date' | 'time' | 'color' | 'file';
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  multiple?: boolean;
  options?: Array<{ value: string; label: string }>;
  showIf?: ShowIfCondition;
}

export interface FormConfig {
  [key: string]: FieldConfig;
}

export interface FormData {
  [key: string]: string | number | boolean | string[];
}
const defaultFormConfig: FormConfig = {
  name: { 
    label: 'Nombre', 
    type: 'text', 
    required: true,
    placeholder: 'Ingresa el nombre de la acción'
  },
  minecraft_check: { 
    label: 'Minecraft', 
    type: 'switch' 
  },
  minecraft_command: { 
    label: 'Comando Minecraft', 
    type: 'textarea', 
    placeholder: '/say hola mundo',
    showIf: { field: 'minecraft_check', value: true } 
  },
  tts_check: { 
    label: 'Texto-a-Voz', 
    type: 'switch' 
  },
  tts_text: { 
    label: 'Texto a leer', 
    type: 'text', 
    placeholder: 'Texto que será leído en voz alta',
    showIf: { field: 'tts_check', value: true } 
  },
  overlay_check: { 
    label: 'Superposición', 
    type: 'switch' 
  },
  overlay_src: { 
    label: 'Fuente(s) (IDs/URLs)', 
    type: 'text', 
    placeholder: 'https://example.com/image.png',
    showIf: { field: 'overlay_check', value: true } 
  },
  overlay_content: { 
    label: 'Texto Contenido', 
    type: 'text', 
    placeholder: 'Texto a mostrar en la superposición',
    showIf: { field: 'overlay_check', value: true } 
  },
  overlay_duration: { 
    label: 'Duración (segundos)', 
    type: 'number', 
    min: 1, 
    step: 1,
    showIf: { field: 'overlay_check', value: true } 
  },
  overlay_volume: { 
    label: 'Volumen (%)', 
    type: 'range', 
    min: 0, 
    max: 100, 
    step: 1,
    showIf: { field: 'overlay_check', value: true } 
  },
  keypress_check: { 
    label: 'Pulsación de Tecla', 
    type: 'switch' 
  },
  keypress_key: { 
    label: 'Tecla(s)', 
    type: 'text', 
    placeholder: 'space, ctrl+c, alt+tab',
    showIf: { field: 'keypress_check', value: true } 
  },
  id: { 
    label: 'ID', 
    type: 'text', 
    readonly: true,
    hidden: true
  },
  type: { 
    hidden: true 
  }
};
const defaultData = {
  id: '',
  name: 'Nueva Acción',
  type: 'Action',
  minecraft_check: false,
  minecraft_command: '/say hola',
  tts_check: false,
  tts_text: 'Texto de ejemplo',
  overlay_check: false,
  overlay_src: 'https://example.com/image.png',
  overlay_content: 'Contenido de ejemplo',
  overlay_duration: 60,
  overlay_volume: 50,
  keypress_check: false,
  keypress_key: 'space'
};
export {
    defaultFormConfig,
    defaultData
}