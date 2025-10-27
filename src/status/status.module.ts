import { Module } from '@nestjs/common';
import { StatusController } from './status.controller';
import { CountriesModule } from '../countries/countries.module';

@Module({
  imports: [CountriesModule],
  controllers: [StatusController],
})
export class StatusModule {}
