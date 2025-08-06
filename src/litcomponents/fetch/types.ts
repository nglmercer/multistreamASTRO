export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthConfig {
  type: 'none' | 'bearer' | 'basic';
  token: string;
  username: string;
  password: string;
}

export interface RequestConfig {
  name: string;
  url: string;
  method: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: string;
  bodyType: 'json' | 'text' | 'form' | 'urlencoded';
  auth: AuthConfig;
}

// Definiciones para templates
export interface FieldConstraint {
  type: 'readonly' | 'hidden' | 'restricted' | 'required';
  value?: any;
  options?: string[];
  validator?: (value: any) => boolean;
  message?: string;
}

export interface BodyTemplate {
  schema: object;
  editableFields: string[];
  fieldTypes: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>;
  validators?: Record<string, (value: any) => boolean>;
  arrayItemTypes?: Record<string, 'string' | 'number' | 'boolean'>;
}

export interface RequestTemplate {
  id: string;
  name: string;
  icon?: string;
  description: string;
  baseConfig: Partial<RequestConfig>;
  constraints: Record<string, FieldConstraint>;
  bodyTemplate?: BodyTemplate;
  allowedMethods?: string[];
  requiredHeaders?: KeyValue[];
  maxParams?: number;
}

export interface FetchResult {
  success: boolean;
  status?: number;
  statusText?: string;
  data?: any;
  error?: string;
  headers?: Record<string, string>;
  duration?: number;
}
