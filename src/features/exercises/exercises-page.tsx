import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { exerciseManagementService } from '../../application/exercise-management-service'
import type { Exercise, ExerciseFamily } from '../../domain/exercise/types'
import { getExerciseSummary } from './exercise-summary'
import { AppIcon, EmptyState, PageHeader, Sheet } from '../../shared/components/ui'

type ExerciseFilter = 'all' | 'favorite' | 'archived'
type SortKey = 'name' | 'created'

type ExerciseGroup = {
  id: string
  name: string
  exercises: Exercise[]
}

const filterChips: Array<{ key: ExerciseFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'favorite', label: '常用' },
  { key: 'archived', label: '已归档' },
]

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: '默认排序' },
  { key: 'created', label: '最近添加' },
]

export function ExercisesPage() {
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState<ExerciseFilter>(() =>
    searchParams.get('view') === 'archived' ? 'archived' : 'all',
  )
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortOpen, setSortOpen] = useState(false)
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(new Set())
  const [menuExercise, setMenuExercise] = useState<Exercise>()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [families, setFamilies] = useState<ExerciseFamily[]>([])
  const [query, setQuery] = useState('')
  const [newFamilyName, setNewFamilyName] = useState('')
  const [editingFamilyId, setEditingFamilyId] = useState<string>()
  const [editingFamilyName, setEditingFamilyName] = useState('')
  const [familyManagerOpen, setFamilyManagerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [loadedExercises, loadedFamilies] = await Promise.all([
        exerciseManagementService.listExercises(true),
        exerciseManagementService.listFamilies(),
      ])
      setExercises(loadedExercises)
      setFamilies(loadedFamilies)
      setError(undefined)
    } catch (loadError) {
      setError(getErrorMessage(loadError, '无法读取动作数据。'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [load])

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const familyById = new Map(families.map((family) => [family.id, family]))
    return exercises.filter((exercise) => {
      if (filter === 'archived') {
        if (!exercise.archived) return false
      } else if (exercise.archived) {
        return false
      }
      if (filter === 'favorite' && exercise.favorite !== true) return false
      if (normalizedQuery === '') return true

      const family =
        exercise.familyId === undefined ? undefined : familyById.get(exercise.familyId)
      return (
        exercise.name.toLocaleLowerCase().includes(normalizedQuery) ||
        family?.name.toLocaleLowerCase().includes(normalizedQuery) === true
      )
    })
  }, [exercises, families, query, filter])

  const groups = useMemo(
    () => groupExercises(visible, families, sortKey),
    [visible, families, sortKey],
  )
  const hasDuplicateNewFamily = families.some(
    (family) =>
      family.name.trim() === newFamilyName.trim() && newFamilyName.trim() !== '',
  )
  const hasDuplicateEditedFamily = families.some(
    (family) =>
      family.id !== editingFamilyId &&
      family.name.trim() === editingFamilyName.trim() &&
      editingFamilyName.trim() !== '',
  )

  async function createFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await exerciseManagementService.createFamily({ name: newFamilyName })
      setNewFamilyName('')
      await load()
    } catch (createError) {
      setError(getErrorMessage(createError, '无法创建动作族。'))
    }
  }

  async function saveFamilyName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingFamilyId === undefined) {
      return
    }

    try {
      await exerciseManagementService.renameFamily(editingFamilyId, editingFamilyName)
      setEditingFamilyId(undefined)
      await load()
    } catch (renameError) {
      setError(getErrorMessage(renameError, '无法重命名动作族。'))
    }
  }

  async function deleteFamily(family: ExerciseFamily) {
    if (!window.confirm(`永久删除动作族“${family.name}”？此操作无法撤销。`)) {
      return
    }

    try {
      await exerciseManagementService.hardDeleteFamily(family.id)
      await load()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, '此动作族仍包含动作，无法永久删除。'))
    }
  }

  async function archiveExercise(exercise: Exercise) {
    if (!window.confirm(`归档动作“${exercise.name}”？历史数据会保留。`)) {
      return
    }

    try {
      await exerciseManagementService.archiveExercise(exercise.id)
      await load()
    } catch (archiveError) {
      setError(getErrorMessage(archiveError, '无法归档动作。'))
    }
  }

  async function restoreExercise(exercise: Exercise) {
    try {
      await exerciseManagementService.restoreExercise(exercise.id)
      await load()
    } catch (restoreError) {
      setError(getErrorMessage(restoreError, '无法恢复动作。'))
    }
  }

  async function hardDeleteExercise(exercise: Exercise) {
    const canDelete = await exerciseManagementService.canHardDeleteExercise(exercise.id)
    if (!canDelete) {
      setError('此动作已有训练历史，不能永久删除。请使用归档。')
      return
    }

    if (!window.confirm(`永久删除动作“${exercise.name}”？此操作无法撤销。`)) {
      return
    }

    try {
      await exerciseManagementService.hardDeleteExercise(exercise.id)
      await load()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, '无法永久删除动作。'))
    }
  }

  async function toggleFavorite(exercise: Exercise) {
    try {
      await exerciseManagementService.setFavoriteExercise(
        exercise.id,
        exercise.favorite !== true,
      )
      await load()
    } catch (favoriteError) {
      setError(getErrorMessage(favoriteError, '无法更新常用动作。'))
    }
  }

  function toggleGroup(groupId: string) {
    setCollapsedIds((current) => {
      const next = new Set(current)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const emptyTitle =
    query.trim() === ''
      ? filter === 'all'
        ? '还没有动作。'
        : filter === 'favorite'
          ? '还没有常用动作。'
          : '没有已归档动作。'
      : '没有匹配的动作。'
  const activeSortLabel =
    sortOptions.find((option) => option.key === sortKey)?.label ?? '默认排序'

  return (
    <section aria-labelledby="page-title" className="page exercises-page">
      <PageHeader
        action={
          <Link className="primary-link primary-link--compact" to="/exercises/new">
            <AppIcon name="add" size={14} />
            新建动作
          </Link>
        }
        headingId="page-title"
        title="动作"
      />

      {error === undefined ? null : (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <label className="search-box">
        <AppIcon name="search" size={16} />
        <input
          aria-label="搜索动作或动作族"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索动作或动作族，例如：高位下拉"
          type="search"
          value={query}
        />
      </label>

      <div className="ex-toolbar">
        <div aria-label="筛选动作" className="chip-row" role="group">
          {filterChips.map((chip) => (
            <button
              aria-pressed={filter === chip.key}
              className="chip"
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              type="button"
            >
              {chip.label}
            </button>
          ))}
        </div>
        <button className="sort-entry" onClick={() => setSortOpen(true)} type="button">
          <AppIcon name="sort" size={14} />
          {activeSortLabel}
          <AppIcon className="sort-entry__caret" name="chevron" size={12} />
        </button>
      </div>

      {isLoading ? (
        <p role="status">正在加载动作…</p>
      ) : visible.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <>
          <p className="result-count">共 {visible.length} 个动作</p>
          <div className="ex-groups">
            {groups.map((group) => {
              const collapsed = collapsedIds.has(group.id)
              return (
                <section aria-label={group.name} className="ex-group" key={group.id}>
                  <button
                    aria-expanded={!collapsed}
                    className="ex-group__head"
                    onClick={() => toggleGroup(group.id)}
                    type="button"
                  >
                    <span className="ex-group__icon">
                      <AppIcon name="exercise" size={18} />
                    </span>
                    <span className="ex-group__meta">
                      <strong>{group.name}</strong>
                      <span>{group.exercises.length} 个动作</span>
                    </span>
                    <AppIcon
                      className={
                        collapsed
                          ? 'ex-group__chevron'
                          : 'ex-group__chevron ex-group__chevron--open'
                      }
                      name="chevron"
                      size={16}
                    />
                  </button>
                  {collapsed ? null : (
                    <ul className="ex-list">
                      {group.exercises.map((exercise) => (
                        <li className="ex-row" key={exercise.id}>
                          <Link className="ex-row__main" to={`/exercises/${exercise.id}`}>
                            <strong>{exercise.name}</strong>
                            <span>
                              {getExerciseSummary(
                                exercise.recordSchema,
                                exercise.loadMode,
                              )}
                            </span>
                          </Link>
                          {filter === 'archived' ? null : (
                            <button
                              aria-label={
                                exercise.favorite === true
                                  ? `取消常用 ${exercise.name}`
                                  : `设为常用 ${exercise.name}`
                              }
                              aria-pressed={exercise.favorite === true}
                              className="row-icon-button row-icon-button--star"
                              onClick={() => void toggleFavorite(exercise)}
                              type="button"
                            >
                              <AppIcon name="star" size={18} />
                            </button>
                          )}
                          <button
                            aria-label={`${exercise.name} 更多操作`}
                            className="row-icon-button"
                            onClick={() => setMenuExercise(exercise)}
                            type="button"
                          >
                            <AppIcon name="more" size={18} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        </>
      )}

      <div className="ex-page-footer">
        <button
          className="quiet-link-button"
          onClick={() => setFamilyManagerOpen(true)}
          type="button"
        >
          管理动作族
        </button>
      </div>

      {sortOpen && (
        <Sheet onClose={() => setSortOpen(false)} title="排序">
          <div className="row-menu">
            {sortOptions.map((option) => (
              <button
                aria-pressed={option.key === sortKey}
                className={
                  option.key === sortKey
                    ? 'row-menu__item row-menu__item--active'
                    : 'row-menu__item'
                }
                key={option.key}
                onClick={() => {
                  setSortKey(option.key)
                  setSortOpen(false)
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {menuExercise && (
        <Sheet
          className="sheet--menu"
          onClose={() => setMenuExercise(undefined)}
          title={menuExercise.name}
        >
          <div className="row-menu">
            {menuExercise.archived ? (
              <>
                <button
                  className="row-menu__item"
                  onClick={() => {
                    setMenuExercise(undefined)
                    void restoreExercise(menuExercise)
                  }}
                  type="button"
                >
                  恢复
                </button>
                <button
                  className="row-menu__item row-menu__item--danger"
                  onClick={() => {
                    setMenuExercise(undefined)
                    void hardDeleteExercise(menuExercise)
                  }}
                  type="button"
                >
                  删除
                </button>
              </>
            ) : (
              <button
                className="row-menu__item"
                onClick={() => {
                  setMenuExercise(undefined)
                  void archiveExercise(menuExercise)
                }}
                type="button"
              >
                归档
              </button>
            )}
          </div>
        </Sheet>
      )}

      {familyManagerOpen && (
        <Sheet onClose={() => setFamilyManagerOpen(false)} title="管理动作族">
          <section aria-labelledby="family-title" className="family-management">
            <h2 id="family-title">动作族</h2>
            <p>动作族只用于组织相关变式，本身不是可记录动作。</p>
            <form className="inline-form" onSubmit={createFamily}>
              <label>
                新建动作族
                <input
                  onChange={(event) => setNewFamilyName(event.target.value)}
                  placeholder="例如：高位下拉"
                  required
                  value={newFamilyName}
                />
              </label>
              <button type="submit">新建</button>
            </form>
            {hasDuplicateNewFamily ? (
              <p className="form-warning" role="status">
                已有同名动作族。允许保存，但请确认不需要使用现有动作族。
              </p>
            ) : null}
            <ul className="family-list">
              {families.map((family) => (
                <li key={family.id}>
                  {editingFamilyId === family.id ? (
                    <form className="inline-form" onSubmit={saveFamilyName}>
                      <label>
                        动作族名称
                        <input
                          autoFocus
                          onChange={(event) => setEditingFamilyName(event.target.value)}
                          value={editingFamilyName}
                        />
                      </label>
                      <button type="submit">保存</button>
                      <button onClick={() => setEditingFamilyId(undefined)} type="button">
                        取消
                      </button>
                      {hasDuplicateEditedFamily ? (
                        <p className="form-warning" role="status">
                          已有同名动作族。允许保存，但请确认不需要使用现有动作族。
                        </p>
                      ) : null}
                    </form>
                  ) : (
                    <div className="family-row">
                      <span>{family.name}</span>
                      <div className="row-actions">
                        <button
                          onClick={() => {
                            setEditingFamilyId(family.id)
                            setEditingFamilyName(family.name)
                          }}
                          type="button"
                        >
                          改名
                        </button>
                        <button
                          className="danger-button"
                          onClick={() => void deleteFamily(family)}
                          type="button"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </Sheet>
      )}
    </section>
  )
}

function groupExercises(
  exercises: Exercise[],
  families: ExerciseFamily[],
  sortKey: SortKey,
): ExerciseGroup[] {
  const familyById = new Map(families.map((family) => [family.id, family]))
  const groups = new Map<string, ExerciseGroup>()

  for (const exercise of exercises) {
    const family =
      exercise.familyId === undefined ? undefined : familyById.get(exercise.familyId)
    const id = family?.id ?? 'ungrouped'
    const group = groups.get(id) ?? { id, name: family?.name ?? '未分组', exercises: [] }
    group.exercises.push(exercise)
    groups.set(id, group)
  }

  const sorted = [...groups.values()].sort((left, right) => {
    if (left.id === 'ungrouped') return 1
    if (right.id === 'ungrouped') return -1
    return left.name.localeCompare(right.name)
  })
  for (const group of sorted) {
    group.exercises = sortExercises(group.exercises, sortKey)
  }
  return sorted
}

function sortExercises(exercises: Exercise[], sortKey: SortKey): Exercise[] {
  const sorted = [...exercises].sort((left, right) => left.name.localeCompare(right.name))
  if (sortKey === 'created') {
    sorted.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  }
  return sorted
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
