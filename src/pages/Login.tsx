import { Link } from 'react-router'

export default function Login() {
  // TODO: supabase.auth.signInWithOAuth({ provider: 'github' | 'google', options: { redirectTo: `${env.siteUrl}/auth/callback` } })
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-3xl font-bold">Sign in</h1>
      <p className="text-chalk-dim">GitHub and Google sign-in are coming soon.</p>
      <Link to="/" className="text-sky underline underline-offset-4">
        Back to home
      </Link>
    </main>
  )
}
