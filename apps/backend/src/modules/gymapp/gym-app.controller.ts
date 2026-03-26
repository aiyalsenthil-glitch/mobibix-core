import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';

/**
 * GET /api/app/version?platform=mobibix|gymsaas
 * Returns version info for force-update enforcement.
 * No code deploy needed — just update env vars to bump versions.
 */
@Controller('app')
export class AppController {
  @Public()
  @SkipSubscriptionCheck()
  @Get('version')
  checkVersion(@Query('platform') platform?: string) {
    const app = (platform ?? 'mobibix').toLowerCase();

    if (app === 'gymsaas') {
      return {
        platform: 'gymsaas',
        minVersionCode: parseInt(process.env.GYMSAAS_MIN_VERSION_CODE ?? '1', 10),
        latestVersionCode: parseInt(process.env.GYMSAAS_LATEST_VERSION_CODE ?? '1', 10),
        latestVersionName: process.env.GYMSAAS_LATEST_VERSION_NAME ?? '1.0',
        updateUrl:
          process.env.GYMSAAS_UPDATE_URL ??
          'https://play.google.com/store/apps/details?id=com.aiyal.gymsaas',
        releaseNotes:
          process.env.GYMSAAS_RELEASE_NOTES ?? 'Bug fixes and performance improvements.',
      };
    }

    return {
      platform: 'mobibix',
      minVersionCode: parseInt(process.env.MOBIBIX_MIN_VERSION_CODE ?? '1', 10),
      latestVersionCode: parseInt(process.env.MOBIBIX_LATEST_VERSION_CODE ?? '1', 10),
      latestVersionName: process.env.MOBIBIX_LATEST_VERSION_NAME ?? '1.0',
      updateUrl:
        process.env.MOBIBIX_UPDATE_URL ??
        'https://play.google.com/store/apps/details?id=com.aiyal.mobibix',
      releaseNotes:
        process.env.MOBIBIX_RELEASE_NOTES ?? 'Bug fixes and performance improvements.',
    };
  }
}
