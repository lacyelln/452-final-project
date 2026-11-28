import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import AssignmentStats from './AssignmentStats'
import StudentHistoryPage from './StudentHistoryPage'

type SearchMode = 'students' | 'assignments'

interface StudentResult {
  id: number
  semester_id: number
  full_name: string
  lecture_section: number
  lab_section: number
  net_id: string
  online: boolean
}

const RESULT_LIMIT = 50

function StudentSearchResult({ student, onOpenHistory }: { student: StudentResult; onOpenHistory: (id: number) => void }) {
  return (
    <li className="search-result">
      <div className="student-result-header">
        <strong>{student.full_name}</strong>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          aria-label={`Stats and history for ${student.full_name}, ${student.net_id}`}
          onClick={() => onOpenHistory(student.id)}
        >
          Stats / history
        </button>
      </div>
      <span>{student.net_id}</span>
      <span>Lecture {student.lecture_section} · Lab {student.lab_section}</span>
      <span>Semester #{student.semester_id}{student.online ? ' · Online' : ''}</span>
    </li>
  )
}

export default function Home() {
  const [selectedStudentId, setSelectedStudentId] = useState(() => new URLSearchParams(window.location.search).get('student'))
  const [mode, setMode] = useState<SearchMode>('students')
  const [query, setQuery] = useState('')
  const [studentResults, setStudentResults] = useState<StudentResult[]>([])
  const [searchedAssignment, setSearchedAssignment] = useState('')
  const [assignmentSearchVersion, setAssignmentSearchVersion] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function syncLocation() {
      setSelectedStudentId(new URLSearchParams(window.location.search).get('student'))
    }

    window.addEventListener('popstate', syncLocation)
    return () => window.removeEventListener('popstate', syncLocation)
  }, [])

  function openHistory(id: number) {
    const url = new URL(window.location.href)
    url.searchParams.set('student', String(id))
    window.history.pushState({ studentHistory: true }, '', url)
    setSelectedStudentId(String(id))
    window.scrollTo(0, 0)
  }

  function backToSearch() {
    if (window.history.state?.studentHistory) {
      window.history.back()
    } else {
      const url = new URL(window.location.href)
      url.searchParams.delete('student')
      window.history.replaceState(window.history.state, '', url)
      setSelectedStudentId(null)
    }
  }

  function changeMode(nextMode: SearchMode) {
    setMode(nextMode)
    setStudentResults([])
    setSearchedAssignment('')
    setHasSearched(false)
    setError(null)
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const searchTerm = query.trim()
    if (!searchTerm) {
      setError('Enter a name, Net ID, or assignment to search.')
      setHasSearched(false)
      setStudentResults([])
      setSearchedAssignment('')
      return
    }

    setBusy(true)
    setError(null)
    setHasSearched(false)
    setStudentResults([])
    setSearchedAssignment('')

    try {
      if (mode === 'students') {
        const [nameSearch, netIdSearch] = await Promise.all([
          supabase.rpc('read_students', { p_full_name: searchTerm }).limit(RESULT_LIMIT),
          supabase.rpc('read_students', { p_net_id: searchTerm }).limit(RESULT_LIMIT),
        ])

        if (nameSearch.error) throw new Error(nameSearch.error.message)
        if (netIdSearch.error) throw new Error(netIdSearch.error.message)

        const students = new Map<number, StudentResult>()
        for (const student of [...(nameSearch.data ?? []), ...(netIdSearch.data ?? [])]) {
          students.set(student.id, student)
        }
        setStudentResults([...students.values()])
      } else {
        setSearchedAssignment(searchTerm)
        setAssignmentSearchVersion((version) => version + 1)
      }

      setHasSearched(true)
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Search failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const resultCount = studentResults.length

  if (selectedStudentId !== null) {
    return <StudentHistoryPage key={selectedStudentId} studentId={selectedStudentId} onBack={backToSearch} />
  }

  return (
    <div className="home">
      <header className="home-intro">
        <h2>Find a student or assignment</h2>
        <p className="muted">Search registered students or assignments in recorded AI-use entries.</p>
      </header>

      <form className="home-search" onSubmit={search}>
        <div className="search-modes" role="group" aria-label="Choose what to search">
          <button
            type="button"
            className={mode === 'students' ? 'search-mode active' : 'search-mode'}
            aria-pressed={mode === 'students'}
            disabled={busy}
            onClick={() => changeMode('students')}
          >
            Students
          </button>
          <button
            type="button"
            className={mode === 'assignments' ? 'search-mode active' : 'search-mode'}
            aria-pressed={mode === 'assignments'}
            disabled={busy}
            onClick={() => changeMode('assignments')}
          >
            Assignments
          </button>
        </div>
        <label className="visually-hidden" htmlFor="home-search-input">
          {mode === 'students' ? 'Search by student name or Net ID' : 'Search assignment names'}
        </label>
        <input
          id="home-search-input"
          className="home-search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={mode === 'students' ? 'Student name or Net ID' : 'Assignment name'}
          maxLength={100}
          disabled={busy}
          required
        />
        <button className="btn home-search-button" type="submit" disabled={busy}>
          {busy ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="error search-message" role="alert">{error}</p>}

      {mode === 'assignments' && searchedAssignment && (
        <AssignmentStats key={assignmentSearchVersion} searchTerm={searchedAssignment} />
      )}

      {mode === 'students' && hasSearched && (
        <section className="search-results" aria-live="polite">
          <h3>
            {resultCount === 0
              ? 'No results found'
              : resultCount === RESULT_LIMIT
                ? `Showing up to ${RESULT_LIMIT} results`
                : `${resultCount} result${resultCount === 1 ? '' : 's'}`}
          </h3>

          {mode === 'students' && studentResults.length > 0 && (
            <ul className="result-list">
              {studentResults.map((student) => (
                <StudentSearchResult key={student.id} student={student} onOpenHistory={openHistory} />
              ))}
            </ul>
          )}

        </section>
      )}
    </div>
  )
}
