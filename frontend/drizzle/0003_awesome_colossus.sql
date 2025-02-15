CREATE TABLE `note` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text
);
--> statement-breakpoint
DROP TABLE `users_table`;