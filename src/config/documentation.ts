// Interfaces
export interface DocumentationPage {
  name: string;
  icon: string;
  slot: string;
  order: number;
}

export interface DocumentationConfig {
  [key: string]: DocumentationPage;
}

export interface AdjacentPages {
  prevPage: DocumentationPage | null;
  nextPage: DocumentationPage | null;
}

// Configuración de páginas de documentación
export const documentationConfig: DocumentationConfig = {
  introduccion: {
    name: "Introducción",
    icon: "menu_book",
    slot: "docs/introduccion",
    order: 1
  },
  instalacion: {
    name: "Instalación",
    icon: "download",
    slot: "docs/instalacion", 
    order: 2
  },
  configuracion: {
    name: "Configuración",
    icon: "settings",
    slot: "docs/configuracion",
    order: 3
  },
  componentes: {
    name: "Componentes",
    icon: "widgets",
    slot: "docs/componentes",
    order: 4
  },
  overlay: {
    name: "Overlay",
    icon: "filter",
    slot: "docs/widget/overlay",
    order: 5
  },
  apiReference: {
    name: "API Reference",
    icon: "code",
    slot: "docs/api-reference",
    order: 7
  }
};

export const documentationConfigs: DocumentationConfig = {
  introduccion: {
    name: "Introducción",
    icon: "home",
    slot: "docs/introduccion",
    order: 1
  },
  instalacion: {
    name: "Instalación",
    icon: "download",
    slot: "docs/instalacion", 
    order: 2
  },
  configuracion: {
    name: "Configuración",
    icon: "settings",
    slot: "docs/configuracion",
    order: 3
  },
  componentes: {
    name: "Componentes",
    icon: "widgets",
    slot: "docs/componentes",
    order: 4
  },
  apiReference: {
    name: "API Reference",
    icon: "code",
    slot: "docs/api-reference",
    order: 5
  }
};

// Función helper para obtener páginas ordenadas
export function getOrderedDocPages(): [string, DocumentationPage][] {
  return Object.entries(documentationConfig)
    .sort(([,a], [,b]) => a.order - b.order);
}

// Función para obtener página anterior/siguiente
export function getAdjacentPages(currentSlot: string): AdjacentPages {
  const orderedPages = getOrderedDocPages();
  const currentIndex = orderedPages.findIndex(([, page]) => page.slot === currentSlot);
  
  const prevPage = currentIndex > 0 ? orderedPages[currentIndex - 1][1] : null;
  const nextPage = currentIndex < orderedPages.length - 1 ? orderedPages[currentIndex + 1][1] : null;
  
  return { prevPage, nextPage };
}