import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import Home from './Home'
import Testing from './Testing'

type Tab = 'home' | 'testing'

// Everything a signed-in staff member sees. Only rendered when there is a session.
export default function Authenticated() {
  const { session, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('home')

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <div className="site-brand">
            <h1>AI Use Tracker</h1>
            <p>CS 110 TA tools</p>
          </div>
          <div className="site-account">
            <span>Signed in as <strong>{session?.user.email}</strong></span>
            <button className="btn btn-secondary btn-small" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <nav className="tabs" aria-label="Main navigation">
          <button className={tab === 'home' ? 'tab active' : 'tab'} onClick={() => setTab('home')}>Home</button>
          <button className={tab === 'testing' ? 'tab active' : 'tab'} onClick={() => setTab('testing')}>Testing</button>
        </nav>

        <section className="app-panel">
          {tab === 'home' ? <Home /> : <Testing />}
        </section>
      </main>
    </>
  )
}
