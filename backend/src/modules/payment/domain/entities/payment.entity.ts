/**
 * Payment Status Enum
 * Represents different states in the payment lifecycle
 */
export enum PaymentStatus {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Payment Method Enum
 */
export enum PaymentMethod {
  CARD = 'CARD',
  UPI = 'UPI',
  NETBANKING = 'NETBANKING',
  WALLET = 'WALLET',
  EMI = 'EMI',
}

/**
 * Payment Entity
 * Represents a payment transaction with complete lifecycle management
 */
export class Payment {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly currency: string,
    public status: PaymentStatus,
    public method: PaymentMethod | null,
    public gatewayPaymentId: string | null,
    public gatewayOrderId: string | null,
    public gatewaySignature: string | null,
    public description: string,
    public customerEmail: string | null,
    public customerPhone: string | null,
    public metadata: Record<string, any> | null,
    public errorCode: string | null,
    public errorDescription: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) { }

  /**
   * Factory method to create a new payment
   */
  static create(params: {
    id: string;
    userId: string;
    orderId: string;
    amount: number;
    currency: string;
    description: string;
    customerEmail?: string;
    customerPhone?: string;
    metadata?: Record<string, any>;
  }): Payment {
    return new Payment(
      params.id,
      params.userId,
      params.orderId,
      params.amount,
      params.currency,
      PaymentStatus.CREATED,
      null,
      null,
      null,
      null,
      params.description,
      params.customerEmail || null,
      params.customerPhone || null,
      params.metadata || null,
      null,
      null,
      new Date(),
      new Date(),
    );
  }

  /**
   * Mark payment as authorized
   */
  authorize(gatewayPaymentId: string, gatewayOrderId: string, method: PaymentMethod): void {
    if (this.status !== PaymentStatus.CREATED && this.status !== PaymentStatus.PENDING) {
      throw new Error(`Cannot authorize payment in ${this.status} status`);
    }

    this.status = PaymentStatus.AUTHORIZED;
    this.gatewayPaymentId = gatewayPaymentId;
    this.gatewayOrderId = gatewayOrderId;
    this.method = method;
    this.updatedAt = new Date();
  }

  /**
   * Capture payment
   */
  capture(signature: string): void {
    if (this.status !== PaymentStatus.AUTHORIZED) {
      throw new Error(`Cannot capture payment in ${this.status} status`);
    }

    this.status = PaymentStatus.CAPTURED;
    this.gatewaySignature = signature;
    this.updatedAt = new Date();
  }

  /**
   * Fail payment
   */
  fail(errorCode: string, errorDescription: string): void {
    if (this.status === PaymentStatus.CAPTURED || this.status === PaymentStatus.REFUNDED) {
      throw new Error(`Cannot fail payment in ${this.status} status`);
    }

    this.status = PaymentStatus.FAILED;
    this.errorCode = errorCode;
    this.errorDescription = errorDescription;
    this.updatedAt = new Date();
  }

  /**
   * Refund payment (full or partial)
   */
  refund(isPartial: boolean = false): void {
    if (this.status !== PaymentStatus.CAPTURED) {
      throw new Error(`Cannot refund payment in ${this.status} status`);
    }

    this.status = isPartial ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED;
    this.updatedAt = new Date();
  }

  /**
   * Cancel payment
   */
  cancel(): void {
    if (
      this.status !== PaymentStatus.CREATED &&
      this.status !== PaymentStatus.PENDING &&
      this.status !== PaymentStatus.AUTHORIZED
    ) {
      throw new Error(`Cannot cancel payment in ${this.status} status`);
    }

    this.status = PaymentStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  /**
   * Check if payment is successful
   */
  isSuccessful(): boolean {
    return (
      this.status === PaymentStatus.CAPTURED || this.status === PaymentStatus.PARTIALLY_REFUNDED
    );
  }

  /**
   * Check if payment can be refunded
   */
  canBeRefunded(): boolean {
    return this.status === PaymentStatus.CAPTURED || this.status === PaymentStatus.PARTIALLY_REFUNDED;
  }

  /**
   * Check if payment is pending
   */
  isPending(): boolean {
    return this.status === PaymentStatus.PENDING || this.status === PaymentStatus.AUTHORIZED;
  }

  /**
   * Check if payment has failed
   */
  hasFailed(): boolean {
    return this.status === PaymentStatus.FAILED || this.status === PaymentStatus.CANCELLED;
  }

  /**
   * Factory method to recreate from persistence
   */
  static fromPersistence(data: any): Payment {
    return new Payment(
      data.id,
      data.userId,
      data.orderId,
      data.amount,
      data.currency,
      data.status,
      data.method,
      data.gatewayPaymentId,
      data.gatewayOrderId,
      data.gatewaySignature,
      data.description,
      data.customerEmail,
      data.customerPhone,
      data.metadata,
      data.errorCode,
      data.errorDescription,
      data.createdAt,
      data.updatedAt,
    );
  }
}
