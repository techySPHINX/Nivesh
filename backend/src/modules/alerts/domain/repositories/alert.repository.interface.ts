import { Alert, AlertType, AlertSeverity } from '../entities/alert.entity';

export interface IAlertRepository {
  save(alert: Alert): Promise<Alert>;
  findById(id: string): Promise<Alert | null>;
  findByUserId(userId: string): Promise<Alert[]>;
  findActiveByUserId(userId: string): Promise<Alert[]>;
  findUnreadByUserId(userId: string): Promise<Alert[]>;
  findByType(userId: string, alertType: AlertType): Promise<Alert[]>;
  findBySeverity(userId: string, severity: AlertSeverity): Promise<Alert[]>;
  countUnread(userId: string): Promise<number>;
  delete(id: string): Promise<void>;
}

export const ALERT_REPOSITORY = Symbol('ALERT_REPOSITORY');
