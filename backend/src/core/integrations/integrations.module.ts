import { Module, Global } from "@nestjs/common";
import { FirebaseModule } from "./firebase/firebase.module";
import { LLMModule } from "./llm/llm.module";

@Global()
@Module({
  imports: [FirebaseModule, LLMModule],
  exports: [FirebaseModule, LLMModule],
})
export class IntegrationsModule {}
