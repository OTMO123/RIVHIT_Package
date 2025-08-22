import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('max_per_box_settings')
@Index(['catalogNumber'], { unique: true })
export class MaxPerBoxSetting {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'catalog_number', length: 50 })
  catalogNumber!: string;

  @Column({ name: 'max_quantity', type: 'integer' })
  maxQuantity!: number;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'rivhit_id', type: 'integer', nullable: true })
  rivhitId?: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}