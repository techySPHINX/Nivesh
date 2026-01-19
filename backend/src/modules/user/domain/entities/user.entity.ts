import { Email } from '../value-objects/email.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { UserName } from '../value-objects/user-name.vo';

export enum KycStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum RiskProfile {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive',
}

export interface UserProps {
  id: string;
  email: Email;
  phoneNumber?: PhoneNumber;
  name: UserName;
  dateOfBirth?: Date;
  profilePicture?: string;
  kycStatus: KycStatus;
  riskProfile?: RiskProfile;
  firebaseUid?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export class User {
  private props: UserProps;

  constructor(props: UserProps) {
    this.props = props;
  }

  // Factory method for creating new users
  static create(
    id: string,
    email: Email,
    name: UserName,
    firebaseUid?: string,
  ): User {
    return new User({
      id,
      email,
      name,
      firebaseUid,
      kycStatus: KycStatus.PENDING,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Factory method for reconstituting from persistence
  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get phoneNumber(): PhoneNumber | undefined {
    return this.props.phoneNumber;
  }

  get name(): UserName {
    return this.props.name;
  }

  get dateOfBirth(): Date | undefined {
    return this.props.dateOfBirth;
  }

  get profilePicture(): string | undefined {
    return this.props.profilePicture;
  }

  get kycStatus(): KycStatus {
    return this.props.kycStatus;
  }

  get riskProfile(): RiskProfile | undefined {
    return this.props.riskProfile;
  }

  get firebaseUid(): string | undefined {
    return this.props.firebaseUid;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  // Business logic methods
  updateProfile(updates: {
    name?: UserName;
    phoneNumber?: PhoneNumber;
    dateOfBirth?: Date;
    profilePicture?: string;
  }): void {
    if (updates.name) {
      this.props.name = updates.name;
    }
    if (updates.phoneNumber) {
      this.props.phoneNumber = updates.phoneNumber;
    }
    if (updates.dateOfBirth) {
      this.props.dateOfBirth = updates.dateOfBirth;
    }
    if (updates.profilePicture !== undefined) {
      this.props.profilePicture = updates.profilePicture;
    }
    this.props.updatedAt = new Date();
  }

  updateKycStatus(status: KycStatus): void {
    this.props.kycStatus = status;
    this.props.updatedAt = new Date();
  }

  updateRiskProfile(profile: RiskProfile): void {
    this.props.riskProfile = profile;
    this.props.updatedAt = new Date();
  }

  recordLogin(): void {
    this.props.lastLoginAt = new Date();
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  // Check if KYC is completed
  isKycVerified(): boolean {
    return this.props.kycStatus === KycStatus.VERIFIED;
  }

  // Check if profile is complete
  isProfileComplete(): boolean {
    return !!(
      this.props.email &&
      this.props.name &&
      this.props.phoneNumber &&
      this.props.dateOfBirth &&
      this.props.riskProfile
    );
  }

  // Convert to plain object for persistence
  toPersistence(): any {
    return {
      id: this.props.id,
      email: this.props.email.getValue(),
      phoneNumber: this.props.phoneNumber?.getValue(),
      firstName: this.props.name.getFirstName(),
      lastName: this.props.name.getLastName(),
      dateOfBirth: this.props.dateOfBirth,
      profilePicture: this.props.profilePicture,
      kycStatus: this.props.kycStatus,
      riskProfile: this.props.riskProfile,
      firebaseUid: this.props.firebaseUid,
      isActive: this.props.isActive,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      lastLoginAt: this.props.lastLoginAt,
    };
  }
}
