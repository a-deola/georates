import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  HttpStatus,
  HttpException,
  Query,
  Res,
} from '@nestjs/common';
import { CountriesService } from './countries.service';
import { Response } from 'express';
import * as fs from 'fs/promises';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Post('refresh')
  async refresh() {
    return await this.countriesService.refreshAll();
  }

  @Get()
  async getCountries(
    @Query('region') region?: string,
    @Query('currency') currency?: string,
    @Query('sort') sort?: string,
  ) {
    return this.countriesService.findAll({ region, currency, sort });
  }

  @Get('image')
  async getImage(@Res() res: Response) {
    const p = process.env.CACHE_IMAGE_PATH || './cache/summary.png';
    try {
      const data = await fs.readFile(p);
      res.type('image/png').send(data);
    } catch (e) {
      return res.status(404).json({ error: 'Summary image not found' });
    }
  }

  @Get(':name')
  async findOne(@Param('name') name: string) {
    const country = await this.countriesService.findByName(name);
    if (!country) {
      throw new HttpException(
        { error: 'Country not found' },
        HttpStatus.NOT_FOUND,
      );
    }
    return country;
  }

  @Delete(':name')
  async deleteOne(@Param('name') name: string) {
    const deleted = await this.countriesService.removeOne(name);
    if (!deleted)
      throw new HttpException(
        { error: 'Country not found' },
        HttpStatus.NOT_FOUND,
      );
    return { success: true };
  }
}
