function getGiftList(by="gift") {
    let gifts = [];
    try {
        const tiktokEventsString = localStorage.getItem('TiktokEvents');  // Evita repetir la llamada
        if (tiktokEventsString) {
            const tiktokEvents = JSON.parse(tiktokEventsString);
            if (tiktokEvents && tiktokEvents.availableGifts && Array.isArray(tiktokEvents.availableGifts)) {
                if (!by || by === 'gift') {
                gifts = mapgifts(tiktokEvents.availableGifts);
                } else if (by === 'cost') {
                    gifts = mapgiftsbycost(tiktokEvents.availableGifts);
                }
            }
        }
    } catch (error) {
        console.error(error); // Usa console.error para errores
    }
    console.log("getGiftList", gifts);
    return gifts;
}

function mapgifts(array = [], orderBy = 'cost') {
    if (!array || !Array.isArray(array)) {
        return [];
    }

    const mappedArray = array.map(obj => ({
        name: obj.name,
        label: `${obj.name} (${obj.diamond_count})`, //template literals mas facil
        value: obj.id,
        image: geticonfromarray(obj.icon.url_list),
        cost: obj.diamond_count
    }));

    // Ordenar el array mapeado
    if (orderBy === 'name') {
        return [...mappedArray].sort((a, b) => a.name.localeCompare(b.name)); // Usar una copia para no modificar el original
    } else if (orderBy === 'cost') {
        return [...mappedArray].sort((a, b) => a.cost - b.cost); // Usar una copia para no modificar el original
    } else {
        return mappedArray;
    }
}
function mapgiftsbycost(array) {
    if (!array || !Array.isArray(array)) {
        return [];
    }

    const mappedArray = array.map(obj => ({
        name: obj.name,
        label: `${obj.name} (${obj.diamond_count})`, //template literals mas facil
        value: obj.diamond_count,
        image: geticonfromarray(obj.icon.url_list),
        cost: obj.diamond_count
    }));

    // Ordenar el array mapeado
    if (orderBy === 'name') {
        return [...mappedArray].sort((a, b) => a.name.localeCompare(b.name)); // Usar una copia para no modificar el original
    } else if (orderBy === 'cost') {
        return [...mappedArray].sort((a, b) => a.cost - b.cost); // Usar una copia para no modificar el original
    } else {
        return mappedArray;
    }
}

function geticonfromarray(array) {
    if (array && Array.isArray(array) && array.length > 0) {
        return array[0];
    }
    return '';
}

export { getGiftList, mapgifts, geticonfromarray };