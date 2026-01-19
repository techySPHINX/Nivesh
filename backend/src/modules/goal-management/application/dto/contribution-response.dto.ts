import { ContributionType } from '../../domain/entities/goal-contribution.entity';

export class ContributionResponseDto {
  id: string;
  goalId: string;
  userId: string;
  amount: number;
  currency: string;
  type: ContributionType;
  transactionId: string | null;
  accountId: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
}
