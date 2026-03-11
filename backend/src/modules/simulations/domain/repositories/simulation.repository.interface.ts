import {
  Simulation,
  SimulationType,
  SimulationStatus,
} from "../entities/simulation.entity";

export interface ISimulationRepository {
  save(simulation: Simulation): Promise<Simulation>;
  findById(id: string): Promise<Simulation | null>;
  findByUserId(userId: string): Promise<Simulation[]>;
  findByUserIdPaginated(
    userId: string,
    skip: number,
    take: number,
  ): Promise<{ simulations: Simulation[]; total: number }>;
  findByType(userId: string, type: SimulationType): Promise<Simulation[]>;
  findByStatus(userId: string, status: SimulationStatus): Promise<Simulation[]>;
  delete(id: string): Promise<void>;
}

export const SIMULATION_REPOSITORY = Symbol("SIMULATION_REPOSITORY");
