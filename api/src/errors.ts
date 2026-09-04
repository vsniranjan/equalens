export class HttpError extends Error {
  constructor(
    readonly status: 400 | 401 | 404 | 413 | 429 | 502 | 503 | 504,
    readonly publicMessage: string,
    message = publicMessage,
    readonly headers?: HeadersInit,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class AIValidationError extends HttpError {
  constructor(message: string) {
    super(502, "AI response failed validation", message);
    this.name = "AIValidationError";
  }
}
