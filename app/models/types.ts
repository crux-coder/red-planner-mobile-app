export interface ProjectTask {
	id: string;
	project: Project;
	description: string;
	assigned_to: UserProfile | null;
	completed: boolean;
	created_at: string;
	completed_at: string | null;
	due_at: string | null;
}

// Define job related types
export type JobType = "survey" | "data" | "cad" | "qa";
export type JobStatus =
	| "unscheduled"
	| "pre_booked"
	| "booked"
	| "completed"
	| "canceled"
	| "to_reschedule"
	| "in_progress";

// Define Project interface
export interface Project {
	id: string;
	name: string;
	client?: string;
	description?: string;
}

// Define UserProfile interface
export interface UserProfile {
	id: string;
	first_name?: string;
	last_name?: string;
	email?: string;
	photo?: string;
	role?: string;
	title?: string;
	phone_number?: string;
}

export interface Job {
	id: string;
	title: string;
	start_date: string;
	end_date: string;
	job_type: JobType;
	job_status: JobStatus;
	job_number?: string;
	job_project?: Project;
	notes?: string;
	people_assignments: {
		id: string;
		user: UserProfile;
	}[];
	equipment_assignments: {
		id: string;
		equipment: {
			id: string;
			name: string;
			type?: string;
		};
	}[];
	transportation_assignments: {
		id: string;
		transportation: {
			id: string;
			name: string;
			type?: string;
		};
	}[];
}

// Define the TimeBlock interface
export interface TimeBlock {
	id: string;
	worker_id: string;
	job_id?: string;
	start_time: string;
	end_time: string | null;
	category: "shift" | "overtime" | "break";
	type: "regular" | "job";
	status: "pending" | "approved" | "rejected";
	coefficient: number;
	notes: string | null;
	created_at: string;
	job?: {
		id: string;
		job_number: string;
	};
	rejection_reason: string | null;
	reviewed_by_id: string | null;
	reviewed_at: string | null;
}
