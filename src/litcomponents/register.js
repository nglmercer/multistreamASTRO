function registerComponents(components) {
    const registered = [];
    const skipped = [];
    
    for (const [tagName, componentClass] of Object.entries(components)) {
        if (!customElements.get(tagName)) {
            try {
                customElements.define(tagName, componentClass);
                registered.push(tagName);
            } catch (error) {
                console.error(`❌ Error registering ${tagName}:`, error);
            }
        } else {
            skipped.push(tagName);
        }
    }
    
    console.log(`✅ Registered ${registered.length} components:`, registered);
    if (skipped.length > 0) {
        console.log(`⚠️ Skipped ${skipped.length} already registered:`, skipped);
    }
    
    return { registered, skipped };
}
export {
    registerComponents
}