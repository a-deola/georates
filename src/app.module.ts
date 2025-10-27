import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountriesModule } from './countries/countries.module';
import { StatusController } from './status/status.controller';
import { StatusModule } from './status/status.module';
import * as dotenv from 'dotenv';

dotenv.config();
const dbUrl = new URL(process.env.DATABASE_URL);

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port),
      username: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.replace('/', ''),
      ssl: { rejectUnauthorized: false },
      entities: [__dirname + '/**/*.entity{.ts}'],
      autoLoadEntities: true,
      synchronize: false,
      logging: true,
    }),
    CountriesModule,
    StatusModule,
  ],
  controllers: [StatusController],
})
export class AppModule {}
