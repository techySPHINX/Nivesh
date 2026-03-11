import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

export interface CategorizationResult {
  category: string;
  confidence: number;
}

/**
 * ML Categorization Service
 *
 * Calls the ml-services FastAPI /predict/intent endpoint to auto-classify
 * a transaction description into a spending category.
 *
 * Endpoint: POST http://<ML_SERVICE_URL>/predict/intent
 * Request:  { query: "<description> amount:<amount>" }
 * Response: { intent: "<category>", confidence: <0-1> }
 *
 * Falls back gracefully to 'Uncategorised' on any error so it never
 * blocks the transaction creation flow.
 */
@Injectable()
export class MlCategorizationService {
  private readonly logger = new Logger(MlCategorizationService.name);
  private readonly mlServiceUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get<string>(
      "ML_SERVICE_URL",
      "http://ml-services:8000",
    );
    this.apiKey = this.configService.get<string>("ML_API_KEY", "");
  }

  /**
   * Predict the category of a transaction using its description and amount.
   * Returns a default result on failure to avoid blocking transaction creation.
   */
  async categorizeTransaction(
    description: string,
    amount: number,
  ): Promise<CategorizationResult> {
    if (!description?.trim()) {
      return { category: "Uncategorised", confidence: 0 };
    }

    try {
      const query = `${description.trim()} amount:${amount}`;
      const response = await firstValueFrom(
        this.httpService.post<{ intent: string; confidence: number }>(
          `${this.mlServiceUrl}/predict/intent`,
          { query },
          {
            headers: { "X-API-Key": this.apiKey },
            timeout: 3000, // 3 s — fail fast, non-blocking
          },
        ),
      );

      const { intent, confidence } = response.data;
      const category = this.mapIntentToCategory(intent);
      this.logger.debug(
        `ML categorised "${description}" → ${category} (confidence: ${confidence})`,
      );
      return { category, confidence };
    } catch (error) {
      // Log at debug level — categorisation failure must not break transactions
      this.logger.debug(
        `ML categorisation skipped for "${description}": ${error?.message}`,
      );
      return { category: "Uncategorised", confidence: 0 };
    }
  }

  /**
   * Map ML intent labels to human-readable category names.
   * Extend this map as more intents are trained.
   */
  private mapIntentToCategory(intent: string): string {
    const intentCategoryMap: Record<string, string> = {
      // Intent labels produced by intent_classifier model
      spending_analysis: "Shopping",
      food_dining: "Food & Dining",
      transportation: "Transportation",
      utilities: "Utilities",
      entertainment: "Entertainment",
      healthcare: "Healthcare",
      education: "Education",
      travel: "Travel",
      investment: "Investment",
      emi_loan: "EMI & Loans",
      insurance: "Insurance",
      rent: "Rent",
      salary_income: "Salary",
      freelance_income: "Freelance",
      // Fallback for unrecognised intents
      affordability_check: "Shopping",
      goal_planning: "Savings",
      budget_query: "Budget",
      investment_advice: "Investment",
      transaction_search: "Uncategorised",
    };

    return intentCategoryMap[intent] ?? "Uncategorised";
  }
}
