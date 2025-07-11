import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/auth/user.entity';
import { UserItem } from 'src/common/types/userItem';
import { SupportAdmin } from 'src/support-admin/support-admin.entity';
import { UserRoles } from 'src/common/types/user-roles';
import { CreateSupportAdminDto } from '../agency-manager/dto/create-support-admin.dto';
import { Agent } from 'src/agent/agent.entity';
import { CreateAgentDto } from '../agency-manager/dto/create-agent.dto';
import { Agency } from 'src/agency/agency.entity';
import { Provider } from 'src/common/types/provider.enum';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AgencyService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,

    @InjectRepository(Agency)
    private readonly agencyRepository: Repository<Agency>,

    @InjectRepository(SupportAdmin)
    private readonly supportAdminRepository: Repository<SupportAdmin>,

    private readonly configService: ConfigService,
  ) {}

  async createSupportAdmin(
    createSupportAdminDto: CreateSupportAdminDto,
    userManager: UserItem,
  ): Promise<SupportAdmin> {
    const { name, surname, email, birthDate, gender, phone } =
      createSupportAdminDto;

    const agency = userManager?.manager?.agency;
    if (!agency) throw new BadRequestException(`Agency doesn't exists`);

    const found = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email OR user.phone = :phone', {
        email,
        phone,
      })
      .getOne();

    if (found)
      throw new ConflictException(
        'User with this email or phone already exists',
      );

    const defaultPassword = this.configService.get<string>(
      'DEFAULT_PASSWORD',
      'Manager1234!',
    );
    const hashedPassword = await this.hashPassword(defaultPassword);

    const userSupportAdmin = await this.userRepository.create({
      name: name,
      surname: surname,
      email: email,
      password: hashedPassword,
      birthDate: birthDate,
      gender: gender,
      phone: phone,
      role: UserRoles.SUPPORT_ADMIN,
      provider: Provider.LOCAL,
    });

    await this.userRepository.save(userSupportAdmin);

    const supportAdmin = this.supportAdminRepository.create({
      userId: userSupportAdmin.id,
      agency: userManager?.manager?.agency,
    });

    await this.supportAdminRepository.save(supportAdmin);

    return supportAdmin;
  }

  async createAgent(
    createAgentDto: CreateAgentDto,
    agencyId: string,
  ): Promise<Agent> {
    const agency = await this.agencyRepository.findOne({
      where: { id: agencyId },
    });
    if (!agency) {
      throw new BadRequestException(
        `The Agency with ID: ${agencyId} doesn't exist`,
      );
    }

    const {
      licenseNumber,
      name,
      surname,
      email,
      birthDate,
      gender,
      phone,
      start_date,
      languages,
    } = createAgentDto;

    const existingAgent = await this.agentRepository
      .createQueryBuilder('agent')
      .where('agent.licenseNumber = :licenseNumber', { licenseNumber })
      .getOne();

    if (existingAgent)
      throw new ConflictException(
        `Agent with license "${licenseNumber}" already exists`,
      );

    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email OR user.phone = :phone', {
        email,
        phone,
      })
      .getOne();

    if (existingUser) throw new ConflictException('User already exists');

    const defaultPassword = this.configService.get<string>(
      'DEFAULT_PASSWORD',
      'Manager1234!',
    );
    const hashedPassword = await this.hashPassword(defaultPassword);

    const userAgent = await this.userRepository.create({
      name: name,
      surname: surname,
      email: email,
      password: hashedPassword,
      phone: phone,
      gender: gender,
      birthDate: birthDate,
      role: UserRoles.AGENT,
      provider: Provider.LOCAL,
    });

    await this.userRepository.save(userAgent);

    const agent = this.agentRepository.create({
      licenseNumber: licenseNumber,
      start_date: start_date,
      languages: languages,
      userId: userAgent.id,
      agency: agency,
    });

    await this.agentRepository.save(agent);

    return agent;
  }

  async deleteAgentById(agentId: string, agencyId: string) {
    const found = await this.userRepository.findOneBy({ id: agentId });
    if (!found)
      throw new NotFoundException(`Agent with id "${agentId}" not found`);

    const agent = await this.agentRepository.findOne({
      where: { userId: agentId },
    });
    if (!agent)
      throw new NotFoundException(`Agent with id "${agentId}" not found`);

    if (agent?.agency.id !== agencyId) throw new UnauthorizedException();

    await this.userRepository.delete(agentId);

    return {
      message: 'Agent delete successfully',
    };
  }

  async deleteSupportAdminById(supportAdminId: string, agencyId: string) {
    const found = await this.userRepository.findOneBy({ id: supportAdminId });
    if (!found)
      throw new NotFoundException(
        `Support Admin with id "${supportAdminId}" not found`,
      );

    const supportAdmin = await this.supportAdminRepository.findOne({
      where: { userId: supportAdminId },
    });
    if (!supportAdmin)
      throw new NotFoundException(
        `Support Admin with id "${supportAdminId}" not found`,
      );

    if (supportAdmin?.agency.id !== agencyId) throw new UnauthorizedException();

    await this.userRepository.delete(supportAdminId);

    return {
      message: 'Support Admin delete successfully',
    };
  }

  async getAgents(agencyId: string): Promise<any> {
    const agents = await this.agentRepository.find({
      where: { agency: { id: agencyId } },
      relations: ['user','agency'],
    });

    return agents.map(agent => {
      const { name, surname, birthDate} = agent.user;
      return {
        userId: agent.userId,
        name: name,
        surname: surname,
        birthDate: birthDate,
        start_date: agent.start_date,
        licenseNumber: agent.licenseNumber,
        languages: agent.languages,
        agencyName: agent.agency.name,
        agencyAddress: agent.agency.legalAddress,
      };
    });
  }

  async getAgency(agencyId: string) {
    const agency = this.agencyRepository.findOne({
      where: { id: agencyId } },
    );

    return agency;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }
}
