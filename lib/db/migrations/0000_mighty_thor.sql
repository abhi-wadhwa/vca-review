CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" varchar(100),
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"major" varchar(255),
	"class_standing" varchar(50),
	"friday_availability" varchar(255),
	"resume_url" text,
	"linkedin_url" text,
	"question1_response" text,
	"question2_response" text,
	"question3_response" text,
	"question4_response" text,
	"question5_response" text,
	"anything_else" text,
	"uploaded_at" timestamp DEFAULT now(),
	"batch_id" varchar(50),
	"is_archived" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	CONSTRAINT "assignments_application_id_reviewer_id_unique" UNIQUE("application_id","reviewer_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "draft_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"initiative_score" integer,
	"collaboration_score" integer,
	"curiosity_score" integer,
	"commitment_score" integer,
	"comments" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "draft_reviews_application_id_reviewer_id_unique" UNIQUE("application_id","reviewer_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"initiative_score" integer NOT NULL,
	"collaboration_score" integer NOT NULL,
	"curiosity_score" integer NOT NULL,
	"commitment_score" integer NOT NULL,
	"total_score" integer NOT NULL,
	"comments" text,
	"started_at" timestamp,
	"submitted_at" timestamp DEFAULT now(),
	CONSTRAINT "reviews_application_id_reviewer_id_unique" UNIQUE("application_id","reviewer_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255),
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'reviewer' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_login" timestamp,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_reviews" ADD CONSTRAINT "draft_reviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_reviews" ADD CONSTRAINT "draft_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;