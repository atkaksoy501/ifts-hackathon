import type { ErrorEnvelope } from "@module1/contracts";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorEnvelope["error"]["code"],
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>
) {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response, next).catch(next);
  };
}

export function correlationIdMiddleware(request: Request, response: Response, next: NextFunction) {
  const correlationId = request.headers["x-correlation-id"]?.toString() ?? randomUUID();
  response.locals.correlationId = correlationId;
  response.setHeader("x-correlation-id", correlationId);
  next();
}

export function errorHandler(error: unknown, request: Request, response: Response, _next: NextFunction) {
  const correlationId =
    response.locals.correlationId?.toString() ?? request.headers["x-correlation-id"]?.toString() ?? randomUUID();

  if (error instanceof ZodError) {
    return response.status(400).json({
      error: {
        code: "INVALID_REQUEST",
        message: "Invalid request payload.",
        details: { issues: error.issues },
        correlationId
      }
    } satisfies ErrorEnvelope);
  }

  if (error instanceof ApiError) {
    const envelope: ErrorEnvelope = {
      error: {
        code: error.code,
        message: error.message,
        correlationId
      }
    };

    if (error.details) {
      envelope.error.details = error.details;
    }

    return response.status(error.status).json(envelope);
  }

  return response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected backend error.",
      correlationId
    }
  } satisfies ErrorEnvelope);
}
