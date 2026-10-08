import { create } from 'zustand'

interface UiState {
  /** Where to go after the visitor picks a guest name; null when the dialog is closed */
  nameDialogNext: string | null
  openNameDialog: (next?: string) => void
  closeNameDialog: () => void
}

export const useUiStore = create<UiState>((set) => ({
  nameDialogNext: null,
  openNameDialog: (next = '/boards') => set({ nameDialogNext: next }),
  closeNameDialog: () => set({ nameDialogNext: null }),
}))
