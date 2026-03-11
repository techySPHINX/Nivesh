/**
 * Local LLM Module
 *
 * Provides LLaMA-3-8B-Instruct (primary) and Mistral-7B-Instruct (fallback)
 * via Ollama for all AI features. Replaces the previous Gemini module.
 */
import { Module, Global } from "@nestjs/common";
import { LLMService } from "./llm.service";

@Global()
@Module({
  providers: [LLMService],
  exports: [LLMService],
})
export class LLMModule {}
