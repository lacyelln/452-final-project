import { useAuth } from '../auth/AuthContext'

// Everything a signed-in staff member sees. Only rendered when there is a session.
export default function Authenticated() {
  const { session, signOut } = useAuth()

  return (
    <>
      <p>Signed in as <strong>{session?.user.email}</strong></p>
      <button className="btn btn-secondary" onClick={signOut}>Sign out</button>
    </>
  )
}
