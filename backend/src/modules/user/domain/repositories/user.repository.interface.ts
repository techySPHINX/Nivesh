import { User } from '../entities/user.entity';

export interface IUserRepository {
  /**
   * Save a new user or update existing user
   */
  save(user: User): Promise<User>;

  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by Firebase UID
   */
  findByFirebaseUid(firebaseUid: string): Promise<User | null>;

  /**
   * Find user by phone number
   */
  findByPhoneNumber(phoneNumber: string): Promise<User | null>;

  /**
   * Check if email exists
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Check if phone number exists
   */
  existsByPhoneNumber(phoneNumber: string): Promise<boolean>;

  /**
   * Find all users with pagination
   */
  findAll(options: {
    skip?: number;
    take?: number;
    isActive?: boolean;
  }): Promise<{ users: User[]; total: number }>;

  /**
   * Delete user by ID (soft delete)
   */
  delete(id: string): Promise<void>;

  /**
   * Permanently delete user by ID (hard delete)
   */
  hardDelete(id: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
