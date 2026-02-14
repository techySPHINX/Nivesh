import { CreateBudgetDto } from '../dto';

export class CreateBudgetCommand {
  constructor(
    public readonly userId: string,
    public readonly createBudgetDto: CreateBudgetDto,
  ) {}
}
