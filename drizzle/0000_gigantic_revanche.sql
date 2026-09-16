CREATE TABLE `consultation_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`name` text NOT NULL,
	`business` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`website` text NOT NULL,
	`selected_package` text NOT NULL,
	`budget` text NOT NULL,
	`goals` text NOT NULL,
	`platforms` text NOT NULL,
	`extended_support` text NOT NULL,
	`delivery_status` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_consultation_requests_created_at` ON `consultation_requests` (`created_at`);