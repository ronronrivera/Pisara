import { createBrowserRouter } from 'react-router'
import RequireAuth from '../components/auth/RequireAuth'
import Landing from '../pages/Landing'

// Everything except the landing page is code-split, so first-time visitors
// don't download auth or dashboard code.
const page = (load: () => Promise<{ default: React.ComponentType }>, protectedRoute = false) => async () => {
  const { default: Page } = await load()
  return { Component: protectedRoute ? () => <RequireAuth><Page /></RequireAuth> : Page }
}

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', lazy: page(() => import('../pages/Login')) },
  { path: '/auth/callback', lazy: page(() => import('../pages/AuthCallback')) },
  { path: '/boards', lazy: page(() => import('../pages/Dashboard'), true) },
  { path: '/b/:id', lazy: page(() => import('../pages/Board'), true) },
  { path: '/join/:token', lazy: page(() => import('../pages/Join')) },
])
