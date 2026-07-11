-- Wave B2 (admin CRM): internal notes thread on enquiries + repeat-lead lookup index.

-- CreateTable
CREATE TABLE "enquiry_notes" (
    "id" UUID NOT NULL,
    "enquiry_id" UUID NOT NULL,
    "author_id" UUID,
    "author_name" VARCHAR(200) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enquiry_notes_enquiry_id_created_at_idx" ON "enquiry_notes"("enquiry_id", "created_at");

-- Repeat-lead detection groups enquiries by exact email.
CREATE INDEX "enquiries_email_idx" ON "enquiries"("email");

-- AddForeignKey
ALTER TABLE "enquiry_notes" ADD CONSTRAINT "enquiry_notes_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_notes" ADD CONSTRAINT "enquiry_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS parity with the rest of the schema (API connects as the table owner; RLS
-- shields the table from any other Postgres role, e.g. future direct access).
ALTER TABLE "enquiry_notes" ENABLE ROW LEVEL SECURITY;
