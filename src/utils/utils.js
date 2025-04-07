// /utils/utils.js
function getCategories(array) {
    let newArray = [];
    if (!array) return null;
    for (let i = 0; i < array.length; i++) {
      if (array[i].nombre || array[i].nombreCategoria) {
        newArray.push(array[i].nombre || array[i].nombreCategoria);
      }
    }
    return newArray;
}
function getTempsandEpisodes(temporadas) {
    if (!Array.isArray(temporadas) || temporadas.length === 0) return null;

    return {
        length: temporadas.length,
        season: temporadas.length,
        episodes: temporadas.reduce((acc, cur) => {
            // Verificar si cur.capitulos es un array antes de acceder a su length
            if (Array.isArray(cur.capitulos)) {
                return acc + cur.capitulos.length;
            }
            return acc; // Si no es un array, simplemente retornar el acumulador sin sumar
        }, 0)
    };
} 
function obtenerPrimerNombre(lenguajes) {
    if (!Array.isArray(lenguajes) || lenguajes.length === 0) {
      return null;
    }
    const lenguajeEncontrado = lenguajes.find(lang => lang && lang.nombre);
    return lenguajeEncontrado ? lenguajeEncontrado.nombre : null;
  }
  
  function parseAnimeItems(items, moredata = {}, keysToCompare = ['id',"title","altTitle","imageUrl","episodes","languages","status"]) {
    if (!Array.isArray(items)) {
      return [];
    }
    if (items.length === 0) {
        return [];
    }
  
    const parsedItems = items.map(item => {
      if (!item || typeof item !== 'object') {
          return null;
      }
  
      const id = item.idCatalogo ?? item.catalogoCapitulo ?? null;
      const title = item.title ?? item.nombreCatalogo ?? 'Título Desconocido';
      const altTitle = item.altTitle ?? item.nombreTemporada ?? null;
      const imageUrl = item.imageUrl ?? item.imagenFondoCatalogo ?? item.portadaTemporada ?? null;
      const episodes = item.episodes ?? item.numeroCapitulo ?? null;
      const languages = obtenerPrimerNombre(item.lenguajes) ?? item.lenguaje ?? null;
      const status = item.status ?? moredata?.status ?? null;
  
      // Incluir ...item para mantener todas las propiedades originales
      // además de las estandarizadas que podrían sobrescribir alguna existente.
      return {
        ...item, // Importante: Mantener las propiedades originales
        id,
        title,
        altTitle,
        imageUrl,
        episodes,
        languages,
        status
      };
    }).filter(item => item !== null);
  
    if (parsedItems.length < 2 || keysToCompare.length === 0) {
        // No hay duplicados posibles o no se especificaron claves para comparar
        return parsedItems;
    }
  
    // Usar reduce para eliminar duplicados adyacentes basados en keysToCompare
    const uniqueAdjacentItems = parsedItems.reduce((acc, currentItem) => {
      const previousItem = acc.length > 0 ? acc[acc.length - 1] : null;
  
      let areConsideredDuplicates = false;
      if (previousItem) {
          // Verificar si TODOS los valores de las claves especificadas son iguales
          areConsideredDuplicates = keysToCompare.every(key => {
              // Comparación estricta (===) de los valores para cada clave
              return currentItem[key] === previousItem[key];
          });
      }
  
      // Añadir el item si es el primero O si NO se considera duplicado del anterior
      if (!previousItem || !areConsideredDuplicates) {
        acc.push(currentItem);
      }
      return acc;
    }, []);
  
    return uniqueAdjacentItems;
  }
  
export {getCategories, getTempsandEpisodes,parseAnimeItems};