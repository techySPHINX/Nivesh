import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('security.jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('security.jwt.expiresIn'),
        },
      }),
    }),
  ],
  exports: [JwtModule, PassportModule],
})
export class SecurityModule {}
