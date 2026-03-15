import { validateSync } from 'class-validator';
import {
  DowngradeCheckQueryDto,
  DowngradeSubscriptionDto,
} from '../src/core/billing/subscriptions/dto/downgrade.dto';

function getErrors(dto: object) {
  return validateSync(dto as any, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('Downgrade DTO validation', () => {
  it('requires newPlanId for downgrade body', () => {
    const dto = new DowngradeSubscriptionDto();
    const errors = getErrors(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('requires targetPlan for downgrade check query', () => {
    const dto = new DowngradeCheckQueryDto();
    const errors = getErrors(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
