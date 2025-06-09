async function seleccionarYParsearJSON(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
  
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) {
            reject(new Error('No se seleccionó ningún archivo.'));
            return;
          }
  
          const reader = new FileReader();
  
          reader.onload = () => {
            try {
              const result = reader.result as string;
              const json = JSON.parse(result);
              resolve(json);
            } catch (e) {
              reject(new Error('El archivo no contiene JSON válido.'));
            }
          };
  
          reader.onerror = () => {
            reject(new Error('Error al leer el archivo.'));
          };
  
          reader.readAsText(file);
        };
  
        input.click();
      } catch (e: any) {
        reject(new Error('Error inesperado: ' + e.message));
      }
    });
  }
export {
    seleccionarYParsearJSON
}