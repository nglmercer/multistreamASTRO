class Logger {
    constructor(categories = {}, showCategoryName = true) {
        this.categories = categories; // Objeto para almacenar las categorías de log
        this.showCategoryName = showCategoryName; // Control para mostrar el nombre de la categoría al inicio del log
    }
  
    // Método para agregar una nueva categoría y su estado inicial (activada/desactivada)
    addCategory(category, enabled = true) {
        if (!this.categories.hasOwnProperty(category)) {
            this.categories[category] = enabled;
        } else {
            console.warn(`La categoría '${category}' ya existe.`);
        }
    }
  
    // Método para activar o desactivar logs de una categoría específica
    toggleCategory(category, enabled) {
        if (this.categories.hasOwnProperty(category)) {
            this.categories[category] = enabled;
        } else {
            console.warn(`La categoría '${category}' no existe. Usa addCategory() para agregarla.`);
        }
    }
  
    // Método para activar o desactivar la visualización del nombre de la categoría en los logs
    toggleShowCategoryName(show) {
        this.showCategoryName = show;
    }
  
    // Método para verificar si una categoría está habilitada
    isCategoryEnabled(category) {
        return !!this.categories[category];
    }
  
    // Método para crear un log en una categoría específica, soporta varios tipos de datos
    log(category, ...messages) {
        if (this.isCategoryEnabled(category)) {
            console.group(`[${category.toUpperCase()}]`);
            messages.forEach(message => {
                let logMessage = this.showCategoryName ? `${category}: ` : '';
                
                if (typeof message === 'object') {
                    console.log(message); // Formato tabular para arrays y objetos
                } else {
                    console.log(logMessage + message);  // Agrega prefijo de categoría en el caso de strings y otros tipos
                }
            });
            console.groupEnd();
        }
    }
    warn(category, ...messages) {
        if (this.isCategoryEnabled(category)) {
            console.group(`[${category.toUpperCase()}]`);
            messages.forEach(message => {
                let logMessage = this.showCategoryName ? `${category}: ` : '';
                
                if (typeof message === 'object') {
                    console.warn(message); // Formato tabular para arrays y objetos
                } else {
                    console.warn(logMessage + message);  // Agrega prefijo de categoría en el caso de strings y otros tipos
                }
            });
            console.groupEnd();
        }
    }
    error(category, ...messages) {
        if (this.isCategoryEnabled(category)) {
            console.group(`[${category.toUpperCase()}]`);
            messages.forEach(message => {
                let logMessage = this.showCategoryName ? `${category}: ` : '';
                
                if (typeof message === 'object') {
                    console.error(message); // Formato tabular para arrays y objetos
                } else {
                    console.error(logMessage + message);  // Agrega prefijo de categoría en el caso de strings y otros tipos
                }
            });
            console.groupEnd();
        }
    }
    // Método para listar todas las categorías de log existentes
    listCategories() {
        return Object.keys(this.categories);
    }
  }
  
  // Ejemplo de uso:
export  const logger = new Logger({debug: true, info: true}, false);
  
  
  // Añadir categorías dinámicamente
  // logger.addCategory('datos'); // Habilitada por defecto
  // logger.addCategory('valores'); // Habilitada por defecto
  logger.addCategory('speechchat', true);
  logger.addCategory('minecraft', false);
  logger.addCategory('Event', true);
  logger.addCategory('Action', true);
  logger.addCategory('EventAction', true);
  logger.addCategory('renderhtml', true);

  logger.addCategory('evalueChat', true);
  logger.addCategory('evalueGift', true);
  logger.addCategory('evalueLikes', true);
  logger.addCategory('evalueBits', true);
  logger.addCategory('originEvalue', true);

  logger.addCategory('event', true);

  logger.toggleCategory('event', false);
  logger.addCategory('solidjs', true);
export default logger;