import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface HistoryEntry {
  id: number
  student_id: number
  assignment: string
  date: string
  notes: string | null
  submission_link: string
}

interface HistoryAction {
  id: number
  student_id: number
  description: string
  date: string
}

interface History {
  entries: HistoryEntry[]
  entryCount: number
  actions: HistoryAction[]
  actionCount: number
  semesterByStudent: Map<number, string>
}

const HISTORY_LIMIT = 50

export default function StudentHistory({ netId }: { netId: string }) {
  const [history, setHistory] = useState<History | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadHistory() {
      setHistory(null)
      setError(null)

      try {
        const { data: students, count: studentCount, error: studentsError } = await supabase
          .from('student')
          .select('id, semester_id', { count: 'exact' })
          .eq('net_id', netId)
          .order('id')

        if (studentsError) throw new Error(studentsError.message)
        if (!students || studentCount === null || students.length !== studentCount) {
          throw new Error('Could not load all semester records for this student.')
        }
        if (students.length === 0) throw new Error('No student records found for this Net ID.')

        const studentIds = students.map((student) => student.id)
        const semesterIds = [...new Set(students.map((student) => student.semester_id))]
        const [semesterResult, entryResult, actionResult] = await Promise.all([
          supabase.from('semester').select('id, name').in('id', semesterIds),
          supabase
            .from('entry')
            .select('id, student_id, assignment, date, notes, submission_link', { count: 'exact' })
            .in('student_id', studentIds)
            .order('date', { ascending: false })
            .order('id', { ascending: false })
            .limit(HISTORY_LIMIT),
          supabase
            .from('action')
            .select('id, student_id, description, date', { count: 'exact' })
            .in('student_id', studentIds)
            .order('date', { ascending: false })
            .order('id', { ascending: false })
            .limit(HISTORY_LIMIT),
        ])

        if (semesterResult.error) throw new Error(semesterResult.error.message)
        if (entryResult.error) throw new Error(entryResult.error.message)
        if (actionResult.error) throw new Error(actionResult.error.message)
        if (!semesterResult.data || !entryResult.data || entryResult.count === null ||
            !actionResult.data || actionResult.count === null) {
          throw new Error('Could not load complete history counts.')
        }

        const semesterNames = new Map(semesterResult.data.map((semester) => [semester.id, semester.name]))
        const semesterByStudent = new Map(students.map((student) => [
          student.id,
          semesterNames.get(student.semester_id) ?? `Semester #${student.semester_id}`,
        ]))

        if (active) {
          setHistory({
            entries: entryResult.data,
            entryCount: entryResult.count,
            actions: actionResult.data,
            actionCount: actionResult.count,
            semesterByStudent,
          })
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load history.')
      }
    }

    void loadHistory()
    return () => { active = false }
  }, [netId])

  if (error) return <p className="error" role="alert">Could not load stats and history: {error}</p>
  if (!history) return <p className="muted" role="status">Loading stats and history...</p>

  return (
    <div className="student-history">
      <p className="muted">All semesters for {netId}</p>
      <div className="history-stats">
        <span><strong>{history.entryCount}</strong> AI-use {history.entryCount === 1 ? 'entry' : 'entries'}</span>
        <span><strong>{history.actionCount}</strong> {history.actionCount === 1 ? 'action' : 'actions'}</span>
      </div>

      <section>
        <h4>AI-use entries</h4>
        {history.entryCount > history.entries.length && (
          <p className="muted">Showing the latest {history.entries.length} of {history.entryCount} entries.</p>
        )}
        {history.entries.length === 0 ? <p className="muted">No AI-use entries recorded.</p> : (
          <ul className="history-list">
            {history.entries.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.assignment}</strong>
                <span>{entry.date} · {history.semesterByStudent.get(entry.student_id)}</span>
                {entry.notes && <p>{entry.notes}</p>}
                <p>Submission: {entry.submission_link}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4>Actions</h4>
        {history.actionCount > history.actions.length && (
          <p className="muted">Showing the latest {history.actions.length} of {history.actionCount} actions.</p>
        )}
        {history.actions.length === 0 ? <p className="muted">No actions recorded.</p> : (
          <ul className="history-list">
            {history.actions.map((action) => (
              <li key={action.id}>
                <span>{action.date} · {history.semesterByStudent.get(action.student_id)}</span>
                <p>{action.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
