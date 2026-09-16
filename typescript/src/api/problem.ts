export class ProblemError extends Error {
  readonly status: number
  readonly title: string
  readonly type: string
  readonly extra?: Record<string, unknown>

  constructor(status: number, title: string, detail: string, extra?: Record<string, unknown>) {
    super(detail)
    this.name = "ProblemError"
    this.status = status
    this.title = title
    this.type = "about:blank"
    this.extra = extra
  }
}

export class NotImplementedError extends ProblemError {
  constructor(operation: string) {
    super(501, "Not Implemented", operation)
    this.name = "NotImplementedError"
  }
}

export class UnauthorizedError extends ProblemError {
  constructor(detail: string) {
    super(401, "Unauthorized", detail)
    this.name = "UnauthorizedError"
  }
}

export function problemBody(error: ProblemError): Record<string, unknown> {
  return {
    type: error.type,
    title: error.title,
    status: error.status,
    detail: error.message,
    ...error.extra,
  }
}
