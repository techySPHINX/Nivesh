export class DeleteSimulationCommand {
  constructor(
    public readonly simulationId: string,
    public readonly userId: string,
  ) {}
}
