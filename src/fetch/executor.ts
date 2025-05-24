export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthConfig {
  type: 'none' | 'bearer' | 'basic';
  token: string; // Podría ser string | undefined si no siempre está presente
  username: string; // Podría ser string | undefined
  password: string; // Podría ser string | undefined
}

export interface RequestConfig {
  name: string;
  url: string;
  method: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: string; // El contenido del cuerpo como string
  bodyType: 'json' | 'text' | 'form' | 'urlencoded';
  auth: AuthConfig;
}

export interface RequestResponse {
  success: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  error?: string;
  duration: number;
  size: number;
}

export class HttpRequestExecutor {
  private defaultTimeout: number;

  constructor() {
    this.defaultTimeout = 30000; // 30 segundos
  }

  async execute(config: RequestConfig, timeout: number = this.defaultTimeout): Promise<RequestResponse> {
    const startTime = performance.now();

    try {
      this._validateConfig(config);

      const url = this._buildUrl(config.url, config.params);
      const headers = this._buildHeaders(config.headers, config.auth);
      const { body, contentType } = this._buildBody(config.body, config.bodyType, config.method);

      if (contentType && !this._hasContentType(headers)) {
        headers['Content-Type'] = contentType;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response: Response = await fetch(url, {
        method: config.method.toUpperCase(),
        headers: headers as HeadersInit,
        body: body as BodyInit | null | undefined, // Asegurar compatibilidad con BodyInit
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const duration = performance.now() - startTime;
      const responseHeaders = this._extractHeaders(response.headers);
      const responseData = await this._parseResponse(response);
      const size = this._calculateSize(responseData);

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        duration: Math.round(duration),
        size
      };

    } catch (error: any) {
      const duration = performance.now() - startTime;
      let errorMessage = 'Error desconocido';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Si el error es por AbortController (timeout)
      if (error.name === 'AbortError') {
        errorMessage = `Request timed out after ${timeout}ms`;
      }

      return {
        success: false,
        status: 0, // O podría ser un código de error específico si se conoce
        statusText: 'Error',
        headers: {},
        data: null,
        error: errorMessage,
        duration: Math.round(duration),
        size: 0
      };
    }
  }

  async executeMultiple(configs: RequestConfig[]): Promise<RequestResponse[]> {
    const promises = configs.map(config => this.execute(config));
    return Promise.allSettled(promises).then(results =>
      results.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const reason = result.reason;
          let errorMessage = 'Error en ejecución múltiple';
          if (reason instanceof Error) {
            errorMessage = reason.message;
          } else if (typeof reason === 'string') {
            errorMessage = reason;
          } else if (reason && typeof reason.message === 'string') { // Para errores de fetch u otros objetos con `message`
            errorMessage = reason.message;
          }
          return {
            success: false,
            status: 0,
            statusText: 'Error',
            headers: {},
            data: null,
            error: errorMessage,
            duration: 0,
            size: 0
          };
        }
      })
    );
  }

  private _validateConfig(config: RequestConfig): void {
    if (!config) {
      throw new Error('Configuración requerida');
    }

    if (!config.url || typeof config.url !== 'string') {
      throw new Error('URL requerida y debe ser un string');
    }

    if (!config.method || typeof config.method !== 'string') {
      throw new Error('Método HTTP requerido y debe ser un string');
    }

    if (config.bodyType === 'json' && config.body && config.body.trim()) {
      try {
        JSON.parse(config.body);
      } catch (e) {
        throw new Error('Cuerpo JSON inválido');
      }
    }
  }

  private _buildUrl(baseUrl: string, params: KeyValue[] | undefined): string {
    if (!params || params.length === 0) {
      return baseUrl;
    }

    const enabledParams = params.filter(p => p.enabled && p.key.trim());
    if (enabledParams.length === 0) {
      return baseUrl;
    }

    try {
      const url = new URL(baseUrl);
      enabledParams.forEach(param => {
        url.searchParams.append(param.key.trim(), param.value);
      });
      return url.toString();
    } catch (error) {
      // Si baseUrl no es una URL válida, podría lanzar error.
      // Devolvemos baseUrl original o lanzamos un error más específico.
      console.warn(`Error al construir URL con parámetros para "${baseUrl}": ${(error as Error).message}. Usando URL base.`);
      return baseUrl; 
    }
  }

  private _buildHeaders(headers: KeyValue[] | undefined, auth: AuthConfig | undefined): Record<string, string> {
    const result: Record<string, string> = {};

    if (headers) {
      headers
        .filter(h => h.enabled && h.key.trim())
        .forEach(header => {
          result[header.key.trim()] = header.value;
        });
    }

    if (auth && auth.type !== 'none') {
      if (auth.type === 'bearer' && auth.token) {
        result['Authorization'] = `Bearer ${auth.token}`;
      } else if (auth.type === 'basic' && auth.username && auth.password) {
        const credentials = btoa(`${auth.username}:${auth.password}`);
        result['Authorization'] = `Basic ${credentials}`;
      }
    }

    return result;
  }

  private _buildBody(body: string | undefined, bodyType: RequestConfig['bodyType'], method: string): { body: string | FormData | null; contentType: string | null } {
    if (['GET', 'HEAD'].includes(method.toUpperCase())) {
      return { body: null, contentType: null };
    }

    if (!body || !body.trim()) {
      return { body: null, contentType: null };
    }

    switch (bodyType) {
      case 'json':
        try {
          const jsonData = JSON.parse(body); // Validar
          return {
            body: JSON.stringify(jsonData), // Re-stringify para asegurar formato canónico si es necesario
            contentType: 'application/json'
          };
        } catch (e) {
          throw new Error('JSON inválido en el cuerpo');
        }

      case 'text':
        return {
          body: body,
          contentType: 'text/plain'
        };

      case 'form':
        return {
          body: this._parseFormData(body),
          contentType: null // Fetch lo establece automáticamente para FormData
        };

      case 'urlencoded':
        return {
          body: this._parseUrlEncoded(body),
          contentType: 'application/x-www-form-urlencoded'
        };

      default:
        return {
          body: body,
          contentType: null
        };
    }
  }

  private _parseFormData(bodyString: string): FormData {
    const formData = new FormData();
    bodyString.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && key.trim()) {
        const value = valueParts.join('=');
        formData.append(key.trim(), value || '');
      }
    });
    return formData;
  }

  private _parseUrlEncoded(bodyString: string): string {
    if (bodyString.includes('=') && !bodyString.includes('\n') && !bodyString.includes(' ')) {
      // Asumimos que ya está codificado si no tiene saltos de línea ni espacios
      // y contiene al menos un '='. Esto podría necesitar una heurística más robusta.
      try {
        // Intentar decodificar y recodificar para normalizar y validar
        const tempParams = new URLSearchParams(bodyString);
        return tempParams.toString();
      } catch (e) {
        // Si falla, proceder con el parseo línea por línea
      }
    }
    
    const params = new URLSearchParams();
    bodyString.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && key.trim()) {
        const value = valueParts.join('=');
        params.append(key.trim(), value || '');
      }
    });
    return params.toString();
  }

  private _hasContentType(headers: Record<string, string>): boolean {
    return Object.keys(headers).some(key =>
      key.toLowerCase() === 'content-type'
    );
  }

  private _extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private async _parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        return await response.json();
      } else if (contentType.includes('text/')) {
        return await response.text();
      } else if (contentType.includes('application/octet-stream') || contentType.includes('image/') || contentType.includes('audio/') || contentType.includes('video/') || response.headers.get('content-disposition')) {
        // Considerar tipos comunes de blob o si hay content-disposition
        return await response.blob();
      } else {
        // Por defecto intentamos texto si no estamos seguros.
        const textResponse = await response.text();
        // Si el texto está vacío y el status es 204 No Content, devolver null
        if (response.status === 204 && textResponse === '') {
            return null;
        }
        return textResponse;
      }
    } catch (e) {
      // Si falla el parsing (ej. JSON malformado pero content-type es JSON),
      // intentamos devolver texto crudo como último recurso.
      try {
        const textFallback = await response.text();
         if (response.status === 204 && textFallback === '') {
            return null;
        }
        return textFallback;
      } catch (e2) {
        return null; // No se pudo parsear de ninguna forma
      }
    }
  }

  private _calculateSize(data: any): number {
    if (data === null || data === undefined) return 0;

    if (typeof data === 'string') {
      return new Blob([data]).size;
    } else if (data instanceof Blob) {
      return data.size;
    } else {
      try {
        return new Blob([JSON.stringify(data)]).size;
      } catch (e) {
        // Si no se puede serializar (ej. objeto complejo con ciclos), devolvemos un estimado o 0
        return 0;
      }
    }
  }
}

export async function executeHttpRequest(config: RequestConfig): Promise<RequestResponse> {
  const executor = new HttpRequestExecutor();
  return executor.execute(config);
}

export interface HttpExecutorOptions {
  timeout?: number;
}

export function createHttpExecutor(options: HttpExecutorOptions = {}): HttpRequestExecutor {
  const executor = new HttpRequestExecutor();
  if (options.timeout !== undefined) {
    (executor as any).defaultTimeout = options.timeout; // Acceso a propiedad privada para este caso o refactorizar
  }
  return executor;
}