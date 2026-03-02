export class GetSimulationQuery {
  constructor(
    public readonly simulationId: string,
    public readonly userId: string,
  ) {}
}
