import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TourDeparture } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { DepartureDto } from './dto/departure.dto';
import { ListDeparturesQueryDto } from './dto/list-departures-query.dto';
import { DeparturesService } from './departures.service';

/**
 * Public read surface for a tour's departures, nested at
 * `/tours/:slug/departures`. The service defaults `from = today` and
 * `status = OPEN`, and 404s when the parent tour is missing OR unpublished
 * (same conflation as `GET /tours/:slug` so draft slugs aren't probeable).
 */
@ApiTags('Tours — Departures')
@Controller('tours/:slug/departures')
export class DeparturesController {
  constructor(private readonly departuresService: DeparturesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List upcoming open departures for a tour' })
  @ApiOkResponse({ type: [DepartureDto], description: 'Ordered by startDate asc' })
  @ApiResponse({ status: 404, description: 'Tour not found or unpublished' })
  list(
    @Param('slug') slug: string,
    @Query() query: ListDeparturesQueryDto,
  ): Promise<TourDeparture[]> {
    return this.departuresService.findPublicListForTour(slug, query);
  }
}
