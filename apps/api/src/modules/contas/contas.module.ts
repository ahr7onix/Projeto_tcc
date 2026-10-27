import { Module } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { ContasService } from './contas.service';

@Module({
  providers: [ContasService, MailService],
  exports: [ContasService],
})
export class ContasModule {}
