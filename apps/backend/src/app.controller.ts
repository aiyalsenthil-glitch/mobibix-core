import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Controller() // <-- IMPORTANT: empty, no 'auth'
export class AppController {
  @Get()
  root() {
    return { status: 'Backend is running' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return {
      message: 'Protected route works',
      user: req.user,
    };
  }
}
