import { Module, Global } from '@nestjs/common';
import { MongodbService } from './mongodb.service';

@Global()
@Module({
  providers: [MongodbService],
  exports: [MongodbService],
})
export class MongodbModule {}
