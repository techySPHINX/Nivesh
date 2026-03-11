import { RunSimulationDto } from "../dto/run-simulation.dto";

export class RunSimulationCommand {
  constructor(
    public readonly userId: string,
    public readonly runSimulationDto: RunSimulationDto,
  ) {}
}
