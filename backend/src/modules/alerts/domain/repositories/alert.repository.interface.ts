import { Alert, AlertType, AlertSeverity } from "../entities/alert.entity";

export interface IAlertRepository {
  save(alert: Alert): Promise<Alert>;
  findById(id: string): Promise<Alert | null>;
  findByUserId(
    userId: string,
    skip?: number,
    take?: number,
    filters?: { type?: string; severity?: string },
  ): Promise<Alert[]>;
  findActiveByUserId(
    userId: string,
    skip?: number,
    take?: number,
  ): Promise<Alert[]>;
  findUnreadByUserId(userId: string): Promise<Alert[]>;
  findByType(userId: string, alertType: AlertType): Promise<Alert[]>;
  findBySeverity(userId: string, severity: AlertSeverity): Promise<Alert[]>;
  countUnread(userId: string): Promise<number>;
  countUnreadByUserId(userId: string): Promise<number>;
  countActiveByUserId(userId: string): Promise<number>;
  countByUserId(
    userId: string,
    filters?: { type?: string; severity?: string },
  ): Promise<number>;
  delete(id: string): Promise<void>;
}

export const ALERT_REPOSITORY = Symbol("ALERT_REPOSITORY");
