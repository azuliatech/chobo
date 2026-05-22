import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { PaymentsModule } from './payments/payments.module';
import { DebtsModule } from './debts/debts.module';
import { CatalogueModule } from './catalogue/catalogue.module';

@Module({
  imports: [PrismaModule, AuthModule, ProductsModule, SalesModule, PaymentsModule, DebtsModule, CatalogueModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
