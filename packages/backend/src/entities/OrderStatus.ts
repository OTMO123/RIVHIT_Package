import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('order_statuses')
@Index(['orderId'], { unique: true })
export class OrderStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', length: 50 })
  orderId!: string;

  @Column({ name: 'order_number', length: 50 })
  orderNumber!: string;

  @Column({ name: 'status', length: 30, default: 'pending' })
  status!: 'pending' | 'packing' | 'packed_pending_labels' | 'labels_printed' | 'completed' | 'shipped';

  @Column({ name: 'is_packed', type: 'boolean', default: false })
  isPacked!: boolean;

  @Column({ name: 'barcodes_printed', type: 'boolean', default: false })
  barcodesPrinted!: boolean;

  @Column({ name: 'invoice_created', type: 'boolean', default: false })
  invoiceCreated!: boolean;

  @Column({ name: 'invoice_link', nullable: true })
  invoiceLink?: string;

  @Column({ name: 'packed_items', type: 'text', nullable: true })
  packedItemsJson?: string;

  @Column({ name: 'customer_name', nullable: true })
  customerName?: string;

  @Column({ name: 'packed_by', nullable: true })
  packedBy?: string;

  @Column({ name: 'packed_at', type: 'datetime', nullable: true })
  packedAt?: Date;

  @Column({ name: 'printed_at', type: 'datetime', nullable: true })
  printedAt?: Date;

  @Column({ name: 'invoice_created_at', type: 'datetime', nullable: true })
  invoiceCreatedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Virtual property for packed items
  get packedItems(): any {
    if (this.packedItemsJson) {
      try {
        return JSON.parse(this.packedItemsJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  set packedItems(value: any) {
    this.packedItemsJson = value ? JSON.stringify(value) : undefined;
  }
}