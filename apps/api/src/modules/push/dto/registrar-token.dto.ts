import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistrarTokenDto {
  @IsString()
  @MinLength(10)
  @MaxLength(255)
  token!: string;

  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  plataforma?: 'ios' | 'android' | 'web';
}
