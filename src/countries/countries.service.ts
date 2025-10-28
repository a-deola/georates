import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, EntityManager, Not, IsNull } from 'typeorm';
import { Country } from './entities/country.entity';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createCanvas, registerFont } from 'canvas';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Country) private countryRepository: Repository<Country>,
  ) {}

  private RESTCOUNTRIES_URL =
    'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies';
  private EXCHANGE_URL = 'https://open.er-api.com/v6/latest/USD';

  private async fetchExternal() {
    const timeout = +process.env.REFRESH_TIMEOUT_MS || 20000;

    try {
      const [countriesResp, exchangeResp] = await Promise.all([
        axios.get(this.RESTCOUNTRIES_URL, { timeout }),
        axios.get(this.EXCHANGE_URL, { timeout }),
      ]);

      if (!countriesResp.data || !Array.isArray(countriesResp.data)) {
        throw new HttpException(
          {
            error: 'External data source unavailable',
            details: 'Invalid response from Countries API',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (!exchangeResp.data || !exchangeResp.data.rates) {
        throw new HttpException(
          {
            error: 'External data source unavailable',
            details: 'Invalid response from Exchange Rates API',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return { countries: countriesResp.data, exchange: exchangeResp.data };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.config?.url?.includes('restcountries')) {
          throw new HttpException(
            {
              error: 'External data source unavailable',
              details: 'Could not fetch data from Countries API',
            },
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        } else if (err.config?.url?.includes('exchange')) {
          throw new HttpException(
            {
              error: 'External data source unavailable',
              details: 'Could not fetch data from Exchange Rates API',
            },
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
      }

      throw new HttpException(
        {
          error: 'External data source unavailable',
          details: 'Could not fetch data from external API',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private randBetween(min = 1000, max = 2000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async generateSummaryImage(now, countries, manager?): Promise<void> {
    const top5 = await (
      manager ? manager.getRepository(Country) : this.countryRepository
    ).find({
      where: { estimated_gdp: Not(IsNull()) },
      order: { estimated_gdp: 'DESC' },
      take: 5,
    });

    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#000';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(`Countries Summary`, 40, 60);
    ctx.font = '16px Arial';
    ctx.fillText(`Total countries: ${countries.length}`, 40, 90);
    ctx.fillText(`Last refreshed: ${now}`, 40, 115);

    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Top 5 by estimated GDP', 40, 160);

    ctx.font = '18px Arial';
    let y = 200;
    top5.forEach((c, idx) => {
      ctx.fillText(
        `${idx + 1}. ${c.name} — ${Number(c.estimated_gdp).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        60,
        y,
      );
      y += 30;
    });

    const outPath = process.env.CACHE_IMAGE_PATH || './cache/summary.png';
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outPath, buffer);
  }
  private async processCountries(
  manager: EntityManager,
  countries: any[],
  exchange: any,
  now: Date,
): Promise<void> {
  for (const c of countries) {
    try {
      await this.upsertCountry(manager, c, exchange, now);
    } catch (error) {
      console.error(`Failed to upsert ${c.name}:`, error.message);
    }
  }
}
private async upsertCountry(
  manager: EntityManager,
  c: any,
  exchange: any,
  now: Date,
): Promise<void> {
  const name: string = c.name;
  const capital: string = c.capital ?? null;
  const region: string = c.region ?? null;
  const population: number = Number(c.population);

  let currency_code: string | null = null;
  if (Array.isArray(c.currencies) && c.currencies.length > 0) {
    const first = c.currencies[0];
    currency_code = first && first.code ? first.code : null;
  }

  let exchange_rate: number | null = null;
  let estimated_gdp: number | null = null;

  if (currency_code && exchange?.rates?.[currency_code]) {
    exchange_rate = Number(exchange.rates[currency_code]);
    const multiplier = this.randBetween(1000, 2000);
    estimated_gdp = (population * multiplier) / exchange_rate;
  } else {
    exchange_rate = null;
    estimated_gdp = 0;
  }

  const repo = manager.getRepository(Country);
  const existing = await repo.findOne({ where: { name: ILike(name) } });

  if (existing) {
    existing.capital = capital;
    existing.region = region;
    existing.population = population;
    existing.currency_code = currency_code;
    existing.exchange_rate = exchange_rate;
    existing.estimated_gdp = estimated_gdp;
    existing.flag_url = c.flag ?? null;
    existing.last_refreshed_at = now;
    await repo.save(existing);
  } else {
    const ent = repo.create({
      name,
      capital,
      region,
      population,
      currency_code,
      exchange_rate,
      estimated_gdp,
      flag_url: c.flag ?? null,
      last_refreshed_at: now,
    });
    await repo.save(ent);
  }
}


 async refreshAll(): Promise<{ total: number; last_refreshed_at: string }> {
  const now = new Date();

  let countries: any[];
  let exchange: any;

  try {
    const data = await this.fetchExternal(); 
    countries = data.countries;
    exchange = data.exchange;
  } catch (error) {
    throw new HttpException(
      {
        error: 'Internal server error',
        details: 'Failed to fetch external data',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  try {
    return await this.countryRepository.manager.transaction(async (manager) => {
      await this.processCountries(manager, countries, exchange, now);
      await this.generateSummaryImage(now, countries, manager);


      return {
        total: countries.length,
        last_refreshed_at: now.toISOString(),
      };
    });
  } catch (err) {
    console.error('Transaction failed:', err);
    throw new HttpException(
      {
        error: 'Internal server error',
        details: 'Database or upsert operation failed',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}



  async findAll(query: any) {
    const qb = this.countryRepository.createQueryBuilder('c');

    if (query.region)
      qb.andWhere('c.region = :region', { region: query.region });
    if (query.currency)
      qb.andWhere('c.currency_code = :currency', { currency: query.currency });
    if (query.sort === 'gdp_desc') qb.orderBy('c.estimated_gdp', 'DESC');

    const items = await qb.getMany();
    return items;
  }

  async findByName(name: string): Promise<Country | null> {
    return await this.countryRepository.findOne({
      where: { name: ILike(name) },
    });
  }

  async removeOne(name: string) {
    const entity = await this.countryRepository.findOne({
      where: { name: ILike(name) },
    });
    if (!entity) return false;
    await this.countryRepository.remove(entity);
    return true;
  }

  async status() {
    const total = await this.countryRepository.count();
    const last = await this.countryRepository
      .createQueryBuilder('c')
      .select('MAX(c.last_refreshed_at)', 'last')
      .getRawOne();
    return {
      total_countries: total,
      last_refreshed_at: last ? last.last : null,
    };
  }
}
