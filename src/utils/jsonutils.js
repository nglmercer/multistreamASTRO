function safeParse(value) {
    if (value == null || typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
        return value;
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        try {
            const fixedJson = trimmed
                .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
                .replace(/:\s*'([^']+)'/g, ': "$1"');
            return JSON.parse(fixedJson);
        } catch (error) {
            console.error("Error al parsear JSON:", error, "Valor recibido:", value);
            return value;
        }
    }
}
export {
    safeParse
}