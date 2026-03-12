import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CompatibilityService } from './compatibility.service';
import { CreateCompatibilityGroupDto, AddPhoneToGroupDto, LinkPartToGroupDto } from './dto/compatibility.dto';

@ApiTags('Compatibility Engine')
@Controller('compatibility')
export class CompatibilityController {
  constructor(private readonly compatibilityService: CompatibilityService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for compatible parts for a phone model' })
  @ApiQuery({ name: 'model', description: 'Name of the phone model (e.g., Samsung A50)' })
  async search(@Query('model') model: string) {
    return this.compatibilityService.searchCompatibleParts(model);
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create a new compatibility group' })
  async createGroup(@Body() dto: CreateCompatibilityGroupDto) {
    return this.compatibilityService.createGroup(dto);
  }

  @Post('groups/:id/add-phone')
  @ApiOperation({ summary: 'Add a phone model to a compatibility group' })
  async addPhone(@Param('id') id: string, @Body() dto: AddPhoneToGroupDto) {
    return this.compatibilityService.addPhoneToGroup(id, dto);
  }

  @Post('groups/:id/link-part')
  @ApiOperation({ summary: 'Link a part to a compatibility group' })
  async linkPart(@Param('id') id: string, @Body() dto: LinkPartToGroupDto) {
    return this.compatibilityService.linkPartToGroup(id, dto);
  }

  @Post('suggest')
  @ApiOperation({ summary: 'Suggest compatible models based on patterns' })
  async suggest(@Body('model') model: string) {
    return {
      model,
      suggestions: await this.compatibilityService.suggestCompatibleModels(model)
    };
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete phone model names' })
  @ApiQuery({ name: 'query', description: 'Search query for phone models' })
  async autocomplete(@Query('query') query: string) {
    return this.compatibilityService.autocompletePhoneModels(query);
  }
}
