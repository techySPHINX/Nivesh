import { Module, Global } from '@nestjs/common';
import { FirebaseModule } from './firebase/firebase.module';
import { GeminiModule } from './gemini/gemini.module';

@Global()
@Module({
  imports: [FirebaseModule, GeminiModule],
  exports: [FirebaseModule, GeminiModule],
})
export class IntegrationsModule { }
