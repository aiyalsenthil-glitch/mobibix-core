import { JobStatus } from '@prisma/client';

export class UpdateJobStatusDto {
  status: JobStatus;
}
