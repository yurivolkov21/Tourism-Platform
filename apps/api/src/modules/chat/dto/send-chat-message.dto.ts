import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsObject, IsOptional, IsUUID } from 'class-validator';

/**
 * Body of POST /chat/messages. The client sends ONLY its newest message
 * (server-authoritative history); deep shape validation happens in the service
 * via the AI SDK's validateUIMessages.
 */
export class SendChatMessageDto {
  @ApiPropertyOptional({
    description: 'Existing conversation to continue; omit to start a new one.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({
    description: 'The newest AI SDK UIMessage (role "user") from the client.',
    type: 'object',
    additionalProperties: true,
  })
  @IsDefined()
  @IsObject()
  message!: Record<string, unknown>;
}
