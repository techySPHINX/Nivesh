import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/postgres/prisma.service';
import { ISimulationRepository } from '../../domain/repositories/simulation.repository.interface';
import {
  Simulation,
  SimulationType,
  SimulationStatus,
} from '../../domain/entities/simulation.entity';

@Injectable()
export class SimulationRepository implements ISimulationRepository {
  private readonly logger = new Logger(SimulationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(simulation: Simulation): Promise<Simulation> {
    const data = {
      id: simulation.id,
      userId: simulation.userId,
      name: simulation.name,
      type: simulation.type,
      scenario: simulation.scenario,
      inputParameters: simulation.inputParameters as any,
      results: simulation.results as any || undefined,
      status: simulation.status,
      metadata: simulation.metadata || undefined,
      completedAt: simulation.completedAt,
    };

    const result = await this.prisma.simulation.upsert({
      where: { id: simulation.id },
      create: data,
      update: data,
    });

    return Simulation.fromPersistence(result);
  }

  async findById(id: string): Promise<Simulation | null> {
    const result = await this.prisma.simulation.findUnique({ where: { id } });
    return result ? Simulation.fromPersistence(result) : null;
  }

  async findByUserId(userId: string): Promise<Simulation[]> {
    const results = await this.prisma.simulation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return results.map(Simulation.fromPersistence);
  }

  async findByUserIdPaginated(
    userId: string,
    skip: number,
    take: number,
  ): Promise<{ simulations: Simulation[]; total: number }> {
    const [results, total] = await Promise.all([
      this.prisma.simulation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.simulation.count({ where: { userId } }),
    ]);

    return {
      simulations: results.map(Simulation.fromPersistence),
      total,
    };
  }

  async findByType(userId: string, type: SimulationType): Promise<Simulation[]> {
    const results = await this.prisma.simulation.findMany({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
    });
    return results.map(Simulation.fromPersistence);
  }

  async findByStatus(userId: string, status: SimulationStatus): Promise<Simulation[]> {
    const results = await this.prisma.simulation.findMany({
      where: { userId, status },
      orderBy: { createdAt: 'desc' },
    });
    return results.map(Simulation.fromPersistence);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.simulation.delete({ where: { id } });
  }
}
