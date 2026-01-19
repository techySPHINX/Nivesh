import { UpdateGoalDto } from '../dto/update-goal.dto';

export class UpdateGoalCommand {
  constructor(
    public readonly userId: string,
    public readonly goalId: string,
    public readonly dto: UpdateGoalDto,
  ) { }
}
