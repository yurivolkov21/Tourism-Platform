import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

/** Subscriber row — admin list/export surface. */
export class SubscriberDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiProperty({ nullable: true, type: String, example: 'footer' })
  source!: string | null;

  @ApiProperty({ format: 'date-time' })
  subscribedAt!: string;
}

/** Enveloped (`{ data, meta }`) admin subscribers list — for Swagger. */
export class PaginatedSubscribersDto {
  @ApiProperty({ type: [SubscriberDto] })
  data!: SubscriberDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
