CREATE TABLE `bookshelf` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` varchar(64) NOT NULL,
	`title` varchar(512) NOT NULL,
	`author` varchar(256) NOT NULL,
	`textUrl` text,
	`cardUrl` text,
	`releaseDate` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookshelf_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` varchar(64) NOT NULL,
	`title` varchar(512) NOT NULL,
	`author` varchar(256) NOT NULL,
	`textUrl` text,
	`cardUrl` text,
	`scrollPosition` int NOT NULL DEFAULT 0,
	`lastReadAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reading_progress_id` PRIMARY KEY(`id`)
);
