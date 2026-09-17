import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { exerciseManagementService } from '../../application/exercise-management-service'
import type { Exercise, ExerciseFamily } from '../../domain/exercise/types'
import { getExerciseSummary } from './exercise-summary'
import { Sheet } from '../../shared/components/ui'

type ExerciseGroup = {
  id: string
  name: string
  exercises: Exercise[]
}

export function ExercisesPage() {
  const [searchParams] = useSearchParams()
  const archivedView = searchParams.get('view') === 'archived'
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
        exerciseManagementService.listExercises(archivedView),
        exerciseManagementService.listFamilies(),
      ])
      setExercises(
        archivedView
          ? loadedExercises.filter((exercise) => exercise.archived)
          : loadedExercises,
      )
      setFamilies(loadedFamilies)
      setError(undefined)
    } catch (loadError) {
      setError(getErrorMessage(loadError, '无法读取动作数据。'))
    } finally {
      setIsLoading(false)
    }
  }, [archivedView])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [load])

  const groups = useMemo(
    () => groupExercises(exercises, families, query),
    [exercises, families, query],
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
    if (
      !window.confirm(
        `归档动作“${exercise.name}”？它会从默认列表隐藏，但历史数据会保留。`,
      )
    ) {
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

  return (
    <section aria-labelledby="page-title" className="page exercises-page">
      <div className="page-heading">
        <div>
          <h1 id="page-title">{archivedView ? '已归档动作' : '动作'}</h1>
        </div>
        {archivedView ? null : (
          <Link className="primary-link" to="/exercises/new">
            新建动作
          </Link>
        )}
      </div>

      {error === undefined ? null : (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <label className="search-field">
        搜索动作或动作族
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="例如：高位下拉"
          type="search"
          value={query}
        />
      </label>

      {isLoading ? (
        <p role="status">正在加载动作…</p>
      ) : groups.length === 0 ? (
        <EmptyState archivedView={archivedView} query={query} />
      ) : (
        <div className="exercise-groups">
          {groups.map((group) => (
            <section aria-label={group.name} className="exercise-group" key={group.id}>
              <h2>{group.name}</h2>
              <ul className="exercise-list">
                {group.exercises.map((exercise) => (
                  <li className="exercise-row" key={exercise.id}>
                    <Link className="exercise-row__main" to={`/exercises/${exercise.id}`}>
                      <strong>{exercise.name}</strong>
                      <span>
                        {getExerciseSummary(exercise.recordSchema, exercise.loadMode)}
                      </span>
                    </Link>
                    {archivedView ? (
                      <div className="row-actions">
                        <button
                          onClick={() => void restoreExercise(exercise)}
                          type="button"
                        >
                          恢复
                        </button>
                        <button
                          className="danger-button"
                          onClick={() => void hardDeleteExercise(exercise)}
                          type="button"
                        >
                          删除
                        </button>
                      </div>
                    ) : (
                      <button
                        className="quiet-button"
                        onClick={() => void archiveExercise(exercise)}
                        type="button"
                      >
                        归档
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {archivedView ? (
        <Link className="text-link" to="/exercises">
          返回动作列表
        </Link>
      ) : (
        <>
          <Link className="text-link" to="/exercises?view=archived">
            查看已归档动作
          </Link>
          <div className="row-actions">
            <button
              className="quiet-button"
              onClick={() => setFamilyManagerOpen(true)}
              type="button"
            >
              管理动作族
            </button>
          </div>
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
                              onChange={(event) =>
                                setEditingFamilyName(event.target.value)
                              }
                              value={editingFamilyName}
                            />
                          </label>
                          <button type="submit">保存</button>
                          <button
                            onClick={() => setEditingFamilyId(undefined)}
                            type="button"
                          >
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
        </>
      )}
    </section>
  )
}

function EmptyState({ archivedView, query }: { archivedView: boolean; query: string }) {
  const hasQuery = query.trim() !== ''
  return (
    <div className="empty-state">
      <p>
        {hasQuery
          ? '没有匹配的动作。'
          : archivedView
            ? '没有已归档动作。'
            : '还没有动作。'}
      </p>
      {archivedView || hasQuery ? null : (
        <p className="field-hint">使用右上角“新建动作”开始。</p>
      )}
    </div>
  )
}

function groupExercises(
  exercises: Exercise[],
  families: ExerciseFamily[],
  query: string,
): ExerciseGroup[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const familyById = new Map(families.map((family) => [family.id, family]))
  const groups = new Map<string, ExerciseGroup>()

  for (const exercise of exercises) {
    const family =
      exercise.familyId === undefined ? undefined : familyById.get(exercise.familyId)
    const matches =
      normalizedQuery === '' ||
      exercise.name.toLocaleLowerCase().includes(normalizedQuery) ||
      family?.name.toLocaleLowerCase().includes(normalizedQuery) === true
    if (!matches) continue

    const id = family?.id ?? 'ungrouped'
    const group = groups.get(id) ?? { id, name: family?.name ?? '未分组', exercises: [] }
    group.exercises.push(exercise)
    groups.set(id, group)
  }

  return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name))
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
