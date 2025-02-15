CREATE TABLE `complaints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contact_number` text NOT NULL,
	`case_status` text DEFAULT 'Pending',
	`case_origin` text NOT NULL,
	`subject` text NOT NULL,
	`priority` text DEFAULT 'Medium',
	`date` text NOT NULL,
	`time` text NOT NULL,
	`complainer_name` text NOT NULL
);
