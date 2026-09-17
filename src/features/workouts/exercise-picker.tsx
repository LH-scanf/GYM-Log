import { useEffect, useMemo, useState } from 'react'
import type { Exercise, ExerciseFamily } from '../../domain/exercise/types'
import { EmptyState, AppIcon, Sheet } from '../../shared/components/ui'
import { exerciseManagementService } from '../../application/exercise-management-service'
import { workoutLoggingService } from '../../application/workout-logging-service'
import { getExerciseSummary } from '../exercises/exercise-summary'

type PickerTab = 'recent' | 'favorite' | 'all'

type PickerSection = {
  id: string
  title: string
  exercises: Exercise[]
}

const tabs: Array<{ key: PickerTab; label: string; icon: 'clock' | 'star' | 'grid' }> = [
  { key: 'recent', label: '最近', icon: 'clock' },
  { key: 'favorite', label: '常用', icon: 'star' },
  { key: 'all', label: '全部', icon: 'grid' },
]

const RECENT_LIMIT = 5

export function ExercisePicker({ exercises, onClose, onSelect }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<PickerTab>('recent')
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
        ].slice(0, RECENT_LIMIT),
      )
    })
  }, [])

  const matching = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (normalized === '') return exercises
    const familyById = new Map(families.map((family) => [family.id, family]))
    return exercises.filter((exercise) => {
      if (exercise.name.toLocaleLowerCase().includes(normalized)) return true
      const family =
        exercise.familyId === undefined ? undefined : familyById.get(exercise.familyId)
      return family?.name.toLocaleLowerCase().includes(normalized) === true
    })
  }, [exercises, families, query])

  const sections = useMemo<PickerSection[]>(() => {
    const familyById = new Map(families.map((family) => [family.id, family]))
    const byName = (list: Exercise[]) =>
      [...list].sort((left, right) => left.name.localeCompare(right.name))

    if (tab === 'favorite') {
      const favorites = byName(matching.filter((exercise) => exercise.favorite === true))
      return favorites.length === 0
        ? []
        : [{ id: 'favorite', title: '常用动作', exercises: favorites }]
    }

    if (tab === 'all') {
      return groupByFamily(matching, familyById)
    }

    const recentExercises = recentIds
      .map((id) => matching.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is Exercise => exercise !== undefined)
    const recentIdSet = new Set(recentExercises.map((exercise) => exercise.id))
    const rest = matching.filter((exercise) => !recentIdSet.has(exercise.id))
    return [
      ...(recentExercises.length === 0
        ? []
        : [{ id: 'recent', title: '最近使用', exercises: recentExercises }]),
      ...groupByFamily(rest, familyById),
    ]
  }, [families, matching, recentIds, tab])

  return (
    <Sheet className="sheet--picker" onClose={onClose} title="添加动作">
      <div className="picker">
        <label className="search-box">
          <AppIcon name="search" size={16} />
          <input
            aria-label="搜索动作"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索动作名称或动作族"
            type="search"
            value={query}
          />
        </label>
        <div aria-label="筛选动作" className="chip-row chip-row--fill" role="group">
          {tabs.map((item) => (
            <button
              aria-pressed={tab === item.key}
              className="chip chip--fill"
              key={item.key}
              onClick={() => setTab(item.key)}
              type="button"
            >
              <AppIcon name={item.icon} size={13} />
              {item.label}
            </button>
          ))}
        </div>
        {sections.length === 0 ? (
          <EmptyState
            title={
              tab === 'favorite'
                ? '还没有常用动作。'
                : query.trim() === ''
                  ? '没有可用动作'
                  : '没有匹配的动作'
            }
          />
        ) : (
          sections.map((section) => (
            <section
              aria-label={section.title}
              className="picker-section"
              key={section.id}
            >
              <h3 className="picker-section__title">{section.title}</h3>
              <ul className="picker-ex-list">
                {section.exercises.map((exercise) => (
                  <li key={exercise.id}>
                    <button
                      className="picker-ex-row"
                      onClick={() => onSelect(exercise.id)}
                      type="button"
                    >
                      <span className="picker-ex-row__main">
                        <strong>{exercise.name}</strong>
                        <span>
                          {getExerciseSummary(exercise.recordSchema, exercise.loadMode)}
                        </span>
                      </span>
                      <span aria-hidden="true" className="picker-ex-row__add">
                        <AppIcon name="add" size={15} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </Sheet>
  )
}

type ExercisePickerProps = {
  exercises: Exercise[]
  onClose: () => void
  onSelect: (exerciseId: string) => void
}

function groupByFamily(
  exercises: Exercise[],
  familyById: Map<string, ExerciseFamily>,
): PickerSection[] {
  const groups = new Map<string, PickerSection>()
  for (const exercise of exercises) {
    const family =
      exercise.familyId === undefined ? undefined : familyById.get(exercise.familyId)
    const id = family?.id ?? 'ungrouped'
    const group = groups.get(id) ?? {
      id,
      title: family?.name ?? '未分组',
      exercises: [] as Exercise[],
    }
    group.exercises.push(exercise)
    groups.set(id, group)
  }

  return [...groups.values()].sort((left, right) => {
    if (left.id === 'ungrouped') return 1
    if (right.id === 'ungrouped') return -1
    return left.title.localeCompare(right.title)
  })
}
