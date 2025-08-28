import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('order_packing_details')
@Index(['orderId', 'itemId'])
export class OrderPackingDetails {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', length: 50 })
  orderId!: string;

  @Column({ name: 'order_number', length: 50 })
  orderNumber!: string;

  @Column({ name: 'item_id', length: 50 })
  itemId!: string;

  @Column({ name: 'catalog_number', nullable: true })
  catalogNumber?: string;

  @Column({ name: 'item_name' })
  itemName!: string;

  @Column({ name: 'ordered_quantity', type: 'integer' })
  orderedQuantity!: number;

  @Column({ name: 'packed_quantity', type: 'integer' })
  packedQuantity!: number;

  @Column({ name: 'box_number', type: 'integer', nullable: true })
  boxNumber?: number;

  @Column({ name: 'draft_quantity', type: 'integer', nullable: true })
  draftQuantity?: number;

  @Column({ name: 'draft_box_number', type: 'integer', nullable: true })
  draftBoxNumber?: number;

  @Column({ name: 'is_draft', type: 'boolean', default: true })
  isDraft!: boolean;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'packed_by', nullable: true })
  packedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}