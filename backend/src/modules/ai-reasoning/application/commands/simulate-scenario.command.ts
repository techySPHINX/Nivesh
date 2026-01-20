/**
 * Simulate Scenario Command
 * Handles what-if scenario simulations
 */
export class SimulateScenarioCommand {
  constructor(
    public readonly userId: string,
    public readonly scenarioType: 'expense' | 'income_change' | 'goal_adjustment' | 'investment',
    public readonly parameters: Record<string, any>,
  ) { }
}
