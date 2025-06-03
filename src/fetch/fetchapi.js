const windowurl = typeof window !== "undefined" ? window.location.origin : "";
const baseurlApi = windowurl + "/";
const baseurlTestApi = "http://localhost:9001"; // API de desarrollo
const mockApi = "http://localhost:9001"; // Otra opción de mock

const actualBaseApi =
  import.meta.env.MODE === "development" ? baseurlTestApi : baseurlApi;

const http = {
    get: (url, options = {}) => {
        return fetch(url, {
            method: 'GET',
            ...options
        }).then(res => res.json());
    },
    post: (url, body = {}, options = {}) => {
        // Verificamos si body es una instancia de FormData
        if (body instanceof FormData) {
            // Para FormData, no debemos JSON.stringify() el cuerpo
            // Y no establecemos Content-Type (el navegador lo hará)
            return fetch(url, {
                method: 'POST',
                headers: {
                    // Omitimos Content-Type para FormData
                    ...Object.fromEntries(
                        Object.entries(options.headers || {})
                            .filter(([key]) => key.toLowerCase() !== 'content-type')
                    )
                },
                body: body, // Enviamos el FormData directamente
                ...Object.fromEntries(
                    Object.entries(options)
                        .filter(([key]) => key !== 'headers')
                )
            }).then(res => res.json());
        } else {
            // Para JSON normal
            return fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                },
                body: JSON.stringify(body),
                ...Object.fromEntries(
                    Object.entries(options)
                        .filter(([key]) => key !== 'headers')
                )
            }).then(res => res.json());
        }
    },
    put: (url, body = {}, options = {}) => {
        return fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            body: JSON.stringify(body),
            ...options
        }).then(res => res.json());
    },
    delete: (url, options = {}) => {
        return fetch(url, {
            method: 'DELETE',
            ...options
        }).then(res => res.json());
    }
};
// catalogo post, envia un objeto para agregar un catalogo -- agregar
// catalogo put, actualiza un catalogo --- actualizar
// catalogo delete, elimina un catalogo --- eliminar

// Polyfill for localStorage and window in SSR environments
const storage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
};

var localStorage = typeof window !== 'undefined' 
    ? (window.localStorage || storage)
    : storage;

function getParams(paramNames = []) {
    const urlParams = new URLSearchParams(window.location.search);
    let paramsObject = Object.fromEntries(urlParams.entries());

    if (Object.keys(paramsObject).length === 0) {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean); // ["contenido", "catalogos", "2"]

    if (parts.length >= paramNames.length) {
        paramsObject = {};
        for (let i = 0; i < paramNames.length; i++) {
        paramsObject[paramNames[i]] = parts[i];
        }
    }
    }

    return paramsObject;
}
      
function safeParse(value) {
    try {
        // Si ya es un array u objeto, lo devolvemos tal cual
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
            return value;
        }

        // Si es un string que empieza con { o [, intentamos parsearlo
        if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
            try {
                return JSON.parse(value); // Intento normal
            } catch (error) {
                // Si falla, intentamos corregirlo
                const fixedJson = value
                    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // Poner comillas en claves
                    .replace(/:\s*'([^']+)'/g, ': "$1"'); // Reemplazar comillas simples por dobles en valores

                return JSON.parse(fixedJson); // Reintento con JSON corregido
            }
        }

        // Si es otro tipo de dato (número, booleano, etc.), lo devolvemos sin cambios
        return value;
    } catch (error) {
        console.error("Error al parsear JSON:", error, "Valor recibido:", value);
        return value; // Retorna el valor original si no se puede parsear
    }
}

class BaseApi {
    constructor(baseApi) {
        this.host = baseApi;
        this.http = http;
        const info = safeParse(localStorage.getItem("info")) || {};
        this.token = info.token || localStorage.getItem("token");
        this.user = safeParse(info.user || safeParse(localStorage.getItem("user"))) || {};
    }

    _authHeaders(contentType = 'application/json') {
        const headers = {
            'Authorization': `${this.token}`
        };
        if (contentType) {
            headers['Content-Type'] = contentType;
        }
        return headers;
    }

    async request(promise) {
        try {
            return await promise;
        } catch (error) {
            console.error('Error en la llamada a la API:', error);
            throw error;
        }
    }
}
class TaskApi extends BaseApi {
    // GET /tasks/get/:type
    getTasks(type) {
        if (!type) {
            console.error('No se proporcionó un tipo de tarea para obtener');
            return;
        }
        return this.request(http.get(`${this.host}/tasks/get/${type}`),{
            headers: this._authHeaders()
        });
    }
    // router.get('/get/:type/:taskId'
    saveTasks(type, data) {
        if (!type || !data) {
            console.error('No se proporcionó un tipo de tarea para guardar');
            return;
        }
        return this.request(http.post(`${this.host}/tasks/save/${type}`, data, {
            headers: this._authHeaders()
        }));
    }
    //router.delete('/remove/:type/:taskId
    removeTasks(type, taskId) {
        if (!type || !taskId) {
            console.error('No se proporcionó un tipo de tarea para eliminar');
            return;
        }
        return this.request(http.delete(`${this.host}/tasks/remove/${type}/${taskId}`, {
            headers: this._authHeaders()
        }));
    }
    completeTask(type, taskId, completed) {
        if (!type || !taskId || typeof completed !== 'boolean') {
            console.error('No se proporcionó un tipo de tarea para completar');
            return;
        }
        return this.request(http.put(`${this.host}/tasks/complete/${type}/${taskId}`, { completed }, {
            headers: this._authHeaders()
        }));
    }
    /*    return this.request(http.get(`${this.host}/java/all`, {
        headers: this._authHeaders()
    }));
    }*/
}
const taskApi = new TaskApi(actualBaseApi);
export {
    BaseApi,
    actualBaseApi,
    getParams,
    taskApi
}