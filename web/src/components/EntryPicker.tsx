import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

interface Student {
  id: number
  full_name: string
  net_id: string
  semester_id: number
  lecture_section: number
  lab_section: number
}

interface Entry {
  id: number
  assignment: string
  date: string
}

interface Props {
  needsEntry: boolean
  onSelect: (studentId: string, entryId: string) => void
}

const STUDENT_LIMIT = 50
const ENTRY_LIMIT = 100

export default function EntryPicker({ needsEntry, onSelect }: Props) {
  const [name, setName] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [entryId, setEntryId] = useState('')
  const [searched, setSearched] = useState(false)
  const [moreStudents, setMoreStudents] = useState(false)
  const [moreEntries, setMoreEntries] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function searchStudents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const searchName = name.trim()
    if (!searchName) {
      setError('Enter a student name to search.')
      return
    }

    setBusy(true)
    setError(null)
    setSearched(false)
    setStudents([])
    setStudentId('')
    setEntries([])
    setEntryId('')
    setMoreStudents(false)
    setMoreEntries(false)
    onSelect('', '')

    const { data, error: searchError } = await supabase
      .rpc('read_students', { p_full_name: searchName })
      .limit(STUDENT_LIMIT + 1)

    setBusy(false)
    if (searchError) {
      setError(`Could not search students: ${searchError.message}`)
      return
    }
    setStudents((data ?? []).slice(0, STUDENT_LIMIT))
    setMoreStudents((data ?? []).length > STUDENT_LIMIT)
    setSearched(true)
  }

  async function selectStudent(id: string) {
    setStudentId(id)
    setEntryId('')
    setEntries([])
    setMoreEntries(false)
    setError(null)
    onSelect(id, '')

    if (!id || !needsEntry) return

    setBusy(true)
    const { data, error: entriesError } = await supabase
      .from('entry')
      .select('id, assignment, date')
      .eq('student_id', Number(id))
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .limit(ENTRY_LIMIT + 1)

    setBusy(false)
    if (entriesError) {
      setError(`Could not load entries: ${entriesError.message}`)
      return
    }
    setEntries((data ?? []).slice(0, ENTRY_LIMIT))
    setMoreEntries((data ?? []).length > ENTRY_LIMIT)
  }

  return (
    <div className="entry-picker">
      <form className="entry-student-search" onSubmit={searchStudents}>
        <label className="field">
          <span>Student name</span>
          <input
            type="search"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setStudents([])
              setStudentId('')
              setEntries([])
              setEntryId('')
              setSearched(false)
              setMoreStudents(false)
              setMoreEntries(false)
              setError(null)
              onSelect('', '')
            }}
            placeholder="Search by name"
            disabled={busy}
          />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Loading...' : 'Find student'}
        </button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {searched && students.length === 0 && <p className="muted">No students found.</p>}
      {moreStudents && <p className="muted">Only the first {STUDENT_LIMIT} students are shown. Search a more specific name.</p>}
      {students.length > 0 && (
        <label className="field">
          <span>Choose student</span>
          <select value={studentId} onChange={(event) => void selectStudent(event.target.value)} disabled={busy}>
            <option value="">Choose a student...</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name} ({student.net_id}) — Semester #{student.semester_id}, lecture {student.lecture_section}, lab {student.lab_section}
              </option>
            ))}
          </select>
        </label>
      )}
      {needsEntry && studentId && !busy && !error && (
        <>
          {entries.length === 0 ? (
            <p className="muted">This student has no AI-use entries.</p>
          ) : (
            <label className="field">
              <span>Choose AI-use entry</span>
              <select
                value={entryId}
                onChange={(event) => {
                  setEntryId(event.target.value)
                  onSelect(studentId, event.target.value)
                }}
              >
                <option value="">Choose an entry...</option>
                {entries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.assignment} — {entry.date} (entry #{entry.id})
                  </option>
                ))}
              </select>
            </label>
          )}
          {moreEntries && <p className="muted">Only the latest {ENTRY_LIMIT} entries are shown.</p>}
        </>
      )}
    </div>
  )
}
