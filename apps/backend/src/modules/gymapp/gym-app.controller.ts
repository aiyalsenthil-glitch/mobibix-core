import { Controller, Get, Query } from '@nestjs/common';

@Controller('app')
export class AppController {
  @Get('version')
  checkVersion(@Query('versionCode') versionCode?: string) {
    const clientVersion = Number(versionCode ?? 0);

    const latestVersion = Number(process.env.ANDROID_LATEST_VERSION_CODE);
    const minRequired = Number(process.env.ANDROID_MIN_REQUIRED_VERSION_CODE);

    let forceUpdate = false;
    let softUpdate = false;

    if (clientVersion < minRequired) {
      forceUpdate = true;
    } else if (clientVersion < latestVersion) {
      softUpdate = true;
    }

    return {
      latestVersionCode: latestVersion,
      minRequiredVersionCode: minRequired,
      forceUpdate,
      softUpdate,
      message: forceUpdate
        ? 'Please update the app to continue.'
        : 'New update available.',
    };
  }
}
