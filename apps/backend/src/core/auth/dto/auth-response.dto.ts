export class AuthResponseDto {
  token: string;
  userId: string;
  tenantId?: string | null;
  role: string;
}
