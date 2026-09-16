import {
  assertValidRecordSchema,
  validateExerciseRecord,
} from '../../domain/exercise/validation'
import type {
  Exercise,
  ExerciseRecord,
  ExerciseRecordValues,
} from '../../domain/exercise/types'
import { DataIntegrityError } from '../../domain/errors'
import {
  assertValidOrder,
  assertValidWorkoutSession,
} from '../../domain/workout/validation'
import type { ExerciseBlock, WorkoutSession } from '../../domain/workout/types'
import type { GymLogDatabase } from '../db/gym-log-database'
import { assertFound, createId, nowIso } from './repository-helpers'

export interface CreateWorkoutSessionInput {
  date: string
  startTime?: string
  endTime?: string
  note?: string
}

export interface WorkoutDetail {
  session: WorkoutSession
  blocks: Array<{
    block: ExerciseBlock
    exercise: Exercise
    records: ExerciseRecord[]
  }>
}

export interface ExerciseHistoryEntry {
  session: WorkoutSession
  block: ExerciseBlock
  records: ExerciseRecord[]
}

export class WorkoutRepository {
  constructor(private readonly database: GymLogDatabase) {}

  async createSession(input: CreateWorkoutSessionInput): Promise<WorkoutSession> {
    assertValidWorkoutSession(input)
    const timestamp = nowIso()
    const session: WorkoutSession = {
      id: createId(),
      date: input.date,
      ...(input.startTime === undefined ? {} : { startTime: input.startTime }),
      ...(input.endTime === undefined ? {} : { endTime: input.endTime }),
      ...(input.note === undefined ? {} : { note: input.note }),
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await this.database.workoutSessions.add(session)
    return session
  }

  async getSessionById(id: string): Promise<WorkoutSession | undefined> {
    return this.database.workoutSessions.get(id)
  }

  async updateWorkoutTime(
    id: string,
    input: Pick<CreateWorkoutSessionInput, 'date' | 'startTime' | 'endTime'>,
  ): Promise<WorkoutSession> {
    const session = assertFound(await this.getSessionById(id), 'Workout session', id)
    assertValidWorkoutSession(input)
    const updated: WorkoutSession = {
      ...session,
      date: input.date,
      ...(input.startTime === undefined ? {} : { startTime: input.startTime }),
      ...(input.endTime === undefined ? {} : { endTime: input.endTime }),
      updatedAt: nowIso(),
    }

    if (input.startTime === undefined) {
      delete updated.startTime
    }

    if (input.endTime === undefined) {
      delete updated.endTime
    }

    await this.database.workoutSessions.put(updated)
    return updated
  }

  async listSessionsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<WorkoutSession[]> {
    return this.database.workoutSessions
      .where('date')
      .between(startDate, endDate, true, true)
      .reverse()
      .sortBy('date')
  }

  async listAllSessions(): Promise<WorkoutSession[]> {
    return this.database.workoutSessions.toArray()
  }

  async listAllBlocks(): Promise<ExerciseBlock[]> {
    return this.database.exerciseBlocks.toArray()
  }

  async moveExerciseBlock(id: string, direction: -1 | 1): Promise<void> {
    const block = assertFound(
      await this.database.exerciseBlocks.get(id),
      'Exercise block',
      id,
    )
    const blocks = await this.listBlocksBySession(block.sessionId)
    const index = blocks.findIndex((value) => value.id === id)
    const next = index + direction
    if (next < 0 || next >= blocks.length) return
    ;[blocks[index], blocks[next]] = [blocks[next], blocks[index]]
    await this.database.transaction('rw', this.database.exerciseBlocks, async () => {
      await this.database.exerciseBlocks.bulkPut(
        blocks.map((value, order) => ({ ...value, order, updatedAt: nowIso() })),
      )
    })
  }

  async moveExerciseRecord(id: string, direction: -1 | 1): Promise<void> {
    const record = assertFound(
      await this.database.exerciseRecords.get(id),
      'Exercise record',
      id,
    )
    const records = await this.listRecordsByBlock(record.exerciseBlockId)
    const index = records.findIndex((value) => value.id === id)
    const next = index + direction
    if (next < 0 || next >= records.length) return
    ;[records[index], records[next]] = [records[next], records[index]]
    await this.database.transaction('rw', this.database.exerciseRecords, async () => {
      await this.database.exerciseRecords.bulkPut(
        records.map((value, order) => ({ ...value, order, updatedAt: nowIso() })),
      )
    })
  }

  async addExerciseBlock(
    sessionId: string,
    exerciseId: string,
    note?: string,
  ): Promise<ExerciseBlock> {
    const [session, exercise, blocks] = await Promise.all([
      this.database.workoutSessions.get(sessionId),
      this.database.exercises.get(exerciseId),
      this.listBlocksBySession(sessionId),
    ])

    assertFound(session, 'Workout session', sessionId)
    assertFound(exercise, 'Exercise', exerciseId)
    const timestamp = nowIso()
    const block: ExerciseBlock = {
      id: createId(),
      sessionId,
      exerciseId,
      order: blocks.length,
      ...(note === undefined ? {} : { note }),
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await this.database.exerciseBlocks.add(block)
    return block
  }

  async listBlocksBySession(sessionId: string): Promise<ExerciseBlock[]> {
    const blocks = await this.database.exerciseBlocks
      .where('sessionId')
      .equals(sessionId)
      .toArray()
    return blocks.sort((left, right) => left.order - right.order)
  }

  async addExerciseRecord(
    exerciseBlockId: string,
    values: ExerciseRecordValues,
  ): Promise<ExerciseRecord> {
    const block = assertFound(
      await this.database.exerciseBlocks.get(exerciseBlockId),
      'Exercise block',
      exerciseBlockId,
    )
    const exercise = assertFound(
      await this.database.exercises.get(block.exerciseId),
      'Exercise',
      block.exerciseId,
    )
    assertValidRecordSchema(exercise.recordSchema, exercise.loadMode)
    validateExerciseRecord(exercise, values)

    const records = await this.listRecordsByBlock(exerciseBlockId)
    const timestamp = nowIso()
    const record: ExerciseRecord = {
      id: createId(),
      exerciseBlockId,
      order: records.length,
      ...values,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await this.database.exerciseRecords.add(record)
    return record
  }

  async updateExerciseRecord(
    id: string,
    values: ExerciseRecordValues,
  ): Promise<ExerciseRecord> {
    const record = assertFound(
      await this.database.exerciseRecords.get(id),
      'Exercise record',
      id,
    )
    const block = assertFound(
      await this.database.exerciseBlocks.get(record.exerciseBlockId),
      'Exercise block',
      record.exerciseBlockId,
    )
    const exercise = assertFound(
      await this.database.exercises.get(block.exerciseId),
      'Exercise',
      block.exerciseId,
    )
    const updated = { ...record, ...values, updatedAt: nowIso() }

    validateExerciseRecord(exercise, updated, { allowHistoricalFields: true })
    await this.database.exerciseRecords.put(updated)
    return updated
  }

  async listRecordsByBlock(exerciseBlockId: string): Promise<ExerciseRecord[]> {
    const records = await this.database.exerciseRecords
      .where('exerciseBlockId')
      .equals(exerciseBlockId)
      .toArray()
    return records.sort((left, right) => left.order - right.order)
  }

  async removeExerciseRecord(id: string): Promise<void> {
    const record = assertFound(
      await this.database.exerciseRecords.get(id),
      'Exercise record',
      id,
    )

    await this.database.transaction('rw', this.database.exerciseRecords, async () => {
      await this.database.exerciseRecords.delete(id)
      await this.reindexRecords(record.exerciseBlockId)
    })
  }

  async removeExerciseBlock(id: string): Promise<void> {
    const block = assertFound(
      await this.database.exerciseBlocks.get(id),
      'Exercise block',
      id,
    )

    await this.database.transaction(
      'rw',
      this.database.exerciseBlocks,
      this.database.exerciseRecords,
      async () => {
        await this.database.exerciseRecords.where('exerciseBlockId').equals(id).delete()
        await this.database.exerciseBlocks.delete(id)
        await this.reindexBlocks(block.sessionId)
      },
    )
  }

  async deleteWorkoutSession(id: string): Promise<void> {
    assertFound(await this.database.workoutSessions.get(id), 'Workout session', id)

    await this.database.transaction(
      'rw',
      this.database.workoutSessions,
      this.database.exerciseBlocks,
      this.database.exerciseRecords,
      async () => {
        const blocks = await this.database.exerciseBlocks
          .where('sessionId')
          .equals(id)
          .toArray()
        const blockIds = blocks.map((block) => block.id)

        if (blockIds.length > 0) {
          await this.database.exerciseRecords
            .where('exerciseBlockId')
            .anyOf(blockIds)
            .delete()
        }

        await this.database.exerciseBlocks.where('sessionId').equals(id).delete()
        await this.database.workoutSessions.delete(id)
      },
    )
  }

  async getWorkoutById(id: string): Promise<WorkoutDetail | undefined> {
    const session = await this.database.workoutSessions.get(id)

    if (session === undefined) {
      return undefined
    }

    const blocks = await this.listBlocksBySession(id)
    const detailBlocks = await Promise.all(
      blocks.map(async (block) => {
        const exercise = await this.database.exercises.get(block.exerciseId)

        if (exercise === undefined) {
          throw new DataIntegrityError(
            `Exercise ${block.exerciseId} is missing from workout history.`,
          )
        }

        return { block, exercise, records: await this.listRecordsByBlock(block.id) }
      }),
    )

    return { session, blocks: detailBlocks }
  }

  async listExerciseHistory(exerciseId: string): Promise<ExerciseHistoryEntry[]> {
    const blocks = await this.database.exerciseBlocks
      .where('exerciseId')
      .equals(exerciseId)
      .toArray()
    const entries = await Promise.all(
      blocks.map(async (block) => {
        const session = await this.database.workoutSessions.get(block.sessionId)

        if (session === undefined) {
          throw new DataIntegrityError(`Workout session ${block.sessionId} is missing.`)
        }

        return { session, block, records: await this.listRecordsByBlock(block.id) }
      }),
    )

    return entries.sort((left, right) =>
      right.session.date.localeCompare(left.session.date),
    )
  }

  private async reindexBlocks(sessionId: string): Promise<void> {
    const blocks = await this.listBlocksBySession(sessionId)
    const timestamp = nowIso()
    const reindexed = blocks.map((block, index) => ({
      ...block,
      order: index,
      updatedAt: timestamp,
    }))

    for (const block of reindexed) {
      assertValidOrder(block.order, 'Exercise block')
    }

    await this.database.exerciseBlocks.bulkPut(reindexed)
  }

  private async reindexRecords(exerciseBlockId: string): Promise<void> {
    const records = await this.listRecordsByBlock(exerciseBlockId)
    const timestamp = nowIso()
    const reindexed = records.map((record, index) => ({
      ...record,
      order: index,
      updatedAt: timestamp,
    }))

    for (const record of reindexed) {
      assertValidOrder(record.order, 'Exercise record')
    }

    await this.database.exerciseRecords.bulkPut(reindexed)
  }
}
