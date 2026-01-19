import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HashingService {
  private readonly rounds: number;

  constructor(private configService: ConfigService) {
    this.rounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
  }

  async hash(plain: string): Promise<string> {
    return await bcrypt.hash(plain, this.rounds);
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(plain, hashed);
  }

  async verify(plain: string, hashed: string): Promise<boolean> {
    return await this.compare(plain, hashed);
  }
}
