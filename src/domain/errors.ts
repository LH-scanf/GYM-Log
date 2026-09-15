export class DataIntegrityError extends Error {
  override name = 'DataIntegrityError'
}

export class ImportFormatError extends Error {
  override name = 'ImportFormatError'
}

export class NotFoundError extends Error {
  override name = 'NotFoundError'
}

export class StorageError extends Error {
  override name = 'StorageError'
}

export class UnsupportedBackupVersionError extends Error {
  override name = 'UnsupportedBackupVersionError'
}

export class ValidationError extends Error {
  override name = 'ValidationError'
}
