import { ApiProperty } from '@nestjs/swagger';

/** One blog tag (public + admin reads). */
export class PostTagDto {
  @ApiProperty({ example: 'ha-long' })
  slug!: string;

  @ApiProperty({ example: 'Hạ Long' })
  name!: string;
}

/** Tag + how many posts carry it (published-only on the public endpoint). */
export class PostTagWithCountDto extends PostTagDto {
  @ApiProperty({ example: 4 })
  count!: number;
}
