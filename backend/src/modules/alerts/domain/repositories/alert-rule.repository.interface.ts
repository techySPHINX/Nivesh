import { AlertRule, AlertRuleType } from "../entities/alert-rule.entity";

export interface IAlertRuleRepository {
  save(rule: AlertRule): Promise<AlertRule>;
  findById(id: string): Promise<AlertRule | null>;
  findByUserId(userId: string): Promise<AlertRule[]>;
  findActiveByUserId(userId: string): Promise<AlertRule[]>;
  findByType(userId: string, ruleType: AlertRuleType): Promise<AlertRule[]>;
  delete(id: string): Promise<void>;
}

export const ALERT_RULE_REPOSITORY = Symbol("ALERT_RULE_REPOSITORY");
