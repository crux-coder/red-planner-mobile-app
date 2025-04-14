import { Project, UserProfile } from "@/app/(app)/(protected)/schedule/index";

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
