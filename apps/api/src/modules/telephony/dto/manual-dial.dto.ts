import { IsOptional, IsString } from 'class-validator';

export class ManualDialDto {
  @IsString()
  leadId!: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsString()
  phoneNumber!: string;
}

export class UpdatePresenceDto {
  @IsString()
  status!: string;
}

export class DispositionCallDto {
  @IsString()
  dispositionId!: string;
}
