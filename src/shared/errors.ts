export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code = 'bad_request'
  ) {
    super(message);
  }
}
