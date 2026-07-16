-- Migration: Rebuild staging database to match current schema
-- This migration drops all v1 tables and creates the full current schema.
-- Safe to run on staging (no real user data).

-- ──────────────────────────────────────────────
-- DROP all old v1 tables (in dependency order)
-- ──────────────────────────────────────────────
DROP TABLE IF EXISTS "Debt" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;
DROP TABLE IF EXISTS "SaleItem" CASCADE;
DROP TABLE IF EXISTS "Sale" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "Customer" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Also drop any partial new tables that may have been created
DROP TABLE IF EXISTS "StaffActivity" CASCADE;
DROP TABLE IF EXISTS "CatalogueProduct" CASCADE;
DROP TABLE IF EXISTS "EmailVerification" CASCADE;
DROP TABLE IF EXISTS "WorkspaceMember" CASCADE;
DROP TABLE IF EXISTS "UserProduct" CASCADE;
DROP TABLE IF EXISTS "Workspace" CASCADE;

-- ──────────────────────────────────────────────
-- CREATE User
-- ──────────────────────────────────────────────
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT,
    "name" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'NG',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "tosAccepted" BOOLEAN NOT NULL DEFAULT false,
    "expoPushToken" TEXT,
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- ──────────────────────────────────────────────
-- CREATE Workspace
-- ──────────────────────────────────────────────
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessType" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'NG',
    "tier" TEXT NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ──────────────────────────────────────────────
-- CREATE WorkspaceMember
-- ──────────────────────────────────────────────
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "inviteToken" TEXT,
    "inviteExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceMember_inviteToken_key" ON "WorkspaceMember"("inviteToken");
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_email_key" ON "WorkspaceMember"("workspaceId", "email");
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
CREATE INDEX "WorkspaceMember_inviteToken_idx" ON "WorkspaceMember"("inviteToken");

ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ──────────────────────────────────────────────
-- CREATE EmailVerification
-- ──────────────────────────────────────────────
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT NOT NULL DEFAULT 'VERIFY',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerification_token_key" ON "EmailVerification"("token");
CREATE INDEX "EmailVerification_email_idx" ON "EmailVerification"("email");
CREATE INDEX "EmailVerification_token_idx" ON "EmailVerification"("token");

-- ──────────────────────────────────────────────
-- CREATE UserProduct
-- ──────────────────────────────────────────────
CREATE TABLE "UserProduct" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "costPrice" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserProduct_workspaceId_idx" ON "UserProduct"("workspaceId");
CREATE INDEX "UserProduct_workspaceId_barcode_idx" ON "UserProduct"("workspaceId", "barcode");

ALTER TABLE "UserProduct" ADD CONSTRAINT "UserProduct_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ──────────────────────────────────────────────
-- CREATE Customer
-- ──────────────────────────────────────────────
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Customer_workspaceId_idx" ON "Customer"("workspaceId");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ──────────────────────────────────────────────
-- CREATE Sale
-- ──────────────────────────────────────────────
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "staffId" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT true,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Sale_workspaceId_idx" ON "Sale"("workspaceId");
CREATE INDEX "Sale_staffId_idx" ON "Sale"("staffId");
CREATE INDEX "Sale_workspaceId_timestamp_idx" ON "Sale"("workspaceId", "timestamp");

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ──────────────────────────────────────────────
-- CREATE SaleItem
-- ──────────────────────────────────────────────
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "userProductId" TEXT,
    "productName" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_userProductId_fkey" FOREIGN KEY ("userProductId") REFERENCES "UserProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ──────────────────────────────────────────────
-- CREATE Payment
-- ──────────────────────────────────────────────
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "senderName" TEXT,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "saleId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ──────────────────────────────────────────────
-- CREATE Debt
-- ──────────────────────────────────────────────
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amountOwed" DOUBLE PRECISION NOT NULL,
    "saleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Debt" ADD CONSTRAINT "Debt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ──────────────────────────────────────────────
-- CREATE Notification
-- ──────────────────────────────────────────────
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_workspaceId_idx" ON "Notification"("workspaceId");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ──────────────────────────────────────────────
-- CREATE CatalogueProduct
-- ──────────────────────────────────────────────
CREATE TABLE "CatalogueProduct" (
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogueProduct_pkey" PRIMARY KEY ("barcode")
);

-- ──────────────────────────────────────────────
-- CREATE StaffActivity
-- ──────────────────────────────────────────────
CREATE TABLE "StaffActivity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffActivity_workspaceId_userId_idx" ON "StaffActivity"("workspaceId", "userId");
CREATE INDEX "StaffActivity_workspaceId_createdAt_idx" ON "StaffActivity"("workspaceId", "createdAt");

ALTER TABLE "StaffActivity" ADD CONSTRAINT "StaffActivity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffActivity" ADD CONSTRAINT "StaffActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
