import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'countries' })
export class Country {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  name: string;

  @Column({ nullable: true })
  capital: string | null;

  @Column({ nullable: true })
  region: string | null;

 
  @Column({ type: 'bigint' })
  population: number;

  
  @Column({ nullable: true })
  currency_code: string | null;

 
  @Column({ type: 'double', nullable: true })
  exchange_rate: number | null;

  @Column({ type: 'double', nullable: true })
  estimated_gdp: number | null;

  @Column({ nullable: true })
  flag_url: string | null;

@Column({
  type: 'timestamp',
  precision: 0,
  default: () => 'CURRENT_TIMESTAMP',
  onUpdate: 'CURRENT_TIMESTAMP',
})
last_refreshed_at: Date;

}
