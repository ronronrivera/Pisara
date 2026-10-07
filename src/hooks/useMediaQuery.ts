import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Phones and small tablets: fewer cursors, no bloom. */
export const useIsSmallScreen = () => useMediaQuery('(max-width: 767px)')

/** True for mouse/trackpad, false for touch-only devices. */
export const useHasFinePointer = () => useMediaQuery('(hover: hover) and (pointer: fine)')
