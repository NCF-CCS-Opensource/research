import { describe, it, expect } from 'vitest'
import { useUIStore } from './ui-store'

describe('useUIStore', () => {
  it('should initialize with default state', () => {
    const state = useUIStore.getState()
    expect(state.isSidebarOpen).toBe(false)
    expect(state.activeModal).toBeNull()
  })

  it('should update sidebar and modal state', () => {
    useUIStore.getState().setSidebarOpen(true)
    useUIStore.getState().setActiveModal('share')
    expect(useUIStore.getState().isSidebarOpen).toBe(true)
    expect(useUIStore.getState().activeModal).toBe('share')
  })
})
