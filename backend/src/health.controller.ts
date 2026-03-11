import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "./core/database/postgres/prisma.service";
import { RedisService } from "./core/database/redis/redis.service";
import { Neo4jService } from "./core/database/neo4j/neo4j.service";
import { MongodbService } from "./core/database/mongodb/mongodb.service";
import { ClickhouseService } from "./core/database/clickhouse/clickhouse.service";

interface DependencyCheck {
  status: "up" | "down";
  responseTime?: number;
  error?: string;
}

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  service: string;
  details: Record<string, DependencyCheck>;
}

@ApiTags("health")
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
    private redisService: RedisService,
    private neo4jService: Neo4jService,
    private mongodbService: MongodbService,
    private clickhouseService: ClickhouseService,
  ) {}

  /**
   * Lightweight liveness probe for Kubernetes.
   * Only confirms process is running — no dependency checks.
   */
  @Get("live")
  @ApiOperation({
    summary: "Kubernetes liveness probe — fast, no dependency checks",
  })
  @ApiResponse({ status: 200, description: "Process is alive" })
  checkLiveness() {
    return {
      status: "alive",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Quick overview health check.
   * Returns basic service info + uptime.
   */
  @Get()
  @ApiOperation({ summary: "Basic health check with service info" })
  @ApiResponse({
    status: 200,
    description: "Service is healthy",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        timestamp: { type: "string", example: "2026-01-19T10:00:00.000Z" },
        uptime: { type: "number", example: 123.456 },
        environment: { type: "string", example: "development" },
        version: { type: "string", example: "1.0.0" },
      },
    },
  })
  checkHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get("NODE_ENV", "development"),
      version: "1.0.0",
      service: "Nivesh Backend",
    };
  }

  /**
   * Deep readiness probe — tests ALL critical dependencies.
   * Kubernetes readiness probe should point here.
   * Returns 200 if all critical deps are up, 503 if any are down.
   */
  @Get("ready")
  @ApiOperation({ summary: "Deep readiness check — probes all dependencies" })
  @ApiResponse({ status: 200, description: "All dependencies healthy" })
  @ApiResponse({
    status: 503,
    description: "One or more dependencies unhealthy",
  })
  async checkReadiness(): Promise<HealthCheckResult> {
    const checks: Record<string, DependencyCheck> = {};

    // Run all health checks in parallel with individual timeouts
    const [postgres, redis, neo4j, mongodb, clickhouse] =
      await Promise.allSettled([
        this.timedCheck("postgres", () => this.prismaService.healthCheck()),
        this.timedCheck("redis", () => this.redisService.healthCheck()),
        this.timedCheck("neo4j", () => this.neo4jService.healthCheck()),
        this.timedCheck("mongodb", () => this.mongodbService.healthCheck()),
        this.timedCheck("clickhouse", () =>
          this.clickhouseService.healthCheck(),
        ),
      ]);

    // Collect results
    const results = [
      { name: "postgres", result: postgres },
      { name: "redis", result: redis },
      { name: "neo4j", result: neo4j },
      { name: "mongodb", result: mongodb },
      { name: "clickhouse", result: clickhouse },
    ];

    for (const { name, result } of results) {
      if (result.status === "fulfilled") {
        checks[name] = result.value;
      } else {
        checks[name] = {
          status: "down",
          error: result.reason?.message || "Unknown error",
        };
      }
    }

    // Determine overall status
    const allUp = Object.values(checks).every((c) => c.status === "up");
    const allDown = Object.values(checks).every((c) => c.status === "down");
    let overallStatus: "healthy" | "degraded" | "unhealthy";

    if (allUp) {
      overallStatus = "healthy";
    } else if (allDown) {
      overallStatus = "unhealthy";
    } else {
      overallStatus = "degraded";
    }

    const response: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      environment: this.configService.get("NODE_ENV", "development"),
      service: "Nivesh Backend",
      details: checks,
    };

    // If not all healthy, return 503
    if (overallStatus === "unhealthy") {
      this.logger.error(
        "Readiness check FAILED — dependencies unhealthy",
        checks,
      );
      throw new ServiceUnavailableException(response);
    }

    if (overallStatus === "degraded") {
      this.logger.warn(
        "Readiness check DEGRADED — some dependencies unhealthy",
        checks,
      );
    }

    return response;
  }

  /**
   * Wraps a health check function with a 5-second timeout and measures response time.
   */
  private async timedCheck(
    name: string,
    checkFn: () => Promise<boolean>,
  ): Promise<DependencyCheck> {
    const start = Date.now();
    const timeoutMs = 5000;

    try {
      const result = await Promise.race([
        checkFn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `${name} health check timed out after ${timeoutMs}ms`,
                ),
              ),
            timeoutMs,
          ),
        ),
      ]);

      const responseTime = Date.now() - start;

      if (result) {
        return { status: "up", responseTime };
      }
      return {
        status: "down",
        responseTime,
        error: `${name} returned unhealthy`,
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      return {
        status: "down",
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
