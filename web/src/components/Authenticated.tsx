import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import Testing from './Testing'

type Tab = 'home' | 'testing'

// Everything a signed-in staff member sees. Only rendered when there is a session.
export default function Authenticated() {
  const { session, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('home')

  return (
    <>
      <div className="whoami">
        <span>Signed in as <strong>{session?.user.email}</strong></span>
        <button className="btn btn-secondary btn-small" onClick={signOut}>Sign out</button>
      </div>

      <nav className="tabs">
        <button className={tab === 'home' ? 'tab active' : 'tab'} onClick={() => setTab('home')}>Home</button>
        <button className={tab === 'testing' ? 'tab active' : 'tab'} onClick={() => setTab('testing')}>Testing</button>
      </nav>

      {tab === 'home' ? <p className="muted">Nothing here yet.</p> : <Testing />}
    </>
  )
}
