import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import {
  CreatePaymentDto,
  VerifyPaymentDto,
  PaymentResponseDto,
} from "../application/dto";
import {
  CreatePaymentCommand,
  VerifyPaymentCommand,
  CancelPaymentCommand,
  RefundPaymentCommand,
} from "../application/commands";
import {
  GetPaymentQuery,
  GetUserPaymentsQuery,
  GetPaymentsByStatusQuery,
} from "../application/queries";
import { PaymentStatus } from "../domain/entities/payment.entity";

@ApiTags("payments")
@ApiBearerAuth()
@Controller("payments")
export class PaymentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post("initiate")
  @ApiOperation({ summary: "Initiate a new payment" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Payment initiated successfully",
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  async initiatePayment(
    @Request() req,
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const userId = req.user?.sub || req.user?.userId || "anonymous";
    const command = new CreatePaymentCommand(userId, createPaymentDto);
    return this.commandBus.execute(command);
  }

  @Post(":id/verify")
  @ApiOperation({ summary: "Verify and capture payment from gateway callback" })
  @ApiParam({ name: "id", description: "Payment ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Payment verified and captured",
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Payment not found",
  })
  async verifyPayment(
    @Request() req,
    @Param("id") paymentId: string,
    @Body() verifyPaymentDto: VerifyPaymentDto,
  ): Promise<PaymentResponseDto> {
    const userId = req.user?.sub || req.user?.userId || "anonymous";
    const command = new VerifyPaymentCommand(
      paymentId,
      userId,
      verifyPaymentDto,
    );
    return this.commandBus.execute(command);
  }

  @Get()
  @ApiOperation({
    summary: "Get all payments for the current user (paginated)",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 20)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Payments retrieved successfully",
  })
  async getUserPayments(
    @Request() req,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const userId = req.user?.sub || req.user?.userId || "anonymous";
    const query = new GetUserPaymentsQuery(userId, page || 1, limit || 20);
    return this.queryBus.execute(query);
  }

  @Get("status/:status")
  @ApiOperation({ summary: "Get payments filtered by status" })
  @ApiParam({ name: "status", enum: PaymentStatus })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Filtered payments retrieved",
  })
  async getPaymentsByStatus(
    @Request() req,
    @Param("status") status: PaymentStatus,
  ): Promise<PaymentResponseDto[]> {
    const userId = req.user?.sub || req.user?.userId || "anonymous";
    const query = new GetPaymentsByStatusQuery(userId, status);
    return this.queryBus.execute(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get payment by ID" })
  @ApiParam({ name: "id", description: "Payment ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Payment retrieved successfully",
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Payment not found",
  })
  async getPayment(
    @Request() req,
    @Param("id") paymentId: string,
  ): Promise<PaymentResponseDto> {
    const userId = req.user?.sub || req.user?.userId || "anonymous";
    const query = new GetPaymentQuery(paymentId, userId);
    return this.queryBus.execute(query);
  }

  @Patch(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel a pending payment" })
  @ApiParam({ name: "id", description: "Payment ID" })
  @ApiResponse({ status: HttpStatus.OK, description: "Payment cancelled" })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Payment cannot be cancelled",
  })
  async cancelPayment(@Request() req, @Param("id") paymentId: string) {
    const userId = req.user?.sub || req.user?.userId || "anonymous";
    const command = new CancelPaymentCommand(paymentId, userId);
    await this.commandBus.execute(command);
    return { message: "Payment cancelled successfully" };
  }

  @Patch(":id/refund")
  @ApiOperation({ summary: "Refund a captured payment" })
  @ApiParam({ name: "id", description: "Payment ID" })
  @ApiQuery({ name: "partial", required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Payment refunded",
    type: PaymentResponseDto,
  })
  async refundPayment(
    @Request() req,
    @Param("id") paymentId: string,
    @Query("partial") partial?: string,
  ): Promise<PaymentResponseDto> {
    const userId = req.user?.sub || req.user?.userId || "anonymous";
    const isPartial = partial === "true";
    const command = new RefundPaymentCommand(paymentId, userId, isPartial);
    return this.commandBus.execute(command);
  }
}
