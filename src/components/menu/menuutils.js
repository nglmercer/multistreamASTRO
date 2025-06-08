const hoverStyles = `
<style>
    .dropdown-item {
        background: #222c3a;
        border-radius: 8px;
        padding: 4px 8px;
        display: flex;
        flex-direction: row;
        align-items: center;
        cursor: pointer;
        height: 48px;
        font-size: 12pt;
        width: 100%;
    }
    .dropdown-item:hover {
        background: #2e3e53;
    }
</style>
`;

function openPopup(element, popupId = "custom-popup") {
    // Asegurar que popupId tenga el símbolo # para querySelector
    const selector = popupId.startsWith('#') ? popupId : `#${popupId}`;
    
    // Buscar el elemento popup
    const popupElement = document.querySelector(selector);
    
    // Validar que el popup existe
    if (!popupElement) {
        console.error(`Popup con ID '${popupId}' no encontrado en el DOM`);
        console.warn('Elementos disponibles con clase popup:', 
            document.querySelectorAll('[class*="popup"]'));
        return false;
    }
    
    // Validar que el popup tiene el método showAtElement
    if (typeof popupElement.showAtElement !== 'function') {
        console.error(`El elemento popup no tiene el método 'showAtElement'`);
        return false;
    }
    
    console.log("element openPopup", element);
    
    let targetElement;
    
    // Manejar diferentes tipos de elemento
    if (typeof element === "string") {
        // Si es string, buscar el elemento
        targetElement = document.querySelector(element);
        if (!targetElement) {
            console.error(`Elemento con selector '${element}' no encontrado`);
            targetElement = popupElement; // Fallback al popup mismo
        }
    } else if (element && element.nodeType === Node.ELEMENT_NODE) {
        // Si es un elemento DOM válido
        targetElement = element;
    } else {
        console.warn("Elemento no válido, usando el popup como referencia");
        targetElement = popupElement;
    }
    
    try {
        // Intentar mostrar el popup
        popupElement.showAtElement(targetElement);
        console.log("Popup mostrado exitosamente:", targetElement, popupId);
        return true;
    } catch (error) {
        console.error("Error al mostrar el popup:", error);
        return false;
    }
}
function returnexploreroptions(idName, textName, iconName, callback) {
    return  {
      id: idName,
      text: textName,
      icon: iconName,
      callback: () => {
        callback();
      }
    }
  }
function setPopupOptions(popupOptions, popupId = "custom-popup"){
    const popupElement = document.querySelector(popupId);
    popupElement.options = popupOptions;
}
function returnOptions(arrayOptions){
    if (!arrayOptions || arrayOptions?.length === 0) return [];
    const popupOptions = arrayOptions.map(option => ({
        html: `${hoverStyles}
            <div class="dropdown-item">
                <span class="material-symbols-rounded">${option.icon}</span>
                <span class="default-font">${option.text}</span>
            </div>
        `,
        callback: (e) => option.callback(e)
    }));
    return popupOptions;
}
export { openPopup, returnexploreroptions, setPopupOptions,returnOptions };