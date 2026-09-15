import { NotFoundError, ValidationError } from '../../domain/errors'

export function createId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function assertNonEmptyName(name: string, entityName: string): string {
  const normalizedName = name.trim()

  if (normalizedName.length === 0) {
    throw new ValidationError(`${entityName} name must not be empty.`)
  }

  return normalizedName
}

export function assertFound<T>(value: T | undefined, entityName: string, id: string): T {
  if (value === undefined) {
    throw new NotFoundError(`${entityName} ${id} was not found.`)
  }

  return value
}
