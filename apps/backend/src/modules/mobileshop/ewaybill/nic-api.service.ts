import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../../core/cache/cache.service';

const NIC_SANDBOX_URL =
  'https://einv-apisandbox.nic.in/ewaybillapi/v1.03/ewayapi';
const NIC_PROD_URL =
  'https://ewaybillgst.gov.in/ewaybillapi/v1.03/ewayapi';
const TOKEN_TTL_MS = 19800 * 1000; // 5.5 hours in ms (CacheService uses ms)
const AXIOS_TIMEOUT_MS = 15000;

export interface NicCredentials {
  username: string;
  password: string;
}

export interface NicEWBResponse {
  ewayBillNo: string;
  ewayBillDate: string;
  validUpto: string;
}

@Injectable()
export class NicApiService {
  private readonly logger = new Logger(NicApiService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {
    const sandbox = this.config.get<string>('NIC_EWB_SANDBOX') === 'true';
    this.baseUrl = sandbox ? NIC_SANDBOX_URL : NIC_PROD_URL;
  }

  private maskGstin(gstin: string): string {
    if (!gstin || gstin.length < 9) return '***';
    return gstin.slice(0, 7) + '****' + gstin.slice(-2);
  }

  private async getAuthToken(
    tenantId: string,
    gstin: string,
    credentials: NicCredentials,
  ): Promise<string> {
    const key = `ewb:auth:${tenantId}:${gstin}`;
    const cached = await this.cache.get<string>(key);
    if (cached) return cached;

    try {
      const res = await this.http.axiosRef.post(
        `${this.baseUrl}?action=ACCESSTOKEN`,
        {},
        {
          headers: {
            username: credentials.username,
            password: credentials.password,
            gstin,
          },
          timeout: AXIOS_TIMEOUT_MS,
        },
      );

      if (res.data?.status === '0') {
        throw new BadRequestException(
          `NIC auth failed: ${res.data.error ?? 'Unknown error'}`,
        );
      }

      const token: string = res.data.authToken;
      await this.cache.set(key, token, TOKEN_TTL_MS);
      return token;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`NIC auth request failed: ${err.message}`);
      throw new ServiceUnavailableException(
        'NIC E-Way Bill portal unavailable. Please try again.',
      );
    }
  }

  private async callNic<T>(
    tenantId: string,
    gstin: string,
    credentials: NicCredentials,
    action: string,
    payload: object,
    retried = false,
  ): Promise<T> {
    const token = await this.getAuthToken(tenantId, gstin, credentials);
    try {
      const res = await this.http.axiosRef.post(
        `${this.baseUrl}?action=${action}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}`, gstin },
          timeout: AXIOS_TIMEOUT_MS,
        },
      );

      if (res.data?.status === '0') {
        const errMsg: string = res.data.error ?? 'Unknown NIC error';
        if (!retried && /invalid.*token|token.*expired/i.test(errMsg)) {
          await this.cache.delete(`ewb:auth:${tenantId}:${gstin}`);
          return this.callNic<T>(tenantId, gstin, credentials, action, payload, true);
        }
        this.logger.error(
          `NIC ${action} failed for ${this.maskGstin(gstin)}: ${errMsg}`,
        );
        throw new BadRequestException(`NIC API error: ${errMsg}`);
      }

      return res.data as T;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (!retried) {
        this.logger.warn(`NIC ${action} network error, retrying once…`);
        return this.callNic<T>(tenantId, gstin, credentials, action, payload, true);
      }
      this.logger.error(`NIC ${action} failed after retry: ${err.message}`);
      throw new ServiceUnavailableException(
        'NIC E-Way Bill portal unavailable. Please try again.',
      );
    }
  }

  async generateEWayBill(
    tenantId: string,
    gstin: string,
    credentials: NicCredentials,
    payload: object,
  ): Promise<NicEWBResponse> {
    this.logger.log(
      `Generating EWB tenantId=${tenantId} gstin=${this.maskGstin(gstin)}`,
    );
    return this.callNic<NicEWBResponse>(
      tenantId,
      gstin,
      credentials,
      'GENEWAYBILL',
      payload,
    );
  }

  async cancelEWayBill(
    tenantId: string,
    gstin: string,
    credentials: NicCredentials,
    ewbNo: string,
    cancelRsnCode: number,
    cancelRmrk: string,
  ): Promise<void> {
    this.logger.log(
      `Cancelling EWB ${ewbNo} tenantId=${tenantId} gstin=${this.maskGstin(gstin)}`,
    );
    await this.callNic<unknown>(tenantId, gstin, credentials, 'CANEWB', {
      ewbNo,
      cancelRsnCode,
      cancelRmrk: cancelRmrk ?? '',
    });
  }
}
