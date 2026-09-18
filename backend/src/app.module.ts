import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { MasterDataModule } from './master-data/master-data.module.js';
import { SesiModule } from './sesi/sesi.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, MasterDataModule, SesiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
