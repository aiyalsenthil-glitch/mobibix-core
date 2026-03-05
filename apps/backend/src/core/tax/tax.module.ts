import { Module } from '@nestjs/common';
import { TaxEngineService } from './tax-engine.service';
import { TaxStrategyResolver } from './tax-strategy.resolver';

/**
 * TaxModule
 *
 * Import this module wherever invoice or billing tax calculations are needed.
 * Does NOT replace existing TaxCalculationService — both coexist safely.
 */
@Module({
  providers: [TaxEngineService, TaxStrategyResolver],
  exports: [TaxEngineService],
})
export class TaxModule {}
