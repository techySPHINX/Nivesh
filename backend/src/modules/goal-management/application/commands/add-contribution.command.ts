import { AddContributionDto } from '../dto/add-contribution.dto';

export class AddContributionCommand {
  constructor(
    public readonly userId: string,
    public readonly goalId: string,
    public readonly dto: AddContributionDto,
  ) { }
}
