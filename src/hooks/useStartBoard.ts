import { useNavigate } from 'react-router'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

/** "Start a board": straight to the dashboard if signed in, otherwise ask for a guest name. */
export function useStartBoard() {
  const status = useAuthStore((s) => s.status)
  const openNameDialog = useUiStore((s) => s.openNameDialog)
  const navigate = useNavigate()
  const signedIn = status === 'guest' || status === 'member'

  return { signedIn, start: () => (signedIn ? navigate('/boards') : openNameDialog('/boards')) }
}
