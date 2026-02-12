
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WhatsAppUserService } from '../modules/whatsapp/whatsapp-user.service';
import { WhatsAppPhoneNumbersService } from '../modules/whatsapp/phone-numbers/whatsapp-phone-numbers.service';
import { PrismaService } from '../core/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(WhatsAppUserService);
  const phoneService = app.get(WhatsAppPhoneNumbersService);
  const prisma = app.get(PrismaService);

  console.log('🚀 Starting Inbox Backend Verification...');

  // 1. Setup Data
  const tenantCode = `INBOX_TEST_${Date.now()}`;
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Inbox Test Tenant',
      code: tenantCode,
      tenantType: 'MOBILE_SHOP',
    },
  });
  console.log(`Created Tenant: ${tenant.id}`);

  // Create 2 Numbers
  const num1 = await phoneService.createPhoneNumber({
    tenantId: tenant.id,
    phoneNumber: '1111111111',
    phoneNumberId: `PID_1_${Date.now()}`,
    wabaId: `WABA_${Date.now()}`,
    purpose: 'DEFAULT' as any,
    isDefault: true,
  });

  const num2 = await phoneService.createPhoneNumber({
    tenantId: tenant.id,
    phoneNumber: '2222222222',
    phoneNumberId: `PID_2_${Date.now()}`,
    wabaId: `WABA_${Date.now()}`,
    purpose: 'DEFAULT' as any,
    isDefault: false,
  });

  console.log(`Created Numbers: ${num1.id} (Default), ${num2.id}`);

  // Create Logs
  await prisma.whatsAppLog.create({
    data: {
      tenantId: tenant.id,
      whatsAppNumberId: num1.id,
      phone: '9999999999',
      type: 'INBOUND',
      status: 'RECEIVED',
      messageId: `msg_1_${Date.now()}`,
    },
  });

  await prisma.whatsAppLog.create({
    data: {
      tenantId: tenant.id,
      whatsAppNumberId: num2.id,
      phone: '8888888888',
      type: 'INBOUND',
      status: 'RECEIVED',
      messageId: `msg_2_${Date.now()}`,
    },
  });

  // 2. Verify getNumbers
  console.log('\n--- Test 1: getNumbers ---');
  const numbers = await userService.getNumbers(tenant.id);
  console.table(numbers.map(n => ({ id: n.id, label: n.label, isDefault: n.isDefault })));
  
  if (numbers.length !== 2) throw new Error('Expected 2 numbers');
  if (numbers[0].id !== num1.id) throw new Error('Expected default number first');
  console.log('✅ getNumbers passed');

  // 3. Verify getLogs filtering
  console.log('\n--- Test 2: getLogs Filtering ---');
  
  const logsAll = await userService.getLogs(tenant.id, {});
  console.log(`All Logs: ${logsAll.length}`);
  if (logsAll.length !== 2) throw new Error('Expected 2 logs total');

  const logsNum1 = await userService.getLogs(tenant.id, { whatsAppNumberId: num1.id });
  console.log(`Logs for Num 1: ${logsNum1.length}`);
  if (logsNum1.length !== 1) throw new Error('Expected 1 log for Num 1');
  if (logsNum1[0].whatsAppNumberId !== num1.id) throw new Error('Log mismatch');

  const logsNum2 = await userService.getLogs(tenant.id, { whatsAppNumberId: num2.id });
  console.log(`Logs for Num 2: ${logsNum2.length}`);
  if (logsNum2.length !== 1) throw new Error('Expected 1 log for Num 2');

  console.log('✅ getLogs filtering passed');

  // Cleanup
  await prisma.tenant.delete({ where: { id: tenant.id } });
  
  await app.close();
  console.log('Done.');
}

bootstrap().catch(console.error);
