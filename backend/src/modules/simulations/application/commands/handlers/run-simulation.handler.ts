import { CommandHandler, ICommandHandler, EventBus } from "@nestjs/cqrs";
import { Inject, Logger } from "@nestjs/common";
import { RunSimulationCommand } from "../run-simulation.command";
import { SimulationResponseDto } from "../../dto/simulation-response.dto";
import {
  ISimulationRepository,
  SIMULATION_REPOSITORY,
} from "../../../domain/repositories/simulation.repository.interface";
import {
  Simulation,
  SimulationType,
} from "../../../domain/entities/simulation.entity";
import {
  SimulationStartedEvent,
  SimulationCompletedEvent,
  SimulationFailedEvent,
} from "../../../domain/events/simulation.events";

@CommandHandler(RunSimulationCommand)
export class RunSimulationHandler implements ICommandHandler<RunSimulationCommand> {
  private readonly logger = new Logger(RunSimulationHandler.name);

  constructor(
    @Inject(SIMULATION_REPOSITORY)
    private readonly simulationRepository: ISimulationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RunSimulationCommand): Promise<SimulationResponseDto> {
    const { userId, runSimulationDto } = command;

    const simulation = Simulation.create({
      id: crypto.randomUUID(),
      userId,
      name: runSimulationDto.name,
      type: runSimulationDto.type,
      scenario: runSimulationDto.scenario,
      inputParameters: {
        initialAmount: runSimulationDto.initialAmount,
        monthlyContribution: runSimulationDto.monthlyContribution,
        durationMonths: runSimulationDto.durationMonths,
        expectedAnnualReturn: runSimulationDto.expectedAnnualReturn,
        riskLevel: runSimulationDto.riskLevel,
        inflationRate: runSimulationDto.inflationRate,
        iterations: runSimulationDto.iterations,
      },
    });

    // Persist initial state
    await this.simulationRepository.save(simulation);

    this.eventBus.publish(
      new SimulationStartedEvent(
        simulation.id,
        userId,
        simulation.type,
        simulation.name,
      ),
    );

    try {
      simulation.markRunning();

      // Dispatch to the correct engine based on simulation type
      let results: ReturnType<Simulation["runMonteCarloSimulation"]>;
      switch (simulation.type) {
        case SimulationType.WHAT_IF:
          results = simulation.runWhatIfSimulation();
          break;
        case SimulationType.STRESS_TEST:
          results = simulation.runStressTestSimulation();
          break;
        case SimulationType.MONTE_CARLO:
        default:
          results = simulation.runMonteCarloSimulation();
          break;
      }

      simulation.complete(results);

      const savedSimulation = await this.simulationRepository.save(simulation);

      this.eventBus.publish(
        new SimulationCompletedEvent(
          simulation.id,
          userId,
          simulation.type,
          results.median,
          new Date(),
        ),
      );

      this.logger.log(
        `Simulation [${simulation.type}] completed: ${simulation.id} — median: ${results.median}`,
      );
      return SimulationResponseDto.fromEntity(savedSimulation);
    } catch (error) {
      simulation.fail();
      await this.simulationRepository.save(simulation);

      this.eventBus.publish(
        new SimulationFailedEvent(simulation.id, userId, error.message),
      );

      this.logger.error(`Simulation failed: ${simulation.id}`, error);
      throw error;
    }
  }
}
