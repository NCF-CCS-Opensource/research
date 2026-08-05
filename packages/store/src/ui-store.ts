import { create } from 'zustand'

export interface UIStoreState {
  isSidebarOpen: boolean
  activeModal: string | null
  setSidebarOpen: (open: boolean) => void
  setActiveModal: (modal: string | null) => void
}

export const useUIStore = create<UIStoreState>((set) => ({
  isSidebarOpen: false,
  activeModal: null,
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setActiveModal: (activeModal) => set({ activeModal }),
}))
