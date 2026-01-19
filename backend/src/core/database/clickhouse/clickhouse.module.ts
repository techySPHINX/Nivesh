import { Module, Global } from '@nestjs/common';
import { ClickhouseService } from './clickhouse.service';

@Global()
@Module({
  providers: [ClickhouseService],
  exports: [ClickhouseService],
})
export class ClickhouseModule {}
