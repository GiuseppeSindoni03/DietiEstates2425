import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { OfferService } from './property-offer.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserRoles } from 'src/common/types/user-roles';
import { PropertyOffer } from './property_offer.entity';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { UserItem } from 'src/common/types/userItem';
import { GetUser } from 'src/auth/get-user.decorator';
import { CreateExternalOfferDto } from './dto/create-externalOffer.dto';
import { ListingResponse } from 'src/listing/dto/listing-with-image.dto';
import { ClientWithLastOfferDto } from './dto/last-offer.dto';

@Controller('offer')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  // questo restituisce tutte le offerte fatte da un cliente o adall agente per uno specifico immobile
  @Get('/listing/:listingId/offers')
  @Roles(UserRoles.CLIENT)
  getOffersByListingAndClient(
    @Param('listingId', new ParseUUIDPipe()) listingId: string,
    @GetUser() user: UserItem,
  ): Promise<PropertyOffer[]> {
    return this.offerService.getOffersByListingAndClient(listingId, user.id);
  }

  // questo metodo restituisce ogni client che ha fatto un offerta insieme alla sua ultima offerta per quell'immobile
  @Get('listing/:listingId/clients')
  @Roles(UserRoles.AGENT, UserRoles.MANAGER, UserRoles.SUPPORT_ADMIN)
  async getClientsListingId(
    @GetUser() user: UserItem,
    @Param('listingId', new ParseUUIDPipe()) listingId: string,
  ): Promise<ClientWithLastOfferDto[]> {
    return this.offerService.getLatestOffersByListingId(listingId, user);
  }

  @Get('listing/:listingId/external')
  @Roles(UserRoles.AGENT, UserRoles.MANAGER, UserRoles.SUPPORT_ADMIN)
  async getExternalOffer(
    @GetUser() user: UserItem,
    @Param('listingId', new ParseUUIDPipe()) listingId: string,
  ): Promise<ClientWithLastOfferDto[]> {
    return this.offerService.getExternalOffers(listingId, user);
  }



  // CHAT OFFERTE CON UN CLIENTE
  @Get('/listing/:listingId/client/:clientId/offers')
  @Roles(UserRoles.AGENT, UserRoles.MANAGER, UserRoles.SUPPORT_ADMIN)
  async getOffersByAgentId(
    @Param('listingId', new ParseUUIDPipe()) listingId: string,
    @Param('clientId', new ParseUUIDPipe()) clientId: string,
    @GetUser() agent: UserItem,
  ): Promise<PropertyOffer[]> {
    return this.offerService.getOffersByAgentId(listingId, clientId, agent);
  }

  // Questo metodo restituisce tutti i listining per cui il cliente ha fatto un offerta
  @Get('/my-offer/listing')
  @Roles(UserRoles.CLIENT)
  getOffersbyClientId(@GetUser() user: UserItem): Promise<ListingResponse[]> {
    return this.offerService.getListingByClientId(user.id);
  }

  //è pensato solo per poter modificare lo stato di una offerta
  @Patch('/:id')
  updateOffer(
    @Body() updateOfferdto: UpdateOfferDto,
    @GetUser() user: UserItem,
    @Param('id', new ParseUUIDPipe()) offerId: string,
  ): Promise<PropertyOffer> {
    return this.offerService.updateOffer(offerId, updateOfferdto, user);
  }

  //il post avviene sempre cliccando su un immobile
  // quindi l id dell immobile è sempre presente

  // questo post è pensato solo per il cliente
  // poiche per gli altri ruoli è necessario anche l id dell cliente come parametro
  // non si puo fare solo un unico post
  @Post('/listing/:id')
  @Roles(UserRoles.CLIENT)
  createOffer(
    @Body() offerData: CreateOfferDto,
    @Param('id', new ParseUUIDPipe()) listingId: string,
    @GetUser() user: UserItem,
  ): Promise<PropertyOffer> {
    return this.offerService.createOffer(offerData, listingId, user);
  }

  //questo è il post per l agente
  @Post('/listing/:id/client/:clientId')
  @Roles(UserRoles.AGENT, UserRoles.MANAGER, UserRoles.SUPPORT_ADMIN)
  createOfferByAgent(
    @Body() offerData: CreateOfferDto,
    @Param('id', new ParseUUIDPipe()) listingId: string,
    @Param('clientId', new ParseUUIDPipe()) clientId: string,
    @GetUser() user: UserItem,
  ): Promise<PropertyOffer> {
    return this.offerService.createOfferbyAgent(
      offerData,
      listingId,
      user,
      clientId,
    );
  }

  // UN OFFERTA ESTERNA DALLA PIATTAFORMA
  @Post('/listing/:id/external')
  @Roles(UserRoles.SUPPORT_ADMIN, UserRoles.MANAGER, UserRoles.AGENT)
  createExternalOffer(
    @GetUser() admin: UserItem,
    @Body() dto: CreateExternalOfferDto,
    @Param('id', new ParseUUIDPipe()) listingId: string,
  ): Promise<PropertyOffer> {
    return this.offerService.createExternalOffer(dto, admin, listingId);
  }
}
