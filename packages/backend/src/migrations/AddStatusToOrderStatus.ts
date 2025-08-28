import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddStatusToOrderStatus1703000000000 implements MigrationInterface {
    name = 'AddStatusToOrderStatus1703000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if column already exists
        const table = await queryRunner.getTable("order_statuses");
        const statusColumn = table?.columns.find(c => c.name === "status");
        
        if (!statusColumn) {
            await queryRunner.addColumn(
                "order_statuses",
                new TableColumn({
                    name: "status",
                    type: "varchar",
                    length: "20",
                    default: "'pending'",
                    isNullable: false
                })
            );
            
            console.log("✅ Added 'status' column to order_statuses table");
            
            // Update existing records based on isPacked flag
            await queryRunner.query(`
                UPDATE order_statuses 
                SET status = CASE 
                    WHEN is_packed = 1 THEN 'packed'
                    ELSE 'pending'
                END
            `);
            
            console.log("✅ Updated existing records with appropriate status");
        } else {
            console.log("ℹ️ Column 'status' already exists in order_statuses table");
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("order_statuses");
        const statusColumn = table?.columns.find(c => c.name === "status");
        
        if (statusColumn) {
            await queryRunner.dropColumn("order_statuses", "status");
            console.log("✅ Removed 'status' column from order_statuses table");
        }
    }
}