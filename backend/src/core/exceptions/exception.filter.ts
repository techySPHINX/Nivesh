import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from './base.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let code: string;
    let details: any;
    let stack: string | undefined;

    // Handle BaseException (our custom exceptions)
    if (exception instanceof BaseException) {
      status = exception.statusCode;
      message = exception.message;
      code = exception.code;
      details = exception.details;
      stack = exception.stack;
    }
    // Handle NestJS HttpException
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        code = (exceptionResponse as any).error || 'HTTP_EXCEPTION';
        details = exceptionResponse;
      } else {
        message = exceptionResponse as string;
        code = 'HTTP_EXCEPTION';
      }
      stack = exception.stack;
    }
    // Handle unknown errors
    else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message || 'Internal server error';
      code = 'INTERNAL_SERVER_ERROR';
      stack = exception.stack;
    }
    // Handle non-Error exceptions
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      code = 'UNKNOWN_ERROR';
    }

    // Log the error
    const errorLog = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      code,
      message,
      details,
      stack: process.env.NODE_ENV === 'development' ? stack : undefined,
    };

    if (status >= 500) {
      this.logger.error('Server Error', JSON.stringify(errorLog));
    } else {
      this.logger.warn('Client Error', JSON.stringify(errorLog));
    }

    // Send error response
    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      code,
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && stack && { stack }),
    };

    response.status(status).json(errorResponse);
  }
}
