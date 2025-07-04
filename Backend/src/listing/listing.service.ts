import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingRepository } from './listing.repository';
import { CreateListingDto } from './dto/create-listing.dto';
import { Listing } from './Listing.entity';
import { Agent } from 'src/agent/agent.entity';
import { GeoapifyService } from 'src/common/services/geopify.service';
import { Agency } from 'src/agency/agency.entity';
import { ModifyListingDto } from './dto/modify-listing.dto';
import { ResearchListingDto } from '../research/dto/create-research.dto';
import * as pathModule from 'path';
import * as fs from 'fs';
import { ListingResponse } from './dto/listing-with-image.dto';
import { instanceToPlain } from 'class-transformer';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class ListingService {
  constructor(
    private readonly listingRepository: ListingRepository,
    private readonly geopifyService: GeoapifyService,
    private readonly notificationService: NotificationService,
  ) {}

  async getListingByAgentId(
    agentId: string,
    agencyId: string,
  ): Promise<ListingResponse[]> {
    const listings = await this.listingRepository.find({
      where: {
        agent: { userId: agentId } as Agent,
        agency: { id: agencyId } as Agency,
      },
    });

    const response: ListingResponse[] = await Promise.all(
      listings.map(async (listing) => ({
        ...(instanceToPlain(listing) as Listing),
        imageUrls: await this.getImagesForListing(listing.id),
      })),
    );

    return response;
  }

  async getListingByAgencyId(agencyId: string): Promise<ListingResponse[]> {
    const listings = await this.listingRepository.find({
      where: {
        agency: { id: agencyId } as Agency,
      },
    });

    const images = await this.getAllListingImages();

    const response: ListingResponse[] = listings.map((listing) => ({
      ...(instanceToPlain(listing) as Listing),
      imageUrls: images[listing.id] ?? [],
    }));

    return response;
  }

  async getAgentOfListing(listingId: string): Promise<any> {
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
      relations: ['agent', 'agency'],
    });

    if (!listing) {
      throw new NotFoundException(`Listing with id "${listingId}" not found`);
    }

    if (!listing.agent) {
      throw new NotFoundException(
        `No agent found for listing with id "${listingId}"`,
      );
    }

    const { name, surname, birthDate } = listing.agent.user;

    return {
      name: name,
      surname: surname,
      birthDate: birthDate,
      start_date: listing.agent.start_date,
      licenseNumber: listing.agent.licenseNumber,
      languages: listing.agent.languages,
      agencyName: listing.agency.name,
      agencyAddress: listing.agency.legalAddress,
    };
  }

  async getListingById(id: string): Promise<ListingResponse> {
    const listing = await this.listingRepository.findOne({ 
      where: { id: id },
      relations: ['agency'],
    });

    if (!listing) throw new NotFoundException(`Listing id  "${id}" not found`);

    const images: string[] = await this.getImagesForListing(id);

    return {
      ...(instanceToPlain(listing) as Listing),
      imageUrls: images,
    };
  }

  async getListingForCheck(id: string): Promise<Listing> {
    const listing = await this.listingRepository.findOne({ 
      where: { id: id },
      relations: ['agency'],
    });

    if (!listing) throw new NotFoundException(`Listing id  "${id}" not found`);

    return listing;
  }

  async getAllListing(): Promise<ListingResponse[]> {
    const listings: Listing[] = await this.listingRepository.find();
    const images = await this.getAllListingImages();

    const response: ListingResponse[] = listings.map((listing) => ({
      ...(instanceToPlain(listing) as Listing),
      imageUrls: images[listing.id] ?? [],
    }));

    return response;
  }

  async searchListing(
    searchListingDto: ResearchListingDto,
  ): Promise<ListingResponse[]> {
    const listings =
      await this.listingRepository.searchListings(searchListingDto);

    const response: ListingResponse[] = await Promise.all(
      listings.map(async (listing) => ({
        ...(instanceToPlain(listing) as Listing),
        imageUrls: await this.getImagesForListing(listing.id),
      })),
    );

    return response;
  }

  async changeListing(
    listing: Listing,
    modifyListingDto: ModifyListingDto,
  ): Promise<Listing> {
    //se ricevo l'indirizzo ed è diverso allora ricalcolo le coordinate e aggiorno i posti vicini
    if (
      modifyListingDto.address &&
      listing.address !== modifyListingDto.address
    ) {
      const { lat, lon } = await this.geopifyService.getCoordinatesFromAddress(
        `${modifyListingDto.address}, ${modifyListingDto.municipality}`,
      );
      const nearbyPlaces = await this.geopifyService.getNearbyIndicators(
        lat,
        lon,
      );

      return this.listingRepository.modifyListing(
        listing,
        modifyListingDto,
        nearbyPlaces,
        lat,
        lon,
      );
    }

    return this.listingRepository.modifyListing(listing, modifyListingDto);
  }

  async createListing(
    createListingDto: CreateListingDto,
    agent: Agent,
  ): Promise<Listing> {
    const { lat, lon } = await this.geopifyService.getCoordinatesFromAddress(
      `${createListingDto.address}, ${createListingDto.municipality}`,
    );

    const nearbyPlaces = await this.geopifyService.getNearbyIndicators(
      lat,
      lon,
    );

    const listing = await this.listingRepository.createListing(
      createListingDto,
      agent.userId,
      agent.agency.id,
      nearbyPlaces,
      lat,
      lon,
    );

    this.notificationService.createResearchNotification(agent.user.id,listing.id)
    
    return listing;
  }

  async deleteListingById(
    listingId: string,
    agencyId: string,
    agentId?: string,
  ): Promise<void> {


    const result = await this.listingRepository.delete({
      id: listingId,
      ...(agentId && { agent: { userId: agentId } as Agent }),
      agency: { id: agencyId } as Agency,
    });

    if (result.affected === 0) {
      throw new BadRequestException(`Listing with ID "${listingId}" not found`);
    }

    const folderPath = pathModule.join(
      __dirname,
      '..',
      '..',
      'uploads',
      listingId,
    );

    this.deleteImagesFolder(folderPath);
  }

  async handleUploadedImages(listingId: string, files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new NotFoundException('No images uploaded');
    }

    return files.map((file) => ({
      filename: file.filename,
      path: `/uploads/${listingId}/${file.filename}`,
    }));
  }

  async getImagesForListing(listingId: string): Promise<string[]> {
    const imageDir = pathModule.join(
      __dirname,
      '..',
      '..',
      'uploads',
      listingId,
    );

    if (!fs.existsSync(imageDir)) {
      return [];
    }

    return fs
      .readdirSync(imageDir)
      .map((file) => `/uploads/${listingId}/${file}`);
  }

  async getAllListingImages(): Promise<Record<string, string[]>> {
    const uploadsDir = pathModule.join(__dirname, '..', '..', 'uploads');
    const results: Record<string, string[]> = {};

    if (!fs.existsSync(uploadsDir)) {
      return results;
    }

    const listingFolders = fs.readdirSync(uploadsDir);

    for (const listingId of listingFolders) {
      const imageDir = pathModule.join(uploadsDir, listingId);

      if (fs.statSync(imageDir).isDirectory()) {
        const images = await this.getImagesForListing(listingId);
        if (images) {
          results[listingId] = images;
        } else results[listingId] = [];
      }
    }

    return results;
  }

  async deleteListingImage(
    listingId: string,
    imageFilename: string,
  ): Promise<{ success: boolean }> {
    const filePath = pathModule.join(
      __dirname,
      '..',
      '..',
      'uploads',
      listingId,
      imageFilename,
    );

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Immagine non trovata');
    }

    fs.unlinkSync(filePath);

    return { success: true };
  }

  deleteImagesFolder(folderPath: string) {
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath);

      for (const file of files) {
        const filePath = pathModule.join(folderPath, file);
        fs.unlinkSync(filePath);
      }

      fs.rmdirSync(folderPath);
    }
  }
}
