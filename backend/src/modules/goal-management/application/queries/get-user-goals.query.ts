import { GoalStatus, GoalCategory } from '../../domain/entities/goal.entity';

export class GetUserGoalsQuery {
  constructor(
    public readonly userId: string,
    public readonly status?: GoalStatus,
    public readonly category?: GoalCategory,
    public readonly includeCompleted?: boolean,
  ) { }
}
