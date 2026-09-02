export class MemoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoryError";
  }
}

export class ExtractionError extends MemoryError {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

export class PersistenceError extends MemoryError {
  constructor(message: string) {
    super(message);
    this.name = "PersistenceError";
  }
}

export class AIProviderError extends MemoryError {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
