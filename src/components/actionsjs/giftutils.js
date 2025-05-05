function getGiftList(by="gift") {
    let gifts = [];
    const tiktokEvents = getAgifts();
    try {
            if (tiktokEvents && Array.isArray(tiktokEvents)) {
                if (!by || by === 'gift') {
                gifts = mapgifts(tiktokEvents);
                } else if (by === 'cost') {
                    gifts = mapgiftsbycost(tiktokEvents);
                }
            }
        
    } catch (error) {
        console.error(error);
        return []
    }
    console.log("getGiftList", gifts,tiktokEvents);
    return gifts;
}
function getAgifts(){
    const avg = ["availableGifts","connected"]
    try {
        const tiktokEventsString = localStorage.getItem('TiktokEvents');  // Evita repetir la llamada
        if (tiktokEventsString) {
            const TStore = JSON.parse(tiktokEventsString);
            const giftStore = TStore[avg[0]] ? TStore[avg[0]] : TStore[avg[1]]?.[avg[0]];
            return giftStore
        }
    } catch {
        console.error(error);
        return []
    }
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