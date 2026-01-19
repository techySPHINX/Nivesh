import { CreateGoalDto } from '../dto/create-goal.dto';

export class CreateGoalCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: CreateGoalDto,
  ) { }
}
