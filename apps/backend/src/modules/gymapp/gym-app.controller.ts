import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../core/auth/decorators/public.decorator';
import { ModulePermission } from '../../core/permissions/decorators/require-permission.decorator';
import { ModuleType } from '@prisma/client';
import { ModuleScope } from '../../core/auth/decorators/module-scope.decorator';

@Controller('app')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
export class AppController {
  @Public()
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
