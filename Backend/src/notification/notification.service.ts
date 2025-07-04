import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { UserNotification } from './user-notification.entity';
import { UserItem } from 'src/common/types/userItem';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PropertyOffer } from 'src/property_offer/property_offer.entity';
import { User } from 'src/auth/user.entity';
import { UserRoles } from 'src/common/types/user-roles';
import { NotificationType } from 'src/common/types/notification.enum';
import { Listing } from 'src/listing/Listing.entity';
import { Client } from 'src/client/client.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    @InjectRepository(UserNotification)
    private readonly userNotificationRepository: Repository<UserNotification>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  //viene creata una notifica promozionale per un immobile

  async createPromotionalNotification(user: User,createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const result = this.notificationRepository.create({
      ...createNotificationDto,
      date: new Date(),
      createdBy: { id: user.id } as User,
    });


    //viene salvata la notifica creata
    const savedNotification = await this.notificationRepository.save(result);

    const allClients = await this.userRepository.find({
      where: { role: UserRoles.CLIENT },
      select: ['id'], 
    });
  
    // 3. Crea UserNotification per ciascun client
    const userNotifications = allClients.map((client) => ({
      user: { id: client.id }, // entità parziale User
      notification: { id: savedNotification.id }, // entità parziale Notification
      isRead: false,
    }));
  
    await this.userNotificationRepository.save(userNotifications);

    return savedNotification;
  }

  async createResearchNotification(
    userId: string,
    listingId: string,
  ): Promise<Notification> {

    const listing = await this.notificationRepository.manager.findOne(Listing, {
      where: { id: listingId },
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    const result = this.notificationRepository.create({
      title: "Nuovo immobile in linea con le tue ricerche",
      description: "È stato aggiunto recentemente un immobile in linea alle tue ricerche precedenti",
      category: NotificationType.SEARCH,
      date: new Date(),
      listing: listing,
      createdBy: { id: userId} as User, // Associa l'utente che crea la notifica
    });

    //viene salvata la notifica creata
    const savedNotification = await this.notificationRepository.save(result);

    //recupero tutti i clienti che hanno fatto la ricerca in quella municipalità
    const municipality = listing.municipality;

    const AllClient = await this.clientRepository
      .createQueryBuilder('client')
      .innerJoin('client.research', 'research')
      .where('client.searchNotification = true')
      .andWhere('research.municipality = :municipality', { municipality })
      .getMany();

    const userNotifications = AllClient.map((user) => ({
      user: { id: user.userId }, // entità parziale User
      notification: { id: savedNotification.id }, // entità parziale Notification
      isRead: false,
    }));

    //vengono create le entita userNotification
    await this.userNotificationRepository.save(userNotifications);

    return savedNotification;
  }

  //viene creata una notifica specifica per una offerta
  async createSpecificNotificationOffer(
    createNotificationDto: CreateNotificationDto,
    propertyOffer: PropertyOffer,
    update: boolean,
  ): Promise<Notification> {
    //se l offerta è stata fatta da un cliente viene notificato l agente
    //l agente vien recuperato da propertyOffer e listing
    //se l offerta è stata fatta da un agente viene notificato il cliente
    //il cliente viene recuperato da propertyOffer

    //in caso di update la logica è esattamente il contrario

    let user: { userId: string };
    if (propertyOffer.guestEmail) return new Notification();

    if (!update) {
      // Caso normale: offerta nuova
      user = propertyOffer.madeByUser
        ? propertyOffer.listing.agent
        : propertyOffer.client;
    } else {
      // Caso update: inverti logica
      user = propertyOffer.madeByUser
        ? propertyOffer.client
        : propertyOffer.listing.agent;
    }

    const result = this.notificationRepository.create({
      ...createNotificationDto,
      date: new Date(),
      propertyOffer: propertyOffer,
      createdBy: { id: user.userId }, // Associa l'utente che crea la notifica
    });

    const savedNotification = await this.notificationRepository.save(result);
    //viene creata l entita userNotification
    const userNotification = this.userNotificationRepository.create({
      user: { id: user.userId },
      notification: { id: savedNotification.id },
      isRead: false,
    });

    //console.log('Saved Notification:', result);
    //console.log('UserNotification:', userNotification);

    //viene salvata la notifica creata
    await this.userNotificationRepository.save(userNotification);

    return savedNotification;
  }

  //restituisce tutte le notifiche non lette per un utente
  //viene utilizzato una qery builder personalizzata
  
  async Notifications(userId: string): Promise<Notification[]> {
    const notifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .innerJoinAndSelect('notification.userNotifications', 'userNotification', 'userNotification.user.id = :userId', { userId })
      .leftJoinAndSelect('notification.listing', 'listing')
      .leftJoinAndSelect('notification.propertyOffer', 'propertyOffer')
      .orderBy('notification.date', 'DESC')
      .getMany();
  
    return notifications;
  }

  async NotificationById(notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOneOrFail({
      where: { id: notificationId },
    });
    if (!notification) throw new Error('Notification not found');

    return notification;
  }

  //viene fatta update su isRead quando una notifica viene letta
  async Notification(userNotificationId: string): Promise<void> {
    await this.userNotificationRepository.update(
      { id: userNotificationId },
      { isRead: true },
    );
  }
}
