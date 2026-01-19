import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../application/dto/user.dto';
import { CreateUserCommand } from '../application/commands/create-user.command';
import { UpdateUserCommand } from '../application/commands/update-user.command';
import {
  GetUserQuery,
  GetUserByEmailQuery,
  GetAllUsersQuery,
} from '../application/queries/user.queries';
import { User } from '../domain/entities/user.entity';
import { JwtAuthGuard } from '../../../core/security/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/security/auth/decorators/current-user.decorator';
import { Public } from '../../../core/security/auth/decorators/auth.decorators';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const command = new CreateUserCommand(
      dto.email,
      dto.firstName,
      dto.lastName,
      dto.phoneNumber,
      dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      dto.firebaseUid,
    );

    const user = await this.commandBus.execute<CreateUserCommand, User>(command);

    return this.toResponse(user);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  async getCurrentUser(@CurrentUser('userId') userId: string): Promise<UserResponseDto> {
    const query = new GetUserQuery(userId);
    const user = await this.queryBus.execute<GetUserQuery, User>(query);

    return this.toResponse(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    const query = new GetUserQuery(id);
    const user = await this.queryBus.execute<GetUserQuery, User>(query);

    return this.toResponse(user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: [UserResponseDto],
  })
  async getAllUsers(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('isActive') isActive?: boolean,
  ): Promise<{ users: UserResponseDto[]; total: number; skip: number; take: number }> {
    const query = new GetAllUsersQuery(
      skip ? parseInt(skip.toString()) : 0,
      take ? parseInt(take.toString()) : 10,
      isActive,
    );

    const result = await this.queryBus.execute<
      GetAllUsersQuery,
      { users: User[]; total: number }
    >(query);

    return {
      users: result.users.map((u) => this.toResponse(u)),
      total: result.total,
      skip: query.skip,
      take: query.take,
    };
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Get user by email' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByEmail(@Param('email') email: string): Promise<UserResponseDto> {
    const query = new GetUserByEmailQuery(email);
    const user = await this.queryBus.execute<GetUserByEmailQuery, User>(query);

    return this.toResponse(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const command = new UpdateUserCommand(id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      profilePicture: dto.profilePicture,
      riskProfile: dto.riskProfile,
    });

    const user = await this.commandBus.execute<UpdateUserCommand, User>(command);

    return this.toResponse(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string): Promise<void> {
    // Implementation would use a DeleteUserCommand
    // For now, this is a placeholder
  }

  // Helper method to convert domain entity to DTO
  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email.getValue(),
      phoneNumber: user.phoneNumber?.getValue(),
      firstName: user.name.getFirstName(),
      lastName: user.name.getLastName(),
      fullName: user.name.getFullName(),
      dateOfBirth: user.dateOfBirth?.toISOString(),
      profilePicture: user.profilePicture,
      kycStatus: user.kycStatus,
      riskProfile: user.riskProfile,
      isActive: user.isActive,
      isProfileComplete: user.isProfileComplete(),
      isKycVerified: user.isKycVerified(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
