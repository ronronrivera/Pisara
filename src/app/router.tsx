import { createBrowserRouter } from 'react-router'
import AuthCallback from '../pages/AuthCallback'
import Board from '../pages/Board'
import Dashboard from '../pages/Dashboard'
import Join from '../pages/Join'
import Landing from '../pages/Landing'
import Login from '../pages/Login'

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  { path: '/boards', element: <Dashboard /> },
  { path: '/b/:id', element: <Board /> },
  { path: '/join/:token', element: <Join /> },
  { path: '/auth/callback', element: <AuthCallback /> },
])
