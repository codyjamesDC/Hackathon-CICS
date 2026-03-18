import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

type ExceptionOptions = {
  message?: string;
  cause?: unknown;
};

const createError = (
  status: ContentfulStatusCode,
  defaultMessage: string,
  arg?: string | ExceptionOptions,
) => {
  let message = defaultMessage;
  let options: ExceptionOptions = {};

  if (typeof arg === 'string') {
    message = arg;
  } else if (arg) {
    options = arg;
    message = arg.message ?? defaultMessage;
  }

  return new HTTPException(status, {
    message,
    cause: options.cause,
  });
};

export function BadRequest(arg?: string | ExceptionOptions) {
  return createError(400, 'Bad Request', arg);
}

export function Unauthorized(arg?: string | ExceptionOptions) {
  return createError(401, 'Unauthorized', arg);
}

export function Forbidden(arg?: string | ExceptionOptions) {
  return createError(403, 'Forbidden', arg);
}

export function NotFound(arg?: string | ExceptionOptions) {
  return createError(404, 'Not Found', arg);
}

export function Conflict(arg?: string | ExceptionOptions) {
  return createError(409, 'Conflict', arg);
}

export function InternalError(arg?: string | ExceptionOptions) {
  return createError(500, 'Internal Error', arg);
}
