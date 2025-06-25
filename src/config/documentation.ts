// src/config/documentation.js
export interface DocumentationPage {
  name: string;
  icon: string;
  slot: string;
  order: number;
}

export interface DocumentationConfig {
  [key: string]: DocumentationPage;
}


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
    order: 5 // ANTES: 5
  },
  tts: {
    name: "Text to Speech", // Corregido typo
    icon: "volume_down",
    slot: "docs/widget/tts",
    order: 6 // ANTES: 6
  },
  minecraft: {
    name: "Minecraft", // Corregido a mayúscula
    icon: "package_2",
    slot: "docs/widget/minecraft",
    order: 7 // ANTES: 6 (esto era el error principal aquí)
  },
  apiReference: {
    name: "API Reference",
    icon: "code",
    slot: "docs/apiReference",
    order: 8 // ANTES: 8
  }
};


export interface AdjacentPages {
  prevPage: DocumentationPage | null;
  nextPage: DocumentationPage | null;
}

// Función helper para obtener páginas ordenadas
export function getOrderedDocPages(): DocumentationPage[] {
  return Object.values(documentationConfig)
    .sort((a, b) => a.order - b.order);
}

// Función para obtener página anterior/siguiente (si la quieres tener aquí)
export function getAdjacentPages(fullCurrentSlot: string): AdjacentPages {
  const orderedPages = getOrderedDocPages();
  const currentIndex = orderedPages.findIndex(page => page.slot === fullCurrentSlot);
  
  if (currentIndex === -1) {
    return { prevPage: null, nextPage: null };
  }
  
  const prevPage = currentIndex > 0 ? orderedPages[currentIndex - 1] : null;
  const nextPage = currentIndex < orderedPages.length - 1 ? orderedPages[currentIndex + 1] : null;
  
  return { prevPage, nextPage };
}