import { create } from 'zustand'

export type Tool = 'select' | 'hand' | 'pen' | 'line' | 'rect' | 'ellipse' | 'arrow' | 'text' | 'eraser'

/** Marker colors, chalk white first (the default on a dark board). */
export const STROKE_COLORS = ['#ece9df', '#ff7a6b', '#5cc8ff', '#b6f36a', '#ffc04d', '#b79bff'] as const
export const STROKE_WIDTHS = { thin: 2, medium: 4, thick: 8 } as const
export const FONT_SIZES = { small: 18, medium: 28, large: 44 } as const

export interface DrawStyle {
  stroke: string
  width: number
  /** Fill rectangles and ellipses with a translucent version of the stroke color */
  filled: boolean
  fontSize: number
}

interface UiState {
  /** Where to go after the visitor picks a guest name; null when the dialog is closed */
  nameDialogNext: string | null
  openNameDialog: (next?: string) => void
  closeNameDialog: () => void

  tool: Tool
  setTool: (tool: Tool) => void
  style: DrawStyle
  setStyle: (patch: Partial<DrawStyle>) => void
}

export const useUiStore = create<UiState>((set) => ({
  nameDialogNext: null,
  openNameDialog: (next = '/boards') => set({ nameDialogNext: next }),
  closeNameDialog: () => set({ nameDialogNext: null }),

  tool: 'pen',
  setTool: (tool) => set({ tool }),
  style: { stroke: STROKE_COLORS[0], width: STROKE_WIDTHS.medium, filled: false, fontSize: FONT_SIZES.medium },
  setStyle: (patch) => set((s) => ({ style: { ...s.style, ...patch } })),
}))

/** Translucent fill derived from a stroke color, e.g. #ff7a6b → #ff7a6b33. */
export const fillFor = (stroke: string) => `${stroke}33`
