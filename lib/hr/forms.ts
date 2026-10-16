export type FormFile = { id: string; name: string; type: string; size: number };
export type FormBlock = {
	id: string;
	type:
		| "section"
		| "text"
		| "short_text"
		| "long_text"
		| "yes_no"
		| "choice"
		| "checklist"
		| "date"
		| "declaration"
		| "attachment";
	label: string;
	description: string;
	required: boolean;
	options: string[];
	contentFiles?: FormFile[];
	attachments?: { accept: "images" | "images_and_documents"; maxFiles: number };
};
export type Answers = Record<
	string,
	string | string[] | boolean | { attachments: FormFile[] }
>;
export type FormSummary = {
	id: string;
	title: string;
	reference: string;
	revision: number;
	status: "assigned" | "submitted" | "cancelled";
	dueDate: string | null;
	submittedAt: string | null;
	cancellationReason?: string | null;
	review: {
		required: boolean;
		outcome: string | null;
		note: string | null;
		directorName: string | null;
		reviewedAt: string | null;
	};
};
export type FormDetail = FormSummary & {
	definition: {
		schemaVersion: 1;
		title: string;
		description: string;
		layout: "single_page" | "steps";
		blocks: FormBlock[];
	};
	message: string;
	answers: Answers;
	canSubmit: boolean;
};
export type StartableForm = {
	id: string;
	revision: number;
	title: string;
	reference: string;
	description: string;
	requiresReview: boolean;
};
export function validateAnswers(
	blocks: FormBlock[],
	answers: Answers,
	files: Record<string, { size?: number }[]>,
) {
	for (const block of blocks) {
		if (["section", "text"].includes(block.type)) continue;
		const value = answers[block.id];
		if (block.type === "attachment") {
			if (block.required && !files[block.id]?.length)
				return `Attach a file for ${block.label}.`;
			if ((files[block.id]?.length ?? 0) > (block.attachments?.maxFiles ?? 5))
				return `Too many files for ${block.label}.`;
			continue;
		}
		if (
			block.required &&
			(value === undefined ||
				value === "" ||
				value === false ||
				(Array.isArray(value) && !value.length))
		)
			return `Complete ${block.label}.`;
	}
	if (
		Object.values(files)
			.flat()
			.reduce((total, file) => total + (file.size ?? 0), 0) >
		50 * 1024 * 1024
	)
		return "Attachments must total 50 MB or less.";
	return null;
}
