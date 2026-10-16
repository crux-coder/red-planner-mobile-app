export type AbsenceType =
	| "annual_leave"
	| "sick_leave"
	| "other_paid"
	| "other_unpaid";
export type DayPortion = "full_day" | "first_half" | "second_half";
export type EmployeeContext = {
	employee: {
		id: string;
		first_name: string | null;
		last_name: string | null;
		employment_start_date: string | null;
		termination_date: string | null;
	} | null;
};
export type Absence = {
	id: string;
	employee_id: string;
	absence_type: AbsenceType;
	start_date: string;
	end_date: string;
	start_day_type?: DayPortion | null;
	end_day_type?: DayPortion | null;
	units: number;
	status?: string | null;
	request_notes: string | null;
	resolve_notes?: string | null;
	is_public_holiday?: boolean;
	created_at?: string | null;
	resolved_at?: string | null;
	resolver?: { first_name: string | null; last_name: string | null } | null;
	cancellation_status?: string | null;
	cancellation_request_notes?: string | null;
	cancellation_resolve_notes?: string | null;
	cancellation_requested_at?: string | null;
	cancellation_resolved_at?: string | null;
};
export type AbsenceInput = Pick<
	Absence,
	| "absence_type"
	| "start_date"
	| "end_date"
	| "start_day_type"
	| "end_day_type"
	| "request_notes"
>;
export type History = {
	entries: Absence[];
	public_holidays: {
		country_name: string | null;
		entries: { date: string; name: string }[];
	};
};
export type Summary = {
	allowance: number;
	remaining: number;
	used: number;
	next_absence: { date: string; absence_type: AbsenceType } | null;
};
export type EmployeeSummary = {
	leave_year: { start_date: string; end_date: string };
	totals: {
		annual_leave: {
			used: number;
			pending: number;
			entitled_units: number | null;
			carry_over_units: number;
		};
		sick_leave: { used: number };
		other_paid: { used: number };
		other_unpaid: { used: number };
	};
};
export type PackSummary = {
	id: string;
	distributionTitle: string;
	message: string | null;
	dueDate: string;
	status: string;
	overdue: boolean;
	documentCount: number;
	completedCount: number;
	signatureCount: number;
	acknowledgementCount: number;
	acceptanceCount: number;
	readReceiptCount: number;
};
export type DocumentStep = {
	id: string;
	position: number;
	title: string;
	description: string | null;
	requiredAction: "sign" | "acknowledge";
	behaviour: "acceptance" | "acknowledgement" | "read_receipt";
	captureMethod: string;
	category: string;
	signatureInputPolicy:
		| "not_applicable"
		| "typed_name_required"
		| "drawn_or_typed";
	declarationText: string;
	buttonLabel: string;
	versionLabel: string;
	effectiveDate: string;
	isContractualVariation: boolean;
	changeReason: string | null;
	contractualChangeItems:
		| {
				term: string;
				currentTerm: string;
				proposedTerm: string;
				employeeImpact: string;
		  }[]
		| null;
	employeeContactRoute: {
		contactName: string;
		channel: string;
		destination: string;
		availability: string | null;
		responseTargetHours: number | null;
	} | null;
	prominentTermsSummary: string | null;
	queryWindowStartsAt: string | null;
	queryWindowEndsAt: string | null;
	status: string;
	firstViewedAt: string | null;
	reviewCompletedAt: string | null;
	completedAt: string | null;
	canOpen: boolean;
	downloadAvailable: boolean;
};
export type Pack = {
	id: string;
	distributionTitle: string;
	message: string | null;
	dueDate: string;
	status: string;
	overdue: boolean;
	withdrawnReason: string | null;
	deferredAt: string | null;
	leaveContext: string | null;
	deferralReason: string | null;
	followUpDate: string | null;
	steps: DocumentStep[];
};
export type Withdrawal = {
	id: string;
	noticeAt: string;
	effectiveDate: string;
	wording: string;
	status: string;
};
export type DocumentHistory = {
	id: string;
	documentId: string;
	title: string;
	distributionTitle: string;
	versionLabel: string;
	effectiveDate: string;
	status: string;
	completedAt: string;
	isWorkingTimeOptOut: boolean;
	workingTimeOptOutWithdrawal: Withdrawal | null;
	workingTimeOptOutState?: {
		status: string;
		changedAt: string;
		withdrawal: Withdrawal | null;
	} | null;
};
export type Completion = DocumentHistory & {
	declarationText: string;
	declarationConfirmed: boolean;
	outcomeReason: string | null;
	reviewCompletedAt: string | null;
	reviewMethod: string;
	signatureCapture: { inputMethod: string; typedName: string | null } | null;
	adminRecording?: {
		method: string;
		assistingPerson: string;
		assistanceDetails: string;
	} | null;
};
