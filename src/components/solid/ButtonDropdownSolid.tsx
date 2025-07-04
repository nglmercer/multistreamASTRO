import { type Component, createSignal, onMount, onCleanup, type JSX, createUniqueId } from 'solid-js';
import './ButtonDropdownSolid.css';

export interface ButtonDropdownProps {
  buttonText: string;
  class?: string;
  id?: string;
  children?: JSX.Element;
}

interface Position {
  vertical: 'above' | 'below';
  horizontal: 'left-align' | 'right-align' | 'center';
  availableHeight: number;
  maxWidth: number;
  buttonRect: DOMRect;
  containerRect: DOMRect;
  margin: number;
}

const ButtonDropdownSolid: Component<ButtonDropdownProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const uniqueId = () => props.id || createUniqueId();
  
  let buttonRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  const getBestPosition = (): Position | null => {
    if (!buttonRef || !menuRef) return null;

    const buttonRect = buttonRef.getBoundingClientRect();
    const containerRect = containerRef!.getBoundingClientRect();
    
    // Hacer el menú temporalmente visible para medir sus dimensiones
    const originalDisplay = menuRef.style.display;
    const originalVisibility = menuRef.style.visibility;
    const originalOpacity = menuRef.style.opacity;
    
    menuRef.style.display = 'block';
    menuRef.style.visibility = 'hidden';
    menuRef.style.opacity = '0';
    menuRef.style.position = 'absolute';
    menuRef.style.top = '0';
    menuRef.style.left = '0';
    menuRef.style.right = 'auto';
    menuRef.style.bottom = 'auto';
    
    const menuRect = menuRef.getBoundingClientRect();
    
    // Restaurar estilos originales
    menuRef.style.display = originalDisplay;
    menuRef.style.visibility = originalVisibility;
    menuRef.style.opacity = originalOpacity;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8; // Margen de seguridad

    // Calcular espacios disponibles
    const spaceAbove = buttonRect.top - margin;
    const spaceBelow = viewportHeight - buttonRect.bottom - margin;

    // Determinar la mejor posición vertical
    let verticalPosition: 'above' | 'below' = 'below'; // default
    let availableHeight = spaceBelow;

    if (menuRect.height > spaceBelow && spaceAbove > spaceBelow) {
      verticalPosition = 'above';
      availableHeight = spaceAbove;
    }

    // Determinar la mejor posición horizontal
    let horizontalPosition: 'left-align' | 'right-align' | 'center' = 'left-align'; // default
    
    // Si el menú se desborda por la derecha
    if (buttonRect.left + menuRect.width > viewportWidth - margin) {
      // Intentar alinear con el borde derecho del botón
      if (buttonRect.right - menuRect.width >= margin) {
        horizontalPosition = 'right-align';
      } else {
        // Si aún se desborda, centrarlo en el viewport
        horizontalPosition = 'center';
      }
    }

    // Si el menú es muy ancho, intentar reducir su ancho máximo
    const maxWidth = Math.min(
      viewportWidth - 2 * margin,
      Math.max(buttonRect.width, 450) // Mínimo 300px o el ancho del botón
    );

    return {
      vertical: verticalPosition,
      horizontal: horizontalPosition,
      availableHeight,
      maxWidth,
      buttonRect,
      containerRect,
      margin
    };
  };

  const positionMenu = () => {
    if (!buttonRef || !menuRef) return;

    const position = getBestPosition();
    if (!position) return;

    // Resetear todos los estilos de posicionamiento
    menuRef.style.top = '';
    menuRef.style.bottom = '';
    menuRef.style.left = '';
    menuRef.style.right = '';
    menuRef.style.marginTop = '';
    menuRef.style.marginBottom = '';
    menuRef.style.transform = '';

    // Establecer ancho máximo
    menuRef.style.maxWidth = `${position.maxWidth}px`;

    // Posicionamiento vertical
    if (position.vertical === 'above') {
      menuRef.style.bottom = '100%';
      menuRef.style.marginBottom = `${position.margin}px`;
      menuRef.classList.add('dropdown-above');
      menuRef.classList.remove('dropdown-below');
    } else {
      menuRef.style.top = '100%';
      menuRef.style.marginTop = `${position.margin}px`;
      menuRef.classList.add('dropdown-below');
      menuRef.classList.remove('dropdown-above');
    }

    // Posicionamiento horizontal
    switch (position.horizontal) {
      case 'right-align':
        menuRef.style.right = '0';
        menuRef.style.left = 'auto';
        break;
      case 'center':
        menuRef.style.left = '50%';
        menuRef.style.transform = 'translateX(-50%)';
        break;
      default: // 'left-align'
        menuRef.style.left = '0';
        menuRef.style.right = 'auto';
        break;
    }

    // Limitar altura si es necesario
    if (position.availableHeight < 200) {
      menuRef.style.maxHeight = `${Math.max(position.availableHeight, 150)}px`;
      const content = menuRef.querySelector('.dropdown-content') as HTMLElement;
      if (content) {
        content.style.overflowY = 'auto';
        content.style.maxHeight = `${Math.max(position.availableHeight - 20, 130)}px`;
      }
    } else {
      menuRef.style.maxHeight = '';
      const content = menuRef.querySelector('.dropdown-content') as HTMLElement;
      if (content) {
        content.style.overflowY = '';
        content.style.maxHeight = '';
      }
    }

    // Ajuste final: verificar si aún se sale del viewport
    requestAnimationFrame(() => {
      if (!menuRef) return;
      const finalRect = menuRef.getBoundingClientRect();
      
      // Ajuste horizontal fino
      if (finalRect.left < position.margin) {
        const shift = position.margin - finalRect.left;
        if (menuRef.style.transform.includes('translateX')) {
          const currentTransform = menuRef.style.transform;
          menuRef.style.transform = currentTransform.replace(
            /translateX\([^)]+\)/,
            `translateX(calc(-50% + ${shift}px))`
          );
        } else {
          const currentLeft = parseFloat(menuRef.style.left) || 0;
          menuRef.style.left = `${currentLeft + shift}px`;
        }
      } else if (finalRect.right > window.innerWidth - position.margin) {
        const shift = finalRect.right - (window.innerWidth - position.margin);
        if (menuRef.style.transform.includes('translateX')) {
          const currentTransform = menuRef.style.transform;
          menuRef.style.transform = currentTransform.replace(
            /translateX\([^)]+\)/,
            `translateX(calc(-50% - ${shift}px))`
          );
        } else if (menuRef.style.right !== 'auto' && menuRef.style.right !== '') {
          const currentRight = parseFloat(menuRef.style.right) || 0;
          menuRef.style.right = `${currentRight + shift}px`;
        } else {
          const currentLeft = parseFloat(menuRef.style.left) || 0;
          menuRef.style.left = `${currentLeft - shift}px`;
        }
      }
    });
  };

  const resetMenuStyles = () => {
    if (!menuRef) return;
    
    menuRef.style.top = '';
    menuRef.style.bottom = '';
    menuRef.style.left = '';
    menuRef.style.right = '';
    menuRef.style.marginTop = '';
    menuRef.style.marginBottom = '';
    menuRef.style.transform = '';
    menuRef.style.maxWidth = '';
    menuRef.style.maxHeight = '';
    menuRef.classList.remove('dropdown-above', 'dropdown-below');
    
    const content = menuRef.querySelector('.dropdown-content') as HTMLElement;
    if (content) {
      content.style.overflowY = '';
      content.style.maxHeight = '';
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen());

    if (!isOpen() && menuRef) {
      // Usar requestAnimationFrame para asegurar que los estilos se apliquen
      requestAnimationFrame(() => {
        positionMenu();
      });
    } else if (menuRef) {
      // Resetear estilos al cerrar
      resetMenuStyles();
    }
  };

  const closeDropdown = () => {
    if (!isOpen()) return;
    setIsOpen(false);
    if (menuRef) {
      resetMenuStyles();
    }
  };

  const handleButtonClick = (e: MouseEvent) => {
    e.stopPropagation();
    toggleDropdown();
  };

  const handleDocumentClick = (e: Event) => {
    if (containerRef && !containerRef.contains(e.target as Node) && isOpen()) {
      closeDropdown();
    }
  };

  const handleMenuClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleResize = () => {
    if (isOpen()) {
      requestAnimationFrame(() => {
        positionMenu();
      });
    }
  };

  const handleScroll = () => {
    if (isOpen()) {
      requestAnimationFrame(() => {
        positionMenu();
      });
    }
  };

  onMount(() => {
    // Agregar event listeners
    document.addEventListener('click', handleDocumentClick);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
  });

  onCleanup(() => {
    // Limpiar event listeners
    document.removeEventListener('click', handleDocumentClick);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('scroll', handleScroll);
  });

  return (
    <div 
      class={`dropdown-container ${props.class || ''}`} 
      id={`dropdown-container-${uniqueId()}`}
      ref={containerRef}
    >
      <button 
        class="dropdown-button" 
        id={`solid-dropdown-btn-${uniqueId()}`}
        ref={buttonRef}
        onClick={handleButtonClick}
      >
        {props.buttonText}
        <span class={`dropdown-arrow ${isOpen() ? 'open' : ''}`}>▼</span>
      </button>

      <div 
        class={`dropdown-menu ${isOpen() ? 'open' : ''}`} 
        id={`solid-dropdown-menu-${uniqueId()}`}
        ref={menuRef}
        onClick={handleMenuClick}
      >
        <div class="dropdown-content">
          {props.children}
        </div>
      </div>
    </div>
  );
};

export default ButtonDropdownSolid;