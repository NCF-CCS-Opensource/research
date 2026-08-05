import { describe, it, expect } from 'vitest'
import { useUIStore } from './ui-store'

describe('useUIStore', () => {
  it('should initialize with default state', () => {
    const state = useUIStore.getState()
    expect(state.isSidebarOpen).toBe(false)
    expect(state.activeModal).toBeNull()
    expect(state.isPdfAccessModalOpen).toBe(false)
    expect(state.isFilterDrawerOpen).toBe(false)
    expect(state.searchDraft).toBe('')
    expect(state.themePreference).toBe('system')
  })

  it('should update sidebar and modal state', () => {
    useUIStore.getState().setSidebarOpen(true)
    useUIStore.getState().setActiveModal('share')
    useUIStore.getState().setPdfAccessModalOpen(true)
    useUIStore.getState().setFilterDrawerOpen(true)
    useUIStore.getState().setSearchDraft('machine learning')
    useUIStore.getState().setThemePreference('dark')

    expect(useUIStore.getState().isSidebarOpen).toBe(true)
    expect(useUIStore.getState().activeModal).toBe('share')
    expect(useUIStore.getState().isPdfAccessModalOpen).toBe(true)
    expect(useUIStore.getState().isFilterDrawerOpen).toBe(true)
    expect(useUIStore.getState().searchDraft).toBe('machine learning')
    expect(useUIStore.getState().themePreference).toBe('dark')
  })
})
