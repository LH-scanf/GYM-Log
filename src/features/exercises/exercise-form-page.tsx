import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { exerciseManagementService } from '../../application/exercise-management-service'
import type {
  Exercise,
  ExerciseFamily,
  FieldRequirement,
  LoadMode,
  RecordSchema,
} from '../../domain/exercise/types'
import { TopBar } from '../../shared/components/ui'

const fieldLabels: Array<[keyof RecordSchema, string]> = [
  ['load', '重量'],
  ['reps', '次数'],
  ['duration', '时间'],
  ['distance', '距离'],
  ['speed', '速度'],
  ['incline', '坡度'],
  ['side', '左右侧'],
]

const emptySchema: RecordSchema = {
  load: 'DISABLED',
  reps: 'REQUIRED',
  duration: 'DISABLED',
  distance: 'DISABLED',
  speed: 'DISABLED',
  incline: 'DISABLED',
  side: 'DISABLED',
}

type ExerciseFormPageProps = {
  mode: 'create' | 'edit'
}

export function ExerciseFormPage({ mode }: ExerciseFormPageProps) {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const [families, setFamilies] = useState<ExerciseFamily[]>([])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [name, setName] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [schema, setSchema] = useState<RecordSchema>(emptySchema)
  const [loadMode, setLoadMode] = useState<LoadMode>('NONE')
  const [quickFamilyName, setQuickFamilyName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [loadedFamilies, loadedExercises, exercise] = await Promise.all([
          exerciseManagementService.listFamilies(),
          exerciseManagementService.listExercises(true),
          mode === 'edit' && exerciseId
            ? exerciseManagementService.getExercise(exerciseId)
            : Promise.resolve(undefined),
        ])

        if (!active) {
          return
        }

        setFamilies(loadedFamilies)
        setAllExercises(loadedExercises)

        if (mode === 'edit') {
          if (exercise === undefined) {
            setError('未找到该动作。')
          } else {
            setName(exercise.name)
            setFamilyId(exercise.familyId ?? '')
            setSchema(exercise.recordSchema)
            setLoadMode(exercise.loadMode)
          }
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, '无法读取动作数据。'))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [exerciseId, mode])

  const duplicates = allExercises.filter(
    (exercise) =>
      exercise.id !== exerciseId &&
      exercise.name.trim() === name.trim() &&
      name.trim() !== '',
  )
  const hasDuplicateQuickFamily = families.some(
    (family) =>
      family.name.trim() === quickFamilyName.trim() && quickFamilyName.trim() !== '',
  )

  function changeRequirement(
    field: keyof RecordSchema,
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    const requirement = event.target.value as FieldRequirement
    const nextSchema = { ...schema, [field]: requirement }
    setSchema(nextSchema)

    if (field === 'load' && requirement === 'DISABLED') {
      setLoadMode('NONE')
    }
  }

  async function createQuickFamily() {
    try {
      const family = await exerciseManagementService.createFamily({
        name: quickFamilyName,
      })
      setFamilies((current) =>
        [...current, family].sort((a, b) => a.name.localeCompare(b.name)),
      )
      setFamilyId(family.id)
      setQuickFamilyName('')
      setError(undefined)
    } catch (createError) {
      setError(getErrorMessage(createError, '无法创建动作族。'))
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(undefined)

    try {
      const input = {
        name,
        ...(familyId === '' ? {} : { familyId }),
        recordSchema: schema,
        loadMode,
      }
      const exercise =
        mode === 'edit' && exerciseId
          ? await exerciseManagementService.updateExercise(exerciseId, input)
          : await exerciseManagementService.createExercise(input)
      navigate(`/exercises/${exercise.id}`, { replace: mode === 'edit' })
    } catch (saveError) {
      setError(getErrorMessage(saveError, '无法保存动作。'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <PageState message="正在加载动作…" />
  }

  return (
    <section aria-labelledby="page-title" className="page exercise-form-page">
      <TopBar
        backTo={<Link to="/exercises">返回动作列表</Link>}
        headingId="page-title"
        title={mode === 'create' ? '新建动作' : '编辑动作'}
      />

      {error === undefined ? null : (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <form className="exercise-form" onSubmit={submit}>
        <label>
          动作名称
          <input
            autoFocus
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：反向山羊挺身"
            required
            value={name}
          />
        </label>
        {duplicates.length === 0 ? null : (
          <p className="form-warning" role="status">
            已有同名动作。允许保存，但请确认它们确实需要独立统计。
          </p>
        )}

        <label>
          动作族（可选）
          <select onChange={(event) => setFamilyId(event.target.value)} value={familyId}>
            <option value="">未分组</option>
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name}
              </option>
            ))}
          </select>
        </label>

        <div className="quick-family">
          <label>
            快速新建动作族
            <input
              onChange={(event) => setQuickFamilyName(event.target.value)}
              placeholder="例如：反向山羊"
              value={quickFamilyName}
            />
          </label>
          <button
            disabled={quickFamilyName.trim() === ''}
            onClick={() => void createQuickFamily()}
            type="button"
          >
            新建并选择
          </button>
        </div>
        {hasDuplicateQuickFamily ? (
          <p className="form-warning" role="status">
            已有同名动作族。允许创建，但请确认不需要使用现有动作族。
          </p>
        ) : null}

        <fieldset>
          <legend>记录字段</legend>
          <p className="field-hint">选择以后记录这个动作时允许填写的字段。</p>
          <div className="schema-grid">
            {fieldLabels.map(([field, label]) => (
              <label key={field}>
                {label}
                <select
                  onChange={(event) => changeRequirement(field, event)}
                  value={schema[field]}
                >
                  <option value="DISABLED">不记录</option>
                  <option value="OPTIONAL">可选</option>
                  <option value="REQUIRED">必填</option>
                </select>
              </label>
            ))}
          </div>
        </fieldset>

        {schema.load === 'DISABLED' ? null : (
          <fieldset>
            <legend>重量语义</legend>
            <div className="choice-list">
              <label>
                <input
                  checked={loadMode === 'EXTERNAL'}
                  name="load-mode"
                  onChange={() => setLoadMode('EXTERNAL')}
                  type="radio"
                />
                普通负重
              </label>
              <label>
                <input
                  checked={loadMode === 'BODYWEIGHT_PLUS'}
                  name="load-mode"
                  onChange={() => setLoadMode('BODYWEIGHT_PLUS')}
                  type="radio"
                />
                自重 + 额外负重
              </label>
              <label>
                <input
                  checked={loadMode === 'ASSISTANCE'}
                  name="load-mode"
                  onChange={() => setLoadMode('ASSISTANCE')}
                  type="radio"
                />
                辅助重量
              </label>
            </div>
          </fieldset>
        )}

        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? '正在保存…' : '保存动作'}
        </button>
      </form>
    </section>
  )
}

function PageState({ message }: { message: string }) {
  return (
    <section className="page" role="status">
      <h1>{message}</h1>
    </section>
  )
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}
