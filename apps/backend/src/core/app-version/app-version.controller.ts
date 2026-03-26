import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../auth/decorators/skip-subscription-check.decorator';

/**
 * Returns minimum and latest app version info for force-update enforcement.
 * Driven by environment variables — no code deploy needed to bump versions.
 *
 * Query param:
 *   ?platform=mobibix   → MobiBix shop staff app (com.aiyal.mobibix)
 *   ?platform=gymsaas   → GymPilot gym management app (com.aiyal.gymsaas)
 *
 * MobiBix env vars:
 *   MOBIBIX_MIN_VERSION_CODE, MOBIBIX_LATEST_VERSION_CODE, MOBIBIX_LATEST_VERSION_NAME
 *   MOBIBIX_UPDATE_URL, MOBIBIX_RELEASE_NOTES
 *
 * GymPilot env vars:
 *   GYMSAAS_MIN_VERSION_CODE, GYMSAAS_LATEST_VERSION_CODE, GYMSAAS_LATEST_VERSION_NAME
 *   GYMSAAS_UPDATE_URL, GYMSAAS_RELEASE_NOTES
 */
@Controller('app')
export class AppVersionController {
  @Public()
  @SkipSubscriptionCheck()
  @Get('version')
  getVersion(@Query('platform') platform?: string) {
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

    // Default: mobibix
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
