import { useMemo, useState } from 'react'
import type { Exercise } from '../../domain/exercise/types'

type ExercisePickerProps = {
  exercises: Exercise[]
  onClose: () => void
  onSelect: (exerciseId: string) => void
}

export function ExercisePicker({ exercises, onClose, onSelect }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const matching = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return exercises.filter((exercise) =>
      exercise.name.toLocaleLowerCase().includes(normalized),
    )
  }, [exercises, query])

  return (
    <section aria-label="选择动作" className="family-management" role="dialog">
      <h2>添加动作</h2>
      <label>
        搜索动作
        <input
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          value={query}
        />
      </label>
      {matching.map((exercise) => (
        <button key={exercise.id} onClick={() => onSelect(exercise.id)} type="button">
          {exercise.name}
        </button>
      ))}
      {matching.length === 0 && <p>没有可用动作。</p>}
      <button onClick={onClose} type="button">
        取消
      </button>
    </section>
  )
}
