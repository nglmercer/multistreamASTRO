// Uso en TypeScript más avanzado

// ButtonDropdownAdvanced.tsx (SolidJS version with types)
import { createSignal, For,type JSX,type ParentComponent } from 'solid-js';

export interface DropdownItem {
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
    onClick?: () => void;
  }
  
  export interface DropdownProps {
    buttonText: string;
    items?: DropdownItem[];
    class?: string;
    variant?: 'primary' | 'secondary' | 'danger';
  }
  
  const ButtonDropdownAdvanced: ParentComponent<DropdownProps> = (props) => {
    const [isOpen, setIsOpen] = createSignal(false);
  
    const handleItemClick = (item: DropdownItem) => {
      if (!item.disabled && item.onClick) {
        item.onClick();
        setIsOpen(false);
      }
    };
  
    return (
      <div class={`dropdown-container ${props.class || ''}`}>
        <button 
          class={`dropdown-button dropdown-button--${props.variant || 'primary'}`}
          onClick={() => setIsOpen(!isOpen())}
        >
          {props.buttonText}
          <span class={`dropdown-arrow ${isOpen() ? 'open' : ''}`}>▼</span>
        </button>
        
        <div class={`dropdown-menu ${isOpen() ? 'open' : ''}`}>
          <div class="dropdown-content">
            {props.items ? (
              <For each={props.items}>
                {(item) => (
                  <div
                    class={`demo-item ${item.disabled ? 'disabled' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    {item.icon && <span class="item-icon">{item.icon}</span>}
                    {item.label}
                  </div>
                )}
              </For>
            ) : (
              props.children
            )}
          </div>
        </div>
      </div>
    );
  };
  
  export default ButtonDropdownAdvanced;