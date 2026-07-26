import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaClient } from '@prisma/client';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtPayload } from './interface/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('AuthService');
  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  constructor(private readonly jwtService: JwtService) {
    super();
  }

  create(createUserDto: CreateUserDto) {
    try {
      const newUser = this.user.create({
        data: {
          user: createUserDto.email,
          password: createUserDto.password,
          fullName: createUserDto.fullName,
        },
      });

      return newUser;
    } catch (error) {
      console.log('Error creating user', error);
      throw error;
    }
  }

  async login(loginUserDto: LoginUserDto) {
    try {
      const { email, password } = loginUserDto;
      const user = await this.user.findUnique({
        where: {
          user: email,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.password !== password) {
        throw new UnauthorizedException('Invalid password');
      }

      return {
        ...user,
        token: this.getJwtToken({ email, id: user.id }),
      };
    } catch (error) {
      console.log('Error logging in', error);
      throw error;
    }
  }

  private getJwtToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  async findUser(id: string) {
    try {
      const user = await this.user.findUnique({
        where: {
          id,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      console.log('Error finding user', error);
      throw error;
    }
  }
}
