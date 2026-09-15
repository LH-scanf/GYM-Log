import { useMemo, useState } from 'react'
import type { Exercise } from '../../domain/exercise/types'
import { EmptyState, Sheet } from '../../shared/components/ui'

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
    <Sheet onClose={onClose} title="添加动作">
      <div className="sheet__content">
        <label className="search-field">
          搜索动作
          <input
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索动作名称"
            type="search"
            value={query}
          />
        </label>
        {matching.length === 0 ? (
          <EmptyState
            description="试试其它关键词，或先到动作页创建动作。"
            title="没有可用动作"
          />
        ) : (
          <div className="exercise-list" aria-label="可选动作">
            {matching.map((exercise) => (
              <button
                className="exercise-row__main"
                key={exercise.id}
                onClick={() => onSelect(exercise.id)}
                type="button"
              >
                <strong>{exercise.name}</strong>
                <span>
                  {exercise.familyId === undefined ? '未归类动作' : '选择后立即添加'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  )
}
