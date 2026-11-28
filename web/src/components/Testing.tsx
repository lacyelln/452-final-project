import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Dropdown from './Dropdown'
import EntryPicker from './EntryPicker'
import { buildArgs, operations } from '../testing/operations'

// Developer tool: pick one of the API functions in database/rpc/, fill in its arguments,
// and run it as the signed-in user (so RLS applies) to see exactly what comes back.
export default function Testing() {
  const [index, setIndex] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pickerVersion, setPickerVersion] = useState(0)

  const op = operations[index]
  const isEntryOperation = ['create_entry', 'update_entry', 'delete_entry'].includes(op.fn)
  const needsEntry = op.fn === 'update_entry' || op.fn === 'delete_entry'

  function choose(i: number) {
    setIndex(i)
    setValues({})
    setSent(null)
    setResult(null)
    setError(null)
  }

  async function run() {
    setResult(null)
    setError(null)
    if (isEntryOperation && !(needsEntry ? values.p_id : values.p_student_id)) {
      setSent(null)
      setError(needsEntry ? 'Choose a student and an AI-use entry.' : 'Choose a student.')
      return
    }
    const built = buildArgs(op, values)
    if ('error' in built) {
      setSent(null)
      setError(built.error)
      return
    }
    if (op.fn.startsWith('delete_') && !window.confirm(`Really run ${op.fn}? This changes real data.`)) return

    setSent(`supabase.rpc('${op.fn}', ${JSON.stringify(built.args)})`)
    setRunning(true)
    const { data, error } = await supabase.rpc(op.fn, built.args)
    setRunning(false)

    if (error) {
      // PGRST202 = PostgREST couldn't find the function (its SQL file hasn't been applied yet).
      setError(
        error.code === 'PGRST202'
          ? `Not implemented yet: no function "${op.fn}" with these arguments exists in the database.`
          : `${error.message}${error.code ? ` (${error.code})` : ''}`,
      )
    } else {
      setResult(JSON.stringify(data, null, 2) ?? 'null')
      if (isEntryOperation) {
        setValues({})
        setPickerVersion((version) => version + 1)
      }
    }
  }

  return (
    <div className="testing wide">
      <div className="field">
        <span>Operation</span>
        <Dropdown
          label="Operation"
          options={operations.map((o) => ({ label: o.label, group: o.group }))}
          value={index}
          onChange={choose}
        />
      </div>

      <p className="muted fn-name">{op.fn}({op.params.map((p) => p.name).join(', ')})</p>

      {isEntryOperation && (
        <EntryPicker
          key={`${op.fn}-${pickerVersion}`}
          needsEntry={needsEntry}
          onSelect={(studentId, entryId) => {
            setValues((current) => ({
              ...current,
              ...(needsEntry ? { p_id: entryId } : { p_student_id: studentId }),
            }))
          }}
        />
      )}

      {op.params.filter((p) => !isEntryOperation || (p.name !== 'p_student_id' && p.name !== 'p_id')).map((p) => (
        <label className="field" key={`${op.fn}.${p.name}`}>
          <span>{p.name}{p.optional ? ' (optional)' : ''}</span>
          {p.type === 'boolean' ? (
            <select
              value={values[p.name] ?? ''}
              onChange={(e) => setValues({ ...values, [p.name]: e.target.value })}
            >
              <option value="">{p.optional ? '(leave unset)' : 'choose...'}</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              type={p.type === 'date' ? 'date' : 'text'}
              value={values[p.name] ?? ''}
              placeholder={p.type === 'number[]' ? '1, 2, 3' : p.type === 'number' ? '123' : ''}
              onChange={(e) => setValues({ ...values, [p.name]: e.target.value })}
            />
          )}
        </label>
      ))}

      <button className="btn" onClick={run} disabled={running}>{running ? 'Running...' : 'Run'}</button>

      {sent && <p className="muted sent">{sent}</p>}
      {error && <p className="error">{error}</p>}
      {result !== null && <pre className="result">{result}</pre>}
    </div>
  )
}
