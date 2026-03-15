-- CreateIndex
CREATE INDEX "StaffInvite_email_idx" ON "StaffInvite"("email");

-- CreateIndex
CREATE INDEX "StaffInvite_tenantId_idx" ON "StaffInvite"("tenantId");

-- CreateIndex
CREATE INDEX "StaffInvite_accepted_idx" ON "StaffInvite"("accepted");

-- CreateIndex
CREATE INDEX "User_REMOVED_AUTH_PROVIDERUid_idx" ON "User"("REMOVED_AUTH_PROVIDERUid");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
