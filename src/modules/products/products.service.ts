import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductsService');
  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  create(createProductDto: CreateProductDto) {
    try {
      return this.product.create({
        data: createProductDto,
      });
    } catch (error) {
      console.error('Error creating product', error);
      throw error;
    }
  }

  findAll() {
    return this.product.findMany();
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
