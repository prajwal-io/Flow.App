import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Task } from '../../../shared/types'
import { api } from '../lib/api'
import { Checkbox } from './Checkbox'
import { IconButton } from './IconButton'
import { CloseIcon, GripIcon, PlusIcon } from './Icons'

interface TasksSectionProps {
  tasks: Task[]
  currentFlow: number
  flows: number
}

export function TasksSection({ tasks, currentFlow, flows }: TasksSectionProps) {
  const [draft, setDraft] = useState('')
  const [draftFlow, setDraftFlow] = useState<number | 'all'>(currentFlow)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragIdRef = useRef<string | null>(null)

  // If the plan shrinks, an assigned flow can disappear from the dropdown;
  // keep the draft pointing at a real flow rather than silently adding to a
  // flow the select no longer shows.
  useEffect(() => {
    if (draftFlow !== 'all' && draftFlow > flows) setDraftFlow(flows)
  }, [draftFlow, flows])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    api.command({ type: 'add-task', text, flow: draftFlow })
    setDraft('')
    inputRef.current?.focus()
  }

  const moveTask = (id: string, toIndex: number) => {
    if (toIndex < 0 || toIndex >= tasks.length) return
    api.command({ type: 'reorder-task', id, toIndex })
  }

  return (
    <section className="section tasks">
      <h2 className="section-label">Tasks</h2>

      <form className="tasks-add" onSubmit={submit}>
        <input
          ref={inputRef}
          type="text"
          className="tasks-input"
          placeholder="Add a task…"
          value={draft}
          maxLength={120}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="New task"
        />
        <select
          className="flow-select"
          value={String(draftFlow)}
          onChange={(e) => setDraftFlow(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          aria-label="Assign task to"
        >
          <option value="all">All</option>
          {Array.from({ length: flows }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Flow {i + 1}
            </option>
          ))}
        </select>
        <IconButton
          label="Add task"
          onClick={() => inputRef.current?.form?.requestSubmit()}
          className="tasks-add-btn"
          disabled={!draft.trim()}
        >
          <PlusIcon />
        </IconButton>
      </form>

      {tasks.length === 0 ? (
        <p className="tasks-empty">Nothing planned yet — add a task for a flow or the whole plan.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task, index) => (
            <li
              key={task.id}
              className={`task${task.completed ? ' is-done' : ''}${dragOverId === task.id ? ' is-drop-target' : ''}`}
              onDragOver={(e) => {
                if (!dragIdRef.current || dragIdRef.current === task.id) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverId(task.id)
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                setDragOverId((current) => (current === task.id ? null : current))
              }}
              onDrop={(e) => {
                e.preventDefault()
                const dragged = dragIdRef.current ?? e.dataTransfer.getData('text/plain')
                dragIdRef.current = null
                setDragOverId(null)
                if (!dragged || dragged === task.id) return
                api.command({ type: 'reorder-task', id: dragged, toIndex: index })
              }}
            >
              <Checkbox
                checked={task.completed}
                onChange={() => api.command({ type: 'toggle-task', id: task.id })}
                label={`${task.completed ? 'Uncheck' : 'Check'} task: ${task.text}`}
              />

              {editingId === task.id ? (
                <input
                  type="text"
                  className="task-edit"
                  defaultValue={task.text}
                  maxLength={120}
                  autoFocus
                  onBlur={(e) => {
                    api.command({ type: 'edit-task', id: task.id, text: e.currentTarget.value })
                    setEditingId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  aria-label="Edit task"
                />
              ) : (
                <span
                  className="task-text"
                  title={`${task.text} — double-click to edit`}
                  onDoubleClick={() => setEditingId(task.id)}
                >
                  {task.text}
                </span>
              )}

              <select
                className="task-est"
                value={task.estimate}
                onChange={(e) =>
                  api.command({ type: 'set-task-estimate', id: task.id, estimate: Number(e.target.value) })
                }
                aria-label={`Estimated flows for ${task.text}`}
                title={task.estimate > 0 ? `${task.estimate} flow${task.estimate === 1 ? '' : 's'} estimated` : 'Estimated flows'}
              >
                <option value={0}>–</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}×
                  </option>
                ))}
              </select>

              <span className="task-tag">{task.flow === 'all' ? 'All' : `F${task.flow}`}</span>

              <button
                type="button"
                className="task-grip"
                draggable
                title="Drag to reorder · Alt+↑/↓"
                aria-label={`Reorder task: ${task.text}. Drag, or press Alt plus arrow keys.`}
                onDragStart={(e) => {
                  dragIdRef.current = task.id
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', task.id)
                }}
                onDragEnd={() => {
                  dragIdRef.current = null
                  setDragOverId(null)
                }}
                onKeyDown={(e) => {
                  if (!e.altKey) return
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    moveTask(task.id, index - 1)
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    moveTask(task.id, index + 1)
                  }
                }}
              >
                <GripIcon />
              </button>

              <IconButton
                label={`Delete task: ${task.text}`}
                className="task-delete"
                onClick={() => api.command({ type: 'delete-task', id: task.id })}
              >
                <CloseIcon size={11} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
