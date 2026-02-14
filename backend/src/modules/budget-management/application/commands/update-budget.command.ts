import { UpdateBudgetDto } from '../dto';

export class UpdateBudgetCommand {
  constructor(
    public readonly budgetId: string,
    public readonly userId: string,
    public readonly updateBudgetDto: UpdateBudgetDto,
  ) {}
}
