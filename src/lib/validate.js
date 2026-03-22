import { AppError } from './AppError.js';

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((e) => e.message).join(', ');
    throw new AppError(message, 400);
  }

  return result.data;
}
