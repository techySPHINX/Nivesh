import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';
import { randomUUID } from 'crypto';

const REQUEST_ID_HEADER = 'x-request-id';
const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      (req.headers[REQUEST_ID_HEADER] as string) || randomUUID();
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) || requestId;

    // Attach to request for downstream use
    (req as any).requestId = requestId;
    (req as any).correlationId = correlationId;

    // Set response headers
    res.setHeader(REQUEST_ID_HEADER, requestId);
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    // Add to active OTel span as attributes
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttribute('http.request_id', requestId);
      activeSpan.setAttribute('http.correlation_id', correlationId);
    }

    next();
  }
}
