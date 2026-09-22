import { Module } from '@nestjs/common';
import { GuestsService } from './guests.service.js';
import { GuestsController } from './guests.controller.js';

@Module({
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule {}
