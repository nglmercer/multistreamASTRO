/* class AnimeCard {
    static properties = {
      title: { type: String },
      seasons: { type: Number },
      imageUrl: { type: String },
    };
}
*/
const AnimeCardparser = (data) => {
    console.log("AnimeCardparser", data);
    return {
        ...data,
        title: data.tituloCapitulo || data.nombreCatalogo,
        seasons: data.temporadas,
        imageUrl: data.imagenFondoCatalogo || data.imagenPortadaCatalogo,
    }
}
function obtenerPrimerNombre(lenguajes) {
  // Verificar si es un array válido y no está vacío
  if (!Array.isArray(lenguajes) || lenguajes.length === 0) {
    return null;
  }
  // Encontrar el primer objeto que tenga una propiedad 'nombre' (truthy)
  const lenguajeEncontrado = lenguajes.find(lang => lang && lang.nombre);
  // Devolver el nombre si se encontró, si no, null
  return lenguajeEncontrado ? lenguajeEncontrado.nombre : null;
}

/**
 * Parsea y estandariza una lista de items, eliminando duplicados adyacentes.
 * @param {Array<Object>|null|undefined} items - El array de items a parsear.
 * @param {Object} [moredata={}] - Un objeto opcional con datos adicionales (ej. status).
 * @returns {Array<Object>} Un nuevo array con los items parseados y sin duplicados seguidos.
 */
function parseAnimeItems(items, moredata = {}) { // moredata por defecto es {}
  // 1. Validar entrada y mapear/transformar items
  if (!Array.isArray(items)) {
    console.warn("parseAndDeduplicateItems recibió 'items' que no es un array. Se devuelve [].", items);
    return []; // Devolver array vacío en lugar de null
  }
  if (items.length === 0) {
      return []; // Devolver array vacío si la entrada está vacía
  }

  const parsedItems = items.map(item => {
    // Es buena idea verificar si 'item' es realmente un objeto
    if (!item || typeof item !== 'object') {
        console.warn("Se encontró un elemento no válido en 'items', será omitido:", item);
        return null; // Marcar para filtrar luego
    }

    // Usar ?? (Nullish Coalescing) para fallbacks más seguros
    const id = item.idCatalogo ?? item.catalogoCapitulo ?? null;
    const title = item.title ?? item.nombreCatalogo ?? 'Título Desconocido'; // Quizá un default?
    const altTitle = item.altTitle ?? item.nombreTemporada ?? null;
    const imageUrl = item.imageUrl ?? item.imagenFondoCatalogo ?? item.portadaTemporada ?? null;
    const episodes = item.episodes ?? item.numeroCapitulo ?? null;
    // Llamar a la función helper mejorada
    const languages = obtenerPrimerNombre(item.lenguajes) ?? item.lenguaje ?? null;
    // Usar optional chaining para moredata sigue siendo buena idea
    const status = item.status ?? moredata?.status ?? null;

    return {
      ...item,
      id,
      title,
      altTitle,
      imageUrl,
      episodes,
      languages,
      status
    };
  }).filter(item => item !== null); // Filtrar cualquier null resultante de items inválidos

  // 2. Eliminar duplicados adyacentes
  if (parsedItems.length < 2) {
      return parsedItems; // No hay duplicados posibles si hay 0 o 1 elemento
  }

  const uniqueAdjacentItems = parsedItems.reduce((acc, currentItem) => {
    const previousItem = acc.length > 0 ? acc[acc.length - 1] : null;

    // Comparar el item actual con el último añadido al acumulador (acc)
    // Usamos JSON.stringify para una comparación simple de contenido de objeto.
    // ¡Cuidado! Esto depende del orden de las claves si no es consistente
    // y no funciona bien con tipos complejos (Fechas, Funciones, undefined).
    // Para esta estructura simple, debería funcionar.
    if (!previousItem || JSON.stringify(currentItem) !== JSON.stringify(previousItem)) {
      acc.push(currentItem); // Añadir solo si es el primero o diferente al anterior
    }
    return acc; // Devolver el acumulador para la siguiente iteración
  }, []); // Empezar con un array vacío como acumulador inicial

  return uniqueAdjacentItems;
}
export {
    AnimeCardparser,
    parseAnimeItems,
}