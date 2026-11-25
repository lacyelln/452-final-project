// Every operation from the root README's CRUD list, as an RPC the Testing tab can run.
// Each `fn` is a Postgres function in database/rpc/<fn>.sql, and each param `name` must
// match that function's argument name exactly (p_ prefix included). Keep the two in sync.
// Operations whose SQL file doesn't exist yet report "not implemented" when run.

export type ParamType = 'text' | 'number' | 'boolean' | 'date' | 'number[]'

export interface Param {
  name: string
  type: ParamType
  optional?: boolean // omitted from the call when blank, so the SQL default (null) applies
}

export interface Operation {
  label: string
  group: string // which section of the dropdown it appears under
  fn: string
  params: Param[]
}

const semester: Param = { name: 'p_semester_id', type: 'number' }

const rawOperations: Operation[] = [
  {
    label: 'Read students (filter by any of these)',
    group: 'Students',
    fn: 'read_students',
    params: [
      { name: 'p_semester_id', type: 'number', optional: true },
      { name: 'p_full_name', type: 'text', optional: true },
      { name: 'p_lecture_section', type: 'number', optional: true },
      { name: 'p_lab_section', type: 'number', optional: true },
      { name: 'p_online', type: 'boolean', optional: true },
      { name: 'p_net_id', type: 'text', optional: true },
    ],
  },
  {
    label: 'Read all AI entries for one student',
    group: 'Entries',
    fn: 'read_entries_for_student',
    params: [{ name: 'p_student_id', type: 'number' }],
  },

  {
    label: 'Create student',
    group: 'Students',
    fn: 'create_student',
    params: [
      semester,
      { name: 'p_full_name', type: 'text' },
      { name: 'p_lecture_section', type: 'number' },
      { name: 'p_lab_section', type: 'number' },
      { name: 'p_net_id', type: 'text' },
      { name: 'p_online', type: 'boolean', optional: true },
    ],
  },
  {
    label: 'Update student',
    group: 'Students',
    fn: 'update_student',
    params: [
      { name: 'p_id', type: 'number' },
      { name: 'p_semester_id', type: 'number', optional: true },
      { name: 'p_full_name', type: 'text', optional: true },
      { name: 'p_lecture_section', type: 'number', optional: true },
      { name: 'p_lab_section', type: 'number', optional: true },
      { name: 'p_net_id', type: 'text', optional: true },
      { name: 'p_online', type: 'boolean', optional: true },
    ],
  },
  { label: 'Delete student', group: 'Students', fn: 'delete_student', params: [{ name: 'p_id', type: 'number' }] },

  {
    label: 'Read semesters (filter by any of these)',
    group: 'Semesters',
    fn: 'read_semesters',
    params: [
      { name: 'p_id', type: 'number', optional: true },
      { name: 'p_name', type: 'text', optional: true },
    ],
  },
  { label: 'Create semester', group: 'Semesters', fn: 'create_semester', params: [{ name: 'p_name', type: 'text' }] },
  {
    label: 'Update semester',
    group: 'Semesters',
    fn: 'update_semester',
    params: [
      { name: 'p_id', type: 'number' },
      { name: 'p_name', type: 'text', optional: true },
    ],
  },
  { label: 'Delete semester', group: 'Semesters', fn: 'delete_semester', params: [{ name: 'p_id', type: 'number' }] },

  {
    label: 'Create student action',
    group: 'Actions',
    fn: 'create_action',
    params: [
      { name: 'p_student_id', type: 'number' },
      { name: 'p_description', type: 'text' },
      { name: 'p_date', type: 'date', optional: true },
    ],
  },
  {
    label: 'Update student action',
    group: 'Actions',
    fn: 'update_action',
    params: [
      { name: 'p_id', type: 'number' },
      { name: 'p_description', type: 'text', optional: true },
      { name: 'p_date', type: 'date', optional: true },
    ],
  },
  { label: 'Delete student action', group: 'Actions', fn: 'delete_action', params: [{ name: 'p_id', type: 'number' }] },

  {
    label: 'Create AI entry',
    group: 'Entries',
    fn: 'create_entry',
    params: [
      { name: 'p_student_id', type: 'number' },
      { name: 'p_assignment', type: 'text' },
      { name: 'p_submission_link', type: 'text' },
      { name: 'p_notes', type: 'text', optional: true },
      { name: 'p_date', type: 'date', optional: true },
    ],
  },
  {
    label: 'Update AI entry',
    group: 'Entries',
    fn: 'update_entry',
    params: [
      { name: 'p_id', type: 'number' },
      { name: 'p_assignment', type: 'text', optional: true },
      { name: 'p_submission_link', type: 'text', optional: true },
      { name: 'p_notes', type: 'text', optional: true },
      { name: 'p_date', type: 'date', optional: true },
    ],
  },
  { label: 'Delete AI entry', group: 'Entries', fn: 'delete_entry', params: [{ name: 'p_id', type: 'number' }] },

  {
    label: 'Create staff member',
    group: 'Staff',
    fn: 'create_staff',
    params: [
      { name: 'p_first_name', type: 'text' },
      { name: 'p_last_name', type: 'text' },
      { name: 'p_email', type: 'text' },
      { name: 'p_sections', type: 'number[]', optional: true },
    ],
  },
  {
    label: 'Update staff member',
    group: 'Staff',
    fn: 'update_staff',
    params: [
      { name: 'p_id', type: 'number' },
      { name: 'p_first_name', type: 'text', optional: true },
      { name: 'p_last_name', type: 'text', optional: true },
      { name: 'p_email', type: 'text', optional: true },
      { name: 'p_sections', type: 'number[]', optional: true },
      { name: 'p_active', type: 'boolean', optional: true },
    ],
  },
  { label: 'Delete staff member', group: 'Staff', fn: 'delete_staff', params: [{ name: 'p_id', type: 'number' }] },
]

// Dropdown sections, in display order. Inside a section, operations keep the order written above.
export const GROUP_ORDER = ['Students', 'Semesters', 'Entries', 'Actions', 'Staff']

export const operations: Operation[] = [...rawOperations].sort(
  (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group),
)

// Turns the form's strings into the JSON arguments for supabase.rpc.
// Blank optional fields are left out; blank required fields are an error.
export function buildArgs(
  op: Operation,
  values: Record<string, string>,
): { args: Record<string, unknown> } | { error: string } {
  const args: Record<string, unknown> = {}
  for (const p of op.params) {
    const raw = (values[p.name] ?? '').trim()
    if (raw === '') {
      if (p.optional) continue
      return { error: `${p.name} is required.` }
    }
    switch (p.type) {
      case 'text':
      case 'date':
        args[p.name] = raw
        break
      case 'boolean':
        args[p.name] = raw === 'true'
        break
      case 'number': {
        const n = Number(raw)
        if (Number.isNaN(n)) return { error: `${p.name} must be a number.` }
        args[p.name] = n
        break
      }
      case 'number[]': {
        const nums = raw.split(',').map((s) => Number(s.trim()))
        if (nums.some((n) => Number.isNaN(n))) return { error: `${p.name} must be numbers separated by commas.` }
        args[p.name] = nums
        break
      }
    }
  }
  return { args }
}
