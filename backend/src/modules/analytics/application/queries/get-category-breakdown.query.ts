export class GetCategoryBreakdownQuery {
  constructor(
    public readonly userId: string,
    public readonly from?: string,
    public readonly to?: string,
  ) {}
}
