import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsInt,
} from 'class-validator';
import { ListingCategory } from 'src/common/types/listing-category';

export class ModifyListingDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  address: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  municipality: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  postalCode: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  province: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  size: string;

  @IsInt()
  @IsOptional()
  numberOfRooms: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  energyClass: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description: string;

  @IsNumber()
  @IsOptional()
  price: number;

  @IsEnum(ListingCategory)
  @IsOptional()
  category: ListingCategory;

  @IsString()
  @IsOptional()
  floor: string;

  @IsBoolean()
  @IsOptional()
  hasElevator: boolean;

  @IsBoolean()
  @IsOptional()
  hasAirConditioning: boolean;

  @IsBoolean()
  @IsOptional()
  hasGarage: boolean;
}
