import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        console.log('JWT Module registered', process.env.JWT_SECRET);
        return {
          secret: process.env.JWT_SECRET || 'fallback_secret',
          signOptions: { expiresIn: '2h' },
        };
      },
    }),
  ],
  exports: [JwtModule, PassportModule, JwtModule],
})
export class AuthModule {}
