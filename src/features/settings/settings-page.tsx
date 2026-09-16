import { useEffect, useRef, useState } from 'react'
import {
  backupApplicationService,
  type BackupSummary,
} from '../../application/backup-service'
import type { GymLogBackupV1 } from '../../data/backup/types'
import { TopBar } from '../../shared/components/ui'

function formatDateTime(value: string | undefined) {
  return value === undefined ? '尚未导出过备份' : new Date(value).toLocaleString('zh-CN')
}

export function SettingsPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [lastBackupAt, setLastBackupAt] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [pendingBackup, setPendingBackup] = useState<GymLogBackupV1>()
  const [summary, setSummary] = useState<BackupSummary>()

  useEffect(() => {
    const timer = setTimeout(() => {
      void backupApplicationService
        .getSettings()
        .then((settings) => setLastBackupAt(settings?.lastBackupAt))
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  async function exportBackup() {
    setError(undefined)
    setMessage(undefined)
    try {
      const backup = await backupApplicationService.createExport()
      const json = `${JSON.stringify(backup, null, 2)}\n`
      const fileName = `gymlog-backup-${backup.exportedAt.slice(0, 10)}.json`
      const link = document.createElement('a')
      link.href = URL.createObjectURL(
        new Blob([json], { type: 'application/json;charset=utf-8' }),
      )
      link.download = fileName
      link.click()
      URL.revokeObjectURL(link.href)
      await backupApplicationService.markExported(backup.exportedAt)
      setLastBackupAt(backup.exportedAt)
      setMessage(`备份已生成：${fileName}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '导出备份失败。')
    }
  }

  async function selectFile(file: File | undefined) {
    setError(undefined)
    setMessage(undefined)
    setPendingBackup(undefined)
    setSummary(undefined)
    if (file === undefined) return
    try {
      const prepared = backupApplicationService.prepareImport(await file.text())
      setPendingBackup(prepared.backup)
      setSummary(prepared.summary)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '备份文件无效。')
    }
  }

  async function confirmRestore() {
    if (pendingBackup === undefined) return
    if (!window.confirm('确认完整替换当前设备上的 GymLog 数据？此操作不会合并现有数据。'))
      return
    try {
      await backupApplicationService.restore(pendingBackup)
      setMessage('备份已恢复。训练、动作和统计数据已重新读取。')
      setPendingBackup(undefined)
      setSummary(undefined)
      const settings = await backupApplicationService.getSettings()
      setLastBackupAt(settings?.lastBackupAt)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '恢复备份失败；当前数据未被替换。',
      )
    }
  }

  return (
    <section className="page settings-page">
      <TopBar title="设置" />
      <p className="eyebrow">本地数据与备份</p>
      <section className="settings-card">
        <h2>数据备份</h2>
        <p>本地数据建议定期导出为 JSON 备份。</p>
        <p className="field-hint">最近备份：{formatDateTime(lastBackupAt)}</p>
        <button className="primary-button" onClick={() => void exportBackup()}>
          导出 JSON
        </button>
      </section>
      <section className="settings-card">
        <h2>恢复数据</h2>
        <p>导入将完整替换本地数据，不会合并。</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => void selectFile(event.target.files?.[0])}
        />
        <button className="quiet-button" onClick={() => inputRef.current?.click()}>
          选择备份
        </button>
        {summary && (
          <section className="backup-summary" aria-live="polite">
            <h3>导入摘要</h3>
            <p>导出时间：{formatDateTime(summary.exportedAt)}</p>
            <ul>
              <li>动作族：{summary.exerciseFamilies}</li>
              <li>动作：{summary.exercises}</li>
              <li>训练：{summary.workoutSessions}</li>
              <li>动作块：{summary.exerciseBlocks}</li>
              <li>记录：{summary.exerciseRecords}</li>
            </ul>
            <button className="danger-button" onClick={() => void confirmRestore()}>
              确认完整替换并恢复
            </button>
            <button
              onClick={() => {
                setPendingBackup(undefined)
                setSummary(undefined)
              }}
            >
              取消导入
            </button>
          </section>
        )}
      </section>
      {message && (
        <p className="form-warning" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
