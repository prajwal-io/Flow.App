import type { Task } from '../../../shared/types'
import { Checkbox } from './Checkbox'

interface CurrentTaskRowProps {
  task: Task | null
  onToggle: (id: string) => void
}

/** Compact mode's one line of work: the task this flow is about. */
export function CurrentTaskRow({ task, onToggle }: CurrentTaskRowProps) {
  if (!task) {
    return (
      <div className="task-current">
        <span className="task-current-empty">No task for this flow yet</span>
      </div>
    )
  }

  return (
    <div className="task-current">
      <Checkbox checked={false} onChange={() => onToggle(task.id)} label={`Complete task: ${task.text}`} />
      <span className="task-current-text" title={task.text}>
        {task.text}
      </span>
    </div>
  )
}
