import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { LeadModule } from '../lead/lead.module';

import { ColumnMapperService } from './column-mapper.service';
import { CsvDeduplicatorService } from './csv-deduplicator.service';
import { CsvParserService } from './csv-parser.service';
import { CsvValidatorService } from './csv-validator.service';
import { FileHandlerService } from './file-handler.service';
import { LeadImportController } from './lead-import.controller';
import { LeadImportService } from './lead-import.service';
import { PhoneNormalizerService } from './phone-normalizer.service';


@Module({
  imports: [PrismaModule, LeadModule],
  controllers: [LeadImportController],
  providers: [
    LeadImportService,
    FileHandlerService,
    ColumnMapperService,
    CsvValidatorService,
    PhoneNormalizerService,
    CsvDeduplicatorService,
    CsvParserService,
  ],
  exports: [LeadImportService],
})
export class LeadImportModule {}
