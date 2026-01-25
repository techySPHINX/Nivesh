-- CreateTable
CREATE TABLE "prompt_registry" (
    "id" TEXT NOT NULL,
    "promptName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "systemInstruction" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "topP" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "topK" INTEGER NOT NULL DEFAULT 40,
    "maxTokens" INTEGER NOT NULL DEFAULT 2048,
    "model" TEXT NOT NULL DEFAULT 'gemini-1.5-pro',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deployedAt" TIMESTAMP(3),
    "deprecatedAt" TIMESTAMP(3),
    "performanceMetrics" JSONB,
    "rollbackTrigger" TEXT,

    CONSTRAINT "prompt_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_ab_tests" (
    "id" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "controlPromptId" TEXT NOT NULL,
    "treatmentPromptId" TEXT NOT NULL,
    "trafficSplitPercentage" INTEGER NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "metrics" JSONB,
    "winner" TEXT,

    CONSTRAINT "prompt_ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_executions" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "outputText" TEXT,
    "tokensUsed" INTEGER,
    "latencyMs" INTEGER,
    "confidenceScore" DOUBLE PRECISION,
    "userFeedback" INTEGER DEFAULT 0,
    "safetyTriggered" BOOLEAN NOT NULL DEFAULT false,
    "safetyReason" TEXT,
    "ragContextUsed" JSONB,
    "functionCallsExecuted" JSONB,
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prompt_registry_promptName_status_idx" ON "prompt_registry"("promptName", "status");

-- CreateIndex
CREATE INDEX "prompt_registry_status_rolloutPercentage_idx" ON "prompt_registry"("status", "rolloutPercentage");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_registry_promptName_version_key" ON "prompt_registry"("promptName", "version");

-- CreateIndex
CREATE INDEX "prompt_ab_tests_testName_idx" ON "prompt_ab_tests"("testName");

-- CreateIndex
CREATE INDEX "prompt_ab_tests_status_startDate_idx" ON "prompt_ab_tests"("status", "startDate");

-- CreateIndex
CREATE INDEX "prompt_executions_promptId_createdAt_idx" ON "prompt_executions"("promptId", "createdAt");

-- CreateIndex
CREATE INDEX "prompt_executions_userId_createdAt_idx" ON "prompt_executions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "prompt_executions_traceId_idx" ON "prompt_executions"("traceId");

-- AddForeignKey
ALTER TABLE "prompt_ab_tests" ADD CONSTRAINT "prompt_ab_tests_controlPromptId_fkey" FOREIGN KEY ("controlPromptId") REFERENCES "prompt_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_ab_tests" ADD CONSTRAINT "prompt_ab_tests_treatmentPromptId_fkey" FOREIGN KEY ("treatmentPromptId") REFERENCES "prompt_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_executions" ADD CONSTRAINT "prompt_executions_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "prompt_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
