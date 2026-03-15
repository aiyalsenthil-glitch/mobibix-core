import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

/**
 * Standard pagination DTO for list endpoints
 *
 * Usage:
 * @Get()
 * async list(@Query() pagination: PaginationDto) {
 *   const { skip, take } = pagination;
 *   // Use in service
 * }
 */
export class PaginationDto {
  @ApiProperty({
    required: false,
    minimum: 0,
    default: 0,
    description: 'Number of records to skip',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 100,
    default: 50,
    description: 'Number of records to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 50;

  @ApiProperty({
    required: false,
    description: 'Search query string',
  })
  @IsOptional()
  search?: string;
}

/**
 * Standard paginated response wrapper
 *
 * Usage:
 * return new PaginatedResponse(data, total, pagination.skip, pagination.take);
 */
export class PaginatedResponse<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty()
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };

  constructor(data: T[], total: number, skip: number = 0, take: number = 50) {
    this.data = data;

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);

    this.pagination = {
      total,
      page,
      limit: take,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }
}

/**
 * Extended pagination DTO with sorting
 */
export class PaginationWithSortDto extends PaginationDto {
  @ApiProperty({
    required: false,
    description: 'Field to sort by',
  })
  @IsOptional()
  sortBy?: string;

  @ApiProperty({
    required: false,
    enum: ['asc', 'desc'],
    default: 'desc',
    description: 'Sort direction',
  })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
