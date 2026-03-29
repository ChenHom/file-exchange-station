export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly errorCode = 'BAD_REQUEST'
  ) {
    super(message);
  }
}
