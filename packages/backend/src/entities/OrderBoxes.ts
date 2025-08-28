import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('order_boxes')
@Index(['orderId', 'boxNumber'])
export class OrderBoxes {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', length: 50 })
  @Index()
  orderId!: string;

  @Column({ name: 'box_number', type: 'integer' })
  boxNumber!: number;

  @Column({ name: 'items', type: 'text' })
  itemsJson!: string; // JSON array of items with structure: {itemId, catalogNumber, name, quantity}

  @Column({ name: 'total_weight', type: 'real', nullable: true })
  totalWeight?: number;

  @Column({ name: 'is_draft', type: 'boolean', default: true })
  isDraft!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Virtual property for items
  get items(): any[] {
    try {
      return JSON.parse(this.itemsJson || '[]');
    } catch {
      return [];
    }
  }

  set items(value: any[]) {
    this.itemsJson = JSON.stringify(value || []);
  }
}