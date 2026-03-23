import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WhatsAppSender } from '../modules/whatsapp/whatsapp.sender';
import { WhatsAppPhoneNumbersService } from '../modules/whatsapp/phone-numbers/whatsapp-phone-numbers.service';
import { WhatsAppWebhookController } from '../modules/whatsapp/whatsapp.webhook.controller';
import { PrismaService } from '../core/prisma/prisma.service';
// import { SimplifyPrisma } from '../core/prisma/prisma.extensions';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const sender = app.get(WhatsAppSender);
  const phoneService = app.get(WhatsAppPhoneNumbersService);
  const webhook = app.get(WhatsAppWebhookController);



  // 1. Setup Test Tenant
  const tenantCode = 'VERIFY_MULTI_' + Date.now();


  const tenant = await prisma.tenant.create({
    data: {
      name: 'Multi-Number Verification Tenant',
      code: tenantCode,
      tenantType: 'GYM',
      whatsappEnabled: true,
      whatsappCrmEnabled: true,
    },
  });

  try {
    // 2. Add Two WhatsApp Numbers

    const num1 = await prisma.whatsAppNumber.create({
      data: {
        tenantId: tenant.id,
        phoneNumber: '15550001001',
        phoneNumberId: 'PHONE_ID_1',
        wabaId: 'WABA_ID_1',
        displayNumber: '+1 555 000 1001',
        label: 'Primary Support',
        isEnabled: true,
      },
    });

    const num2 = await prisma.whatsAppNumber.create({
      data: {
        tenantId: tenant.id,
        phoneNumber: '15550001002',
        phoneNumberId: 'PHONE_ID_2',
        wabaId: 'WABA_ID_1',
        displayNumber: '+1 555 000 1002',
        label: 'Sales Line',
        isEnabled: true,
      },
    });
    console.log(`Created Numbers: ${num1.id} (Primary), ${num2.id} (Sales)`);

    // 3. Verify Sending Logic (Mocking the actual API call via console log in sender if possible,
    //    or just checking if it resolves the config correctly)

    const resolvedNum1 = await phoneService.getPhoneNumberById(num1.id);
    if (resolvedNum1?.id === num1.id) {

    } else {
      console.error('❌ Failed to resolve Number 1.');
    }

    // 4. Verify Webhook Ingestion

    // Mock Request/Response
    const mockReq = {
      headers: { 'x-hub-signature-256': 'mock_sig' }, // We might strictly validate sig, so we might need to bypass or generate valid sig
      body: {
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: 'PHONE_ID_2' }, // Sending to SECOND number
                  messages: [
                    {
                      id: 'wamid.test.' + Date.now(),
                      from: '1234567890',
                      type: 'text',
                      text: { body: 'Hello on Sales Line' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
      rawBody: '{"mock": "body"}', // Need actual raw body for sig check, but we might fail sig check if strict
    };

    const mockRes = {
      status: (code) => ({
        json: (body) => console.log(`Response: ${code}`, body),
        send: (txt) => console.log(`Response: ${code}`, txt),
      }),
    };

    // NOTE: Signature validation will fail if enabled.
    // We are mainly checking if the controller *tries* to extract the ID.
    // Assuming we can't easily bypass sig check without modifying code,
    // we will rely on unit-test style verification of the logic flow via static analysis validity
    // or if we can disable sig check via env var.
    // Check if WHATSAPP_APP_SECRET is required?
    if (process.env.WHATSAPP_APP_SECRET) {
      console.log(
        '⚠️ Signature check enabled. Mock webhook might fail 403. Check logs.',
      );
    }

    // Calculate valid signature
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    let signature = 'mock_sig';
    if (appSecret) {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', appSecret);
      // Use the EXACT rawBody string
      const digest = hmac.update(mockReq.rawBody).digest('hex');
      signature = `sha256=${digest}`;
    }
    mockReq.headers['x-hub-signature-256'] = signature;



    await webhook.handleWebhook(mockReq, mockRes);

    // Wait for background processing
    await new Promise((r) => setTimeout(r, 2000));

    // Check logs
    const log = await prisma.whatsAppLog.findFirst({
      where: { tenantId: tenant.id, whatsAppNumberId: num2.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (log) {


    } else {
      console.log(
        '⚠️ No log found. Signature check probably blocked it or routing failed.',
      );
    }
  } catch (error) {
    console.error('Verification Failed:', error);
  } finally {
    // Cleanup

    await prisma.whatsAppNumber.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
    await app.close();
  }
}

bootstrap();
