/**
 * Process Financial Query Command
 * Handles user questions about financial decisions
 */
export class ProcessQueryCommand {
  constructor(
    public readonly userId: string,
    public readonly query: string,
    public readonly queryType: 'affordability' | 'goal_projection' | 'budget_optimization' | 'general',
    public readonly context?: Record<string, any>,
  ) { }
}
