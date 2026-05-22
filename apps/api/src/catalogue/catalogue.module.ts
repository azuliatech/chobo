import { Module } from '@nestjs/common';
import { CatalogueController } from './catalogue.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CatalogueController],
})
export class CatalogueModule {}
