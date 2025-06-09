type ExportJSONOptions = {
  filename?: string; // solo aplica para descarga
  mode: 'download' | 'copy';
};

function exportarJSON(obj: unknown, options: ExportJSONOptions): void {
  try {
    const jsonString = JSON.stringify(obj, null, 2);
    if (!options){
      console.warn("faltan options{filename?,mode:download|copy}")
      return;
    }
    if (options.mode === 'download') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = options.filename || 'data.json';
      a.click();

      URL.revokeObjectURL(url);
    } else if (options.mode === 'copy') {
      navigator.clipboard.writeText(jsonString)
        .then(() => {
          console.log('JSON copiado al portapapeles.');
        })
        .catch(err => {
          console.error('Error al copiar JSON:', err);
        });
    }
  } catch (err) {
    console.error('Error al exportar JSON:', err);
  }
}
export {
  exportarJSON
}