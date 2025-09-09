<template>
  <div 
    :class="['dropdown-container', props.class]" 
    :id="`dropdown-container-${uniqueId}`"
    ref="containerRef"
  >
    <button 
      class="dropdown-button" 
      :id="`vue-dropdown-btn-${uniqueId}`"
      ref="buttonRef"
      @click="handleButtonClick"
    >
      {{ props.buttonText }}
      <span :class="['dropdown-arrow', { open: isOpen }]">▼</span>
    </button>

    <div 
      :class="['dropdown-menu', { open: isOpen }]" 
      :id="`vue-dropdown-menu-${uniqueId}`"
      ref="menuRef"
      @click="handleMenuClick"
    >
      <div class="dropdown-content">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'

interface Props {
  buttonText: string
  class?: string
  id?: string
}

interface Position {
  vertical: 'above' | 'below'
  horizontal: 'left-align' | 'right-align' | 'center'
  availableHeight: number
  maxWidth: number
  buttonRect: DOMRect
  containerRect: DOMRect
  margin: number
}

const props = withDefaults(defineProps<Props>(), {
  class: '',
  id: ''
})

const isOpen = ref(false)
const buttonRef = ref<HTMLButtonElement>()
const menuRef = ref<HTMLDivElement>()
const containerRef = ref<HTMLDivElement>()

const uniqueId = computed(() => props.id || `dropdown-${Math.random().toString(36).substr(2, 9)}`)

const getBestPosition = (): Position | null => {
  if (!buttonRef.value || !menuRef.value) return null

  const buttonRect = buttonRef.value.getBoundingClientRect()
  const containerRect = containerRef.value!.getBoundingClientRect()
  
  // Hacer el menú temporalmente visible para medir sus dimensiones
  const originalDisplay = menuRef.value.style.display
  const originalVisibility = menuRef.value.style.visibility
  const originalOpacity = menuRef.value.style.opacity
  
  menuRef.value.style.display = 'block'
  menuRef.value.style.visibility = 'hidden'
  menuRef.value.style.opacity = '0'
  menuRef.value.style.position = 'absolute'
  menuRef.value.style.top = '0'
  menuRef.value.style.left = '0'
  menuRef.value.style.right = 'auto'
  menuRef.value.style.bottom = 'auto'
  
  const menuRect = menuRef.value.getBoundingClientRect()
  
  // Restaurar estilos originales
  menuRef.value.style.display = originalDisplay
  menuRef.value.style.visibility = originalVisibility
  menuRef.value.style.opacity = originalOpacity

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const margin = 8 // Margen de seguridad

  // Calcular espacios disponibles
  const spaceAbove = buttonRect.top - margin
  const spaceBelow = viewportHeight - buttonRect.bottom - margin

  // Determinar la mejor posición vertical
  let verticalPosition: 'above' | 'below' = 'below' // default
  let availableHeight = spaceBelow

  if (menuRect.height > spaceBelow && spaceAbove > spaceBelow) {
    verticalPosition = 'above'
    availableHeight = spaceAbove
  }

  // Determinar la mejor posición horizontal
  let horizontalPosition: 'left-align' | 'right-align' | 'center' = 'left-align' // default
  
  // Si el menú se desborda por la derecha
  if (buttonRect.left + menuRect.width > viewportWidth - margin) {
    // Intentar alinear con el borde derecho del botón
    if (buttonRect.right - menuRect.width >= margin) {
      horizontalPosition = 'right-align'
    } else {
      // Si aún se desborda, centrarlo en el viewport
      horizontalPosition = 'center'
    }
  }

  // Si el menú es muy ancho, intentar reducir su ancho máximo
  const maxWidth = Math.min(
    viewportWidth - 2 * margin,
    Math.max(buttonRect.width, 450) // Mínimo 450px o el ancho del botón
  )

  return {
    vertical: verticalPosition,
    horizontal: horizontalPosition,
    availableHeight,
    maxWidth,
    buttonRect,
    containerRect,
    margin
  }
}

const positionMenu = () => {
  if (!buttonRef.value || !menuRef.value) return

  const position = getBestPosition()
  if (!position) return

  // Resetear todos los estilos de posicionamiento
  menuRef.value.style.top = ''
  menuRef.value.style.bottom = ''
  menuRef.value.style.left = ''
  menuRef.value.style.right = ''
  menuRef.value.style.marginTop = ''
  menuRef.value.style.marginBottom = ''
  menuRef.value.style.transform = ''

  // Establecer ancho máximo
  menuRef.value.style.maxWidth = `${position.maxWidth}px`

  // Posicionamiento vertical
  if (position.vertical === 'above') {
    menuRef.value.style.bottom = '100%'
    menuRef.value.style.marginBottom = `${position.margin}px`
    menuRef.value.classList.add('dropdown-above')
    menuRef.value.classList.remove('dropdown-below')
  } else {
    menuRef.value.style.top = '100%'
    menuRef.value.style.marginTop = `${position.margin}px`
    menuRef.value.classList.add('dropdown-below')
    menuRef.value.classList.remove('dropdown-above')
  }

  // Posicionamiento horizontal
  switch (position.horizontal) {
    case 'right-align':
      menuRef.value.style.right = '0'
      menuRef.value.style.left = 'auto'
      break
    case 'center':
      menuRef.value.style.left = '50%'
      menuRef.value.style.transform = 'translateX(-50%)'
      break
    default: // 'left-align'
      menuRef.value.style.left = '0'
      menuRef.value.style.right = 'auto'
      break
  }

  // Limitar altura si es necesario
  if (position.availableHeight < 200) {
    menuRef.value.style.maxHeight = `${Math.max(position.availableHeight, 150)}px`
    const content = menuRef.value.querySelector('.dropdown-content') as HTMLElement
    if (content) {
      content.style.overflowY = 'auto'
      content.style.maxHeight = `${Math.max(position.availableHeight - 20, 130)}px`
    }
  } else {
    menuRef.value.style.maxHeight = ''
    const content = menuRef.value.querySelector('.dropdown-content') as HTMLElement
    if (content) {
      content.style.overflowY = ''
      content.style.maxHeight = ''
    }
  }

  // Ajuste final: verificar si aún se sale del viewport
  requestAnimationFrame(() => {
    if (!menuRef.value) return
    const finalRect = menuRef.value.getBoundingClientRect()
    
    // Ajuste horizontal fino
    if (finalRect.left < position.margin) {
      const shift = position.margin - finalRect.left
      if (menuRef.value.style.transform.includes('translateX')) {
        const currentTransform = menuRef.value.style.transform
        menuRef.value.style.transform = currentTransform.replace(
          /translateX\([^)]+\)/,
          `translateX(calc(-50% + ${shift}px))`
        )
      } else {
        const currentLeft = parseFloat(menuRef.value.style.left) || 0
        menuRef.value.style.left = `${currentLeft + shift}px`
      }
    } else if (finalRect.right > window.innerWidth - position.margin) {
      const shift = finalRect.right - (window.innerWidth - position.margin)
      if (menuRef.value.style.transform.includes('translateX')) {
        const currentTransform = menuRef.value.style.transform
        menuRef.value.style.transform = currentTransform.replace(
          /translateX\([^)]+\)/,
          `translateX(calc(-50% - ${shift}px))`
        )
      } else if (menuRef.value.style.right !== 'auto' && menuRef.value.style.right !== '') {
        const currentRight = parseFloat(menuRef.value.style.right) || 0
        menuRef.value.style.right = `${currentRight + shift}px`
      } else {
        const currentLeft = parseFloat(menuRef.value.style.left) || 0
        menuRef.value.style.left = `${currentLeft - shift}px`
      }
    }
  })
}

const resetMenuStyles = () => {
  if (!menuRef.value) return
  
  menuRef.value.style.top = ''
  menuRef.value.style.bottom = ''
  menuRef.value.style.left = ''
  menuRef.value.style.right = ''
  menuRef.value.style.marginTop = ''
  menuRef.value.style.marginBottom = ''
  menuRef.value.style.transform = ''
  menuRef.value.style.maxWidth = ''
  menuRef.value.style.maxHeight = ''
  menuRef.value.classList.remove('dropdown-above', 'dropdown-below')
  
  const content = menuRef.value.querySelector('.dropdown-content') as HTMLElement
  if (content) {
    content.style.overflowY = ''
    content.style.maxHeight = ''
  }
}

const toggleDropdown = async () => {
  isOpen.value = !isOpen.value

  if (isOpen.value && menuRef.value) {
    // Usar nextTick para asegurar que los estilos se apliquen
    await nextTick()
    requestAnimationFrame(() => {
      positionMenu()
    })
  } else if (menuRef.value) {
    // Resetear estilos al cerrar
    resetMenuStyles()
  }
}

const closeDropdown = () => {
  if (!isOpen.value) return
  isOpen.value = false
  if (menuRef.value) {
    resetMenuStyles()
  }
}

const handleButtonClick = (e: MouseEvent) => {
  e.stopPropagation()
  toggleDropdown()
}

const handleDocumentClick = (e: Event) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node) && isOpen.value) {
    closeDropdown()
  }
}

const handleMenuClick = (e: MouseEvent) => {
  e.stopPropagation()
}

const handleResize = () => {
  if (isOpen.value) {
    requestAnimationFrame(() => {
      positionMenu()
    })
  }
}

const handleScroll = () => {
  if (isOpen.value) {
    requestAnimationFrame(() => {
      positionMenu()
    })
  }
}

onMounted(() => {
  // Agregar event listeners
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  // Limpiar event listeners
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleScroll)
})
</script>
<style scoped>
.dropdown-container {
  /* Light mode palette (default) */
  --dropdown-bg-gradient-start: #667eea;
  --dropdown-bg-gradient-end: #764ba2;
  --dropdown-button-text-color: white;
  --dropdown-button-shadow-color: rgba(102, 126, 234, 0.3);
  --dropdown-button-shadow-hover-color: rgba(102, 126, 234, 0.4);

  --dropdown-menu-bg-color: white;
  --dropdown-menu-border-color: #e2e8f0;
  --dropdown-menu-shadow-color: rgba(0, 0, 0, 0.15);
  --dropdown-menu-text-color: #333;

  --scrollbar-track-bg-color: #f1f1f1;
  --scrollbar-thumb-bg-color: #c1c1c1;
  --scrollbar-thumb-hover-bg-color: #a8a8a8;

  --page-bg-color: #f9fafb;
  --page-text-color: #1f2937;
  
  position: relative;
  display: inline-block;
}

@media (prefers-color-scheme: dark) {
  .dropdown-container {
    /* Dark mode palette */
    --dropdown-bg-gradient-start: #5a67d8;
    --dropdown-bg-gradient-end: #5a4ba2;
    --dropdown-button-text-color: #e2e8f0;
    --dropdown-button-shadow-color: rgba(30, 41, 59, 0.5);
    --dropdown-button-shadow-hover-color: rgba(30, 41, 59, 0.7);

    --dropdown-menu-bg-color: #2d3748;
    --dropdown-menu-border-color: #4a5568;
    --dropdown-menu-shadow-color: rgba(0, 0, 0, 0.4);
    --dropdown-menu-text-color: #e2e8f0;

    --scrollbar-track-bg-color: #1a202c;
    --scrollbar-thumb-bg-color: #4a5568;
    --scrollbar-thumb-hover-bg-color: #718096;

    --page-bg-color: #1a202c;
    --page-text-color: #e2e8f0;
  }
}

.dropdown-button {
  background: var(--dropdown-bg-gradient-start);
  color: var(--dropdown-button-text-color);
  border: 1px solid var(--dropdown-bg-gradient-end);
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.dropdown-button:hover {
  background: var(--dropdown-bg-gradient-end);
  border-color: var(--dropdown-bg-gradient-start);
}

.dropdown-button:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.dropdown-arrow {
  transition: transform 0.2s ease;
  font-size: 12px;
  color: var(--dropdown-button-text-color);
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  background: var(--dropdown-menu-bg-color);
  color: var(--dropdown-menu-text-color);
  border: 1px solid var(--dropdown-menu-border-color);
  border-radius: 4px;
  box-shadow: 0 4px 6px var(--dropdown-menu-shadow-color);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.2s ease;
  min-width: 150px;
}

.dropdown-menu.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-menu.dropdown-above {
  transform: translateY(10px);
}

.dropdown-menu.dropdown-above.open {
  transform: translateY(0);
}

.dropdown-content {
  padding: 4px;
}

/* Scrollbar styling for dropdown content */
.dropdown-content::-webkit-scrollbar {
  width: 6px;
}

.dropdown-content::-webkit-scrollbar-track {
  background: var(--scrollbar-track-bg-color);
  border-radius: 3px;
}

.dropdown-content::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb-bg-color);
  border-radius: 3px;
}

.dropdown-content::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover-bg-color);
}
</style>