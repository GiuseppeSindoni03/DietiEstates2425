import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Agency } from '../agency/agency.entity';

@Entity()
export class SupportAdmin {
  @PrimaryColumn('uuid')
  userId: string;

  @OneToOne(() => User, (user) => user.id, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Agency, (agency) => agency.id, { onDelete: 'CASCADE' })
  agency: Agency;
}
