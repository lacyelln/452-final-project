import { useEffect, useState } from 'react'
import { containsPattern } from '../lib/search'
import { supabase } from '../lib/supabase'

interface Semester {
  id: number
  name: string
}

interface Student {
  id: number
  full_name: string
  net_id: string
  semester_id: number
}

interface Assignment {
  key: string
  name: string
  students: Student[]
}

interface AssignmentData {
  assignments: Assignment[]
  semesters: Semester[]
}

const PAGE_SIZE = 500
const LOOKUP_SIZE = 50

async function loadAssignments(searchTerm: string, signal: AbortSignal): Promise<AssignmentData> {
  const entries: { assignment: string; student_id: number }[] = []
  let offset = 0
  let total: number | null = null

  do {
    const { data, count, error } = await supabase
      .from('entry')
      .select('id, assignment, student_id', { count: 'exact' })
      .ilike('assignment', containsPattern(searchTerm))
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)
      .abortSignal(signal)

    if (error) throw new Error(error.message)
    if (!data || count === null) throw new Error('Could not determine the number of matching entries.')
    if (total !== null && count !== total) {
      throw new Error('Entries changed while loading statistics. Please search again.')
    }

    total = count
    entries.push(...data)
    offset += data.length
    if (data.length === 0 && offset < total) {
      throw new Error('Could not load all matching entries. Please search again.')
    }
  } while (offset < total)

  if (entries.length === 0) return { assignments: [], semesters: [] }

  const studentIds = [...new Set(entries.map((entry) => entry.student_id))]
  const students = new Map<number, Student>()

  for (let i = 0; i < studentIds.length; i += LOOKUP_SIZE) {
    const ids = studentIds.slice(i, i + LOOKUP_SIZE)
    const { data, error } = await supabase
      .from('student')
      .select('id, full_name, net_id, semester_id')
      .in('id', ids)
      .abortSignal(signal)

    if (error) throw new Error(error.message)
    if (!data || data.length !== ids.length) {
      throw new Error('Could not load every student needed for these statistics.')
    }
    for (const student of data) students.set(student.id, student)
  }

  const semesters: Semester[] = []
  offset = 0
  total = null
  do {
    const { data, count, error } = await supabase
      .from('semester')
      .select('id, name', { count: 'exact' })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
      .abortSignal(signal)

    if (error) throw new Error(error.message)
    if (!data || count === null) throw new Error('Could not determine the number of semesters.')
    if (total !== null && count !== total) {
      throw new Error('Semesters changed while loading statistics. Please search again.')
    }
    total = count
    semesters.push(...data)
    offset += data.length
    if (data.length === 0 && offset < total) {
      throw new Error('Could not load all semesters. Please search again.')
    }
  } while (offset < total)

  const semesterIds = new Set(semesters.map((semester) => semester.id))
  if ([...students.values()].some((student) => !semesterIds.has(student.semester_id))) {
    throw new Error('Could not load every semester needed for these statistics.')
  }

  const groups = new Map<string, { name: string; students: Map<number, Student> }>()
  for (const entry of entries) {
    const name = entry.assignment.trim()
    const key = name.toLowerCase()
    let group = groups.get(key)
    if (!group) {
      group = { name: name || '(Unnamed assignment)', students: new Map() }
      groups.set(key, group)
    }
    const student = students.get(entry.student_id)
    if (!student) throw new Error('Could not find a student needed for these statistics.')
    group.students.set(student.id, student)
  }

  return {
    assignments: [...groups.entries()]
      .map(([key, group]) => ({
        key,
        name: group.name,
        students: [...group.students.values()].sort((a, b) => a.full_name.localeCompare(b.full_name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    semesters,
  }
}

function AssignmentDashboard({ assignment, semesters }: { assignment: Assignment; semesters: Semester[] }) {
  const [semesterId, setSemesterId] = useState(() => (
    semesters.find((semester) => assignment.students.some((student) => student.semester_id === semester.id))?.id
  ))
  const students = assignment.students.filter((student) => student.semester_id === semesterId)

  return (
    <article className="assignment-dashboard">
      <header className="assignment-dashboard-header">
        <h4>{assignment.name}</h4>
        <label className="field assignment-semester">
          <span>Semester</span>
          <select
            aria-label={`Semester for ${assignment.name}`}
            value={semesterId ?? ''}
            onChange={(event) => setSemesterId(Number(event.target.value))}
          >
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>{semester.name}</option>
            ))}
          </select>
        </label>
      </header>

      <div className="assignment-metrics">
        <div className="assignment-metric">
          <strong>{students.length}</strong>
          <span>Students with recorded AI-use entries</span>
        </div>
        <div className="assignment-metric">
          <strong>Not available</strong>
          <span>Actions taken</span>
        </div>
        <div className="assignment-metric">
          <strong>Not available</strong>
          <span>Average grade</span>
        </div>
      </div>

      <p className="muted">Actions are not linked to assignments, and grades are not stored yet.</p>
      <section className="assignment-students">
        <h5>Students with recorded entries</h5>
        {students.length === 0 ? (
          <p className="muted">No students have recorded entries for this assignment in this semester.</p>
        ) : (
          <ul>
            {students.map((student) => (
              <li key={student.id}>
                <strong>{student.full_name}</strong>
                <span>{student.net_id}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  )
}

export default function AssignmentStats({ searchTerm }: { searchTerm: string }) {
  const [result, setResult] = useState<AssignmentData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    loadAssignments(searchTerm, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult(data)
      },
      (loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load assignment statistics.')
        }
      },
    )

    return () => controller.abort()
  }, [searchTerm])

  return (
    <section className="assignment-stats" aria-labelledby="assignment-stats-title" aria-live="polite">
      <h3 id="assignment-stats-title">Assignment statistics</h3>
      <p className="muted">Assignments matching “{searchTerm}”. Names differing only in capitalization are grouped together.</p>
      {error ? (
        <p className="error" role="alert">Could not load assignment statistics: {error}</p>
      ) : result === null ? (
        <p className="muted" role="status">Loading assignment statistics...</p>
      ) : result.assignments.length === 0 ? (
        <p className="muted">No matching AI-use entries found.</p>
      ) : (
        result.assignments.map((assignment) => (
          <AssignmentDashboard key={assignment.key} assignment={assignment} semesters={result.semesters} />
        ))
      )}
    </section>
  )
}
