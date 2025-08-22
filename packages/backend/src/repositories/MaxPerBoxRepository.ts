import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { MaxPerBoxSetting } from '../entities/MaxPerBoxSetting';

export class MaxPerBoxRepository {
  private repository: Repository<MaxPerBoxSetting>;

  constructor() {
    this.repository = AppDataSource.getRepository(MaxPerBoxSetting);
  }

  async findAll(): Promise<MaxPerBoxSetting[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { catalogNumber: 'ASC' }
    });
  }

  async findByCatalogNumber(catalogNumber: string): Promise<MaxPerBoxSetting | null> {
    return this.repository.findOne({
      where: { catalogNumber, isActive: true }
    });
  }

  async create(data: Partial<MaxPerBoxSetting>): Promise<MaxPerBoxSetting> {
    const setting = this.repository.create(data);
    return this.repository.save(setting);
  }

  async update(id: number, data: Partial<MaxPerBoxSetting>): Promise<MaxPerBoxSetting | null> {
    await this.repository.update(id, data);
    return this.repository.findOne({ where: { id } });
  }

  async delete(id: number): Promise<boolean> {
    // Soft delete by setting isActive to false
    const result = await this.repository.update(id, { isActive: false });
    return result.affected !== 0;
  }

  async upsert(catalogNumber: string, maxQuantity: number, description?: string, rivhitId?: number): Promise<MaxPerBoxSetting> {
    const existing = await this.repository.findOne({ where: { catalogNumber } });
    
    if (existing) {
      existing.maxQuantity = maxQuantity;
      existing.description = description || existing.description;
      existing.rivhitId = rivhitId !== undefined ? rivhitId : existing.rivhitId;
      existing.isActive = true;
      return this.repository.save(existing);
    } else {
      return this.create({ catalogNumber, maxQuantity, description, rivhitId });
    }
  }

  async getMaxQuantityForCatalog(catalogNumber: string): Promise<number | null> {
    const setting = await this.findByCatalogNumber(catalogNumber);
    return setting ? setting.maxQuantity : null;
  }
}