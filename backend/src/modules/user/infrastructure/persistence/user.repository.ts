import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/postgres/prisma.service';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User, KycStatus, RiskProfile } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { UserName } from '../../domain/value-objects/user-name.vo';

@Injectable()
export class UserRepository implements IUserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(private readonly prisma: PrismaService) { }

  async save(user: User): Promise<User> {
    const data = user.toPersistence();

    const savedUser = await this.prisma.user.upsert({
      where: { id: data.id },
      create: data,
      update: {
        email: data.email,
        phoneNumber: data.phoneNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        profilePicture: data.profilePicture,
        kycStatus: data.kycStatus,
        riskProfile: data.riskProfile,
        isActive: data.isActive,
        updatedAt: data.updatedAt,
        lastLoginAt: data.lastLoginAt,
      },
    });

    this.logger.debug(`User saved: ${savedUser.id}`);

    return this.toDomain(savedUser);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    return user ? this.toDomain(user) : null;
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { firebaseUid },
    });

    return user ? this.toDomain(user) : null;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    return user ? this.toDomain(user) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase() },
    });

    return count > 0;
  }

  async existsByPhoneNumber(phoneNumber: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { phoneNumber },
    });

    return count > 0;
  }

  async findAll(options: {
    skip?: number;
    take?: number;
    isActive?: boolean;
  }): Promise<{ users: User[]; total: number }> {
    const where = options.isActive !== undefined ? { isActive: options.isActive } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: options.skip || 0,
        take: options.take || 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => this.toDomain(u)),
      total,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });

    this.logger.log(`User soft deleted: ${id}`);
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });

    this.logger.warn(`User hard deleted: ${id}`);
  }

  // Helper method to convert Prisma model to domain entity
  private toDomain(prismaUser: any): User {
    const email = new Email(prismaUser.email);
    const name = new UserName(prismaUser.firstName, prismaUser.lastName);
    const phoneNumber = prismaUser.phoneNumber
      ? new PhoneNumber(prismaUser.phoneNumber)
      : undefined;

    return User.fromPersistence({
      id: prismaUser.id,
      email,
      phoneNumber,
      name,
      dateOfBirth: prismaUser.dateOfBirth,
      profilePicture: prismaUser.profilePicture,
      kycStatus: prismaUser.kycStatus as KycStatus,
      riskProfile: prismaUser.riskProfile as RiskProfile | undefined,
      firebaseUid: prismaUser.firebaseUid,
      isActive: prismaUser.isActive,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      lastLoginAt: prismaUser.lastLoginAt,
    });
  }
}
