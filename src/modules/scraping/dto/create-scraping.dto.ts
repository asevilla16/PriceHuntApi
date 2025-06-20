import { IsString } from 'class-validator';

export class CreateScrapingDto {
  @IsString()
  supermarket: string;
}
