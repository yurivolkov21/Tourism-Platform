-- Wave C: SEO overrides for the blog reader (fallback = title/excerpt).
ALTER TABLE "posts" ADD COLUMN "meta_title" VARCHAR(70);
ALTER TABLE "posts" ADD COLUMN "meta_description" VARCHAR(160);
