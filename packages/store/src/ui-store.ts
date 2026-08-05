import { create } from 'zustand'

export interface UIStoreState {
  isSidebarOpen: boolean
  activeModal: string | null
  isPdfAccessModalOpen: boolean
  isFilterDrawerOpen: boolean
  searchDraft: string
  themePreference: 'system' | 'light' | 'dark'
  setSidebarOpen: (open: boolean) => void
  setActiveModal: (modal: string | null) => void
  setPdfAccessModalOpen: (open: boolean) => void
  setFilterDrawerOpen: (open: boolean) => void
  setSearchDraft: (draft: string) => void
  setThemePreference: (theme: 'system' | 'light' | 'dark') => void
}

export const useUIStore = create<UIStoreState>((set) => ({
  isSidebarOpen: false,
  activeModal: null,
  isPdfAccessModalOpen: false,
  isFilterDrawerOpen: false,
  searchDraft: '',
  themePreference: 'system',
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setActiveModal: (activeModal) => set({ activeModal }),
  setPdfAccessModalOpen: (isPdfAccessModalOpen) => set({ isPdfAccessModalOpen }),
  setFilterDrawerOpen: (isFilterDrawerOpen) => set({ isFilterDrawerOpen }),
  setSearchDraft: (searchDraft) => set({ searchDraft }),
  setThemePreference: (themePreference) => set({ themePreference }),
}))
