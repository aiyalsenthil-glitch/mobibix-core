export class AuthResponseDto {
  token: string;
  refreshToken?: string;
  userId: string;
  tenantId?: string | null;
  role: string;
}
