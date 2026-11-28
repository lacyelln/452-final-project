import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StudentHistory from './StudentHistory'

interface Student {
  full_name: string
  net_id: string
}

interface Props {
  studentId: string
  onBack: () => void
}

export default function StudentHistoryPage({ studentId, onBack }: Props) {
  const [student, setStudent] = useState<Student | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadStudent() {
      if (!/^[1-9]\d*$/.test(studentId)) {
        setError('Invalid student ID.')
        return
      }

      const { data, error: loadError } = await supabase
        .from('student')
        .select('full_name, net_id')
        .eq('id', studentId)
        .maybeSingle()

      if (!active) return
      if (loadError) {
        setError(`Could not load student: ${loadError.message}`)
      } else if (!data) {
        setError('Student not found or not available to your account.')
      } else {
        setStudent(data)
      }
    }

    void loadStudent()
    return () => { active = false }
  }, [studentId])

  return (
    <div className="student-history-page">
      <button type="button" className="btn btn-secondary btn-small history-back" onClick={onBack}>
        Back to search
      </button>
      {error ? (
        <p className="error" role="alert">{error}</p>
      ) : student ? (
        <>
          <header>
            <h2>{student.full_name}</h2>
            <p className="muted">{student.net_id} · Stats / history</p>
          </header>
          <StudentHistory netId={student.net_id} />
        </>
      ) : (
        <p className="muted" role="status">Loading student...</p>
      )}
    </div>
  )
}
