import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Agency } from '../agency/agency.entity';
import { Listing } from 'src/listing/Listing.entity';

@Entity()
export class Agent {
  @PrimaryColumn('uuid')
  userId: string;

  @Column({ unique: true })
  licenseNumber: string;

  @Column({ type: 'date' })
  start_date: Date;

  @Column('text', { array: true })
  languages: string[];

  @OneToOne(() => User, (user) => user.id, {
    nullable: true,
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Agency, (agency) => agency.agents, {
    nullable: true,
    onDelete: 'CASCADE',
    eager: true,
  })
  agency: Agency;

  @OneToMany(() => Listing, (listing) => listing.agent)
  listings: Listing[];
}
