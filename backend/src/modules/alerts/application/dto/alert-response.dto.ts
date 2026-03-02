import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Alert, AlertType, AlertSeverity } from '../../domain/entities/alert.entity';

export class AlertResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: AlertType })
  alertType: AlertType;

  @ApiProperty({ enum: AlertSeverity })
  severity: AlertSeverity;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  actionable: boolean;

  @ApiPropertyOptional()
  actionUrl: string | null;

  @ApiProperty()
  isRead: boolean;

  @ApiPropertyOptional()
  readAt: Date | null;

  @ApiProperty()
  isDismissed: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(alert: Alert): AlertResponseDto {
    const dto = new AlertResponseDto();
    dto.id = alert.id;
    dto.userId = alert.userId;
    dto.alertType = alert.alertType;
    dto.severity = alert.severity;
    dto.title = alert.title;
    dto.message = alert.message;
    dto.actionable = alert.actionable;
    dto.actionUrl = alert.actionUrl;
    dto.isRead = alert.isRead;
    dto.readAt = alert.readAt;
    dto.isDismissed = alert.isDismissed;
    dto.isActive = alert.isActive();
    dto.createdAt = alert.createdAt;
    return dto;
  }
}
