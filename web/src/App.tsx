import { useAuth } from './auth/AuthContext'
import Authenticated from './components/Authenticated'
import Unauthenticated from './components/Unauthenticated'

// The root component only decides which view to show; each view owns its own logic.
export default function App() {
  const { session, loading } = useAuth()

  return (
    <main className={session ? 'app-shell' : 'page'}>
      {session ? (
        <Authenticated />
      ) : (
        <div className="card">
          <header className="card-header">
            <h1>AI Use Tracker</h1>
            <p>CS 110 TA tools</p>
          </header>
          <div className="card-body">
            {loading ? <p className="muted">Loading...</p> : <Unauthenticated />}
          </div>
        </div>
      )}
    </main>
  )
}
