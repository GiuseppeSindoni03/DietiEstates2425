import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ListingCategory } from '../common/types/listing-category';
import { Agency } from '../agency/agency.entity';
import { Exclude } from 'class-transformer';
import { Agent } from 'src/agent/agent.entity';
import { PropertyOffer } from 'src/property_offer/property_offer.entity';
import { Notification } from '../notification/notification.entity';

@Entity()
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  address: string;

  @Column()
  municipality: string;

  @Column()
  postalCode: string;

  @Column()
  province: string;

  @Column()
  size: string;

  @Column('double precision')
  latitude: number;

  @Column('double precision')
  longitude: number;

  @Column('int')
  numberOfRooms: number;

  @Column()
  energyClass: string;

  @Column('text', { array: true })
  nearbyPlaces: string[];

  @Column('text')
  description: string;

  @Column('float')
  price: number;

  @Column({ type: 'enum', enum: ListingCategory })
  category: ListingCategory;

  @Column()
  floor: string;

  @Column()
  hasElevator: boolean;

  @Column()
  hasAirConditioning: boolean;

  @Column()
  hasGarage: boolean;

  @Exclude()
  @ManyToOne(() => Agency, (agency) => agency.listings, {
    onDelete: 'CASCADE',
    nullable: true,
    eager: true,
  })
  agency: Agency;

  @Exclude()
  @ManyToOne(() => Agent, (agent) => agent.listings, {
    onDelete: 'CASCADE',
    nullable: true,
    eager: true,
  })
  agent: Agent;

  @OneToMany(() => PropertyOffer, (offer) => offer.listing)
  propertyOffers: PropertyOffer[];

  @OneToMany(() => Notification, (notification) => notification.listing)
  notifications: Notification[];
}
