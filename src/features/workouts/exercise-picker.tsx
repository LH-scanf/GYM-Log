import { useEffect, useMemo, useState } from 'react'
import type { Exercise, ExerciseFamily } from '../../domain/exercise/types'
import { EmptyState, Sheet } from '../../shared/components/ui'
import { exerciseManagementService } from '../../application/exercise-management-service'
import { workoutLoggingService } from '../../application/workout-logging-service'

type ExercisePickerProps = {
  exercises: Exercise[]
  onClose: () => void
  onSelect: (exerciseId: string) => void
}

export function ExercisePicker({ exercises, onClose, onSelect }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [families, setFamilies] = useState<ExerciseFamily[]>([])
  const [recentIds, setRecentIds] = useState<string[]>([])
  useEffect(() => {
    void Promise.all([
      exerciseManagementService.listFamilies(),
      workoutLoggingService.listAllSessions(),
    ]).then(async ([nextFamilies, sessions]) => {
      setFamilies(nextFamilies)
      const details = await Promise.all(
        sessions
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((session) => workoutLoggingService.getWorkout(session.id)),
      )
      setRecentIds(
        [
          ...new Set(
            details.flatMap(
              (detail) => detail?.blocks.map((block) => block.exercise.id) ?? [],
            ),
          ),
        ].slice(0, 5),
      )
    })
  }, [])
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
          <div className="sheet__content" aria-label="可选动作">
            {query === '' && recentIds.length > 0 && (
              <PickerGroup
                exercises={matching.filter((exercise) => recentIds.includes(exercise.id))}
                onSelect={onSelect}
                title="最近"
              />
            )}
            {[
              ...new Set(matching.map((exercise) => exercise.familyId ?? 'ungrouped')),
            ].map((familyId) => (
              <PickerGroup
                exercises={matching.filter(
                  (exercise) => (exercise.familyId ?? 'ungrouped') === familyId,
                )}
                key={familyId}
                onSelect={onSelect}
                title={
                  familyId === 'ungrouped'
                    ? '未分组'
                    : (families.find((family) => family.id === familyId)?.name ?? '动作')
                }
              />
            ))}
          </div>
        )}
      </div>
    </Sheet>
  )
}

function PickerGroup({
  title,
  exercises,
  onSelect,
}: {
  title: string
  exercises: Exercise[]
  onSelect: (id: string) => void
}) {
  if (exercises.length === 0) return null
  return (
    <section>
      <p className="eyebrow">{title}</p>
      <div className="exercise-list">
        {exercises.map((exercise) => (
          <button
            className="exercise-row__main"
            key={exercise.id}
            onClick={() => onSelect(exercise.id)}
            type="button"
          >
            <strong>{exercise.name}</strong>
            <span>选择后立即添加</span>
          </button>
        ))}
      </div>
    </section>
  )
}
