export type Profile = {
	id: string;
	user_id: string;
	photo?: string | null;
	[key: string]: unknown;
};
export type Field = {
	key: string;
	label: string;
	options?: string[];
	type?: "date" | "email" | "phone" | "country";
};
export type Group = { title: string; fields: Field[]; editable?: boolean };
const fields = (entries: string[]): Field[] =>
	entries.map((entry) => {
		const [key, label] = entry.split("|");
		return { key, label };
	});
export const addressFields: Field[] = [
	...fields([
		"address_line_1|Address line 1",
		"address_line_2|Address line 2",
		"address_line_3|Address line 3",
		"town_city|Town / city",
		"county|County / region",
		"postcode|Postcode",
	]),
	{ key: "country_id", label: "Country", type: "country" },
];
export const groups: Group[] = [
	{
		title: "Personal information",
		editable: true,
		fields: [
			...fields([
				"title|Title",
				"first_name|First name",
				"middle_name|Middle name",
				"last_name|Last name",
			]),
			{ key: "date_of_birth", label: "Date of birth", type: "date" },
			{
				key: "gender",
				label: "Gender",
				options: ["Male", "Female", "Non-binary", "Transgender", "Unspecified"],
			},
			{
				key: "ethnicity",
				label: "Ethnicity",
				options: [
					"Arab",
					"Asian/Asian British",
					"Bangladeshi",
					"Black/African/Caribbean/Black British",
					"Chinese",
					"Indian",
					"Irish Traveller",
					"Mixed/Multiple ethnic groups",
					"Other",
					"Other Asian background",
					"Pakistani",
					"White",
					"Unspecified",
				],
			},
			{
				key: "marital_status",
				label: "Marital status",
				options: [
					"single",
					"married",
					"civil_partnership",
					"separated",
					"divorced_or_civil_partnership_dissolved",
					"widowed",
					"other",
					"prefer_not_to_say",
				],
			},
		],
	},
	{
		title: "Contact details",
		editable: true,
		fields: [
			{ key: "personal_email", label: "Personal email", type: "email" },
			...[
				"home_phone|Home phone",
				"phone_number|Mobile phone",
				"work_phone|Work phone",
			].map((v) => ({ ...fields([v])[0], type: "phone" as const })),
			...fields(["work_extension|Work extension"]),
		],
	},
	{ title: "Home address", editable: true, fields: addressFields },
	{
		title: "Employment details",
		fields: fields([
			"email|Work email",
			"job_title|Job title",
			"department_name|Department",
			"place_of_work_name|Place of work",
			"employment_country_code|Employment country",
			"employment_start_date|Start date",
			"employment_type|Employment type",
			"contracted_hours|Contracted hours",
			"responsibilities|Responsibilities",
		]),
	},
	{
		title: "Salary & payroll",
		fields: fields([
			"pay_rate|Salary",
			"hourly_rate|Hourly rate",
			"pay_frequency|Pay frequency",
			"salary_effective_from|Effective from",
			"payroll_number|Payroll number",
			"pension_number|Pension number",
			"pension_eligible|Pension eligible",
			"tax_code|Tax code",
			"national_insurance_number|National Insurance number",
		]),
	},
	{
		title: "Bank details",
		fields: fields([
			"bank_account_name|Account holder",
			"bank_name|Bank name",
			"bank_branch|Branch",
			"bank_account_number|Account number",
			"bank_sort_code|Sort code",
		]),
	},
	{
		title: "Identity & right to work",
		fields: fields([
			"passport_number|Passport number",
			"passport_country|Passport country",
			"passport_expiry|Passport expiry",
			"driving_license_number|Driving licence number",
			"driving_license_country|Driving licence country",
			"driving_license_class|Driving licence class",
			"driving_license_expiry|Driving licence expiry",
			"visa_number|Visa number",
			"visa_expiry|Visa expiry",
			"visa_check_conducted|Visa check conducted",
			"right_to_work_status|Right to work status",
			"right_to_work_share_code|Share code",
			"right_to_work_date_issued|Date issued",
			"right_to_work_date_checked|Date checked",
		]),
	},
];
export const emergencyFields: Field[] = [
	...fields(["first_name|First name", "last_name|Last name"]),
	{
		key: "relationship",
		label: "Relationship",
		options: [
			"Parent",
			"Spouse",
			"Partner",
			"Sibling",
			"Child",
			"Friend",
			"Other",
		],
	},
	...[
		"home_phone|Home phone",
		"mobile_phone|Mobile phone",
		"work_phone|Work phone",
	].map((v) => ({ ...fields([v])[0], type: "phone" as const })),
	...addressFields,
];
export const clothingFields = fields([
	"red_jacket|Red jacket",
	"polo|Polo shirt",
	"fleece|Fleece",
	"yellow_hi_vis|Yellow hi-vis",
	"orange_hi_vis|Orange hi-vis",
	"orange_coverall|Orange coverall",
	"orange_long_sleeve|Orange long sleeve",
	"orange_trousers|Orange trousers",
]).map((f) => ({
	...f,
	options: ["S", "M", "L", "XL", "XXL", "not_required"],
}));
export const readable = (v: unknown): string =>
	v === null || v === undefined || v === ""
		? "Not provided"
		: typeof v === "boolean"
			? v
				? "Yes"
				: "No"
			: typeof v === "string" || typeof v === "number"
				? String(v)
				: "Not provided";
export function draftFor(fields: Field[], source: Record<string, unknown>) {
	return Object.fromEntries(
		fields.map((f) => [
			f.key,
			source[f.key] == null ? "" : String(source[f.key]),
		]),
	);
}
export function validateDraft(fields: Field[], draft: Record<string, string>) {
	for (const f of fields) {
		const v = (draft[f.key] ?? "").trim();
		if (v.length > 1000) return `${f.label} must be 1,000 characters or fewer.`;
		if (f.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
			return "Enter a valid email address.";
		if (
			f.type === "date" &&
			v &&
			(!/^\d{4}-\d{2}-\d{2}$/.test(v) ||
				!Number.isFinite(Date.parse(v)) ||
				new Date(v).toISOString().slice(0, 10) !== v)
		)
			return `${f.label}: use a valid date in YYYY-MM-DD format.`;
		if (f.key === "date_of_birth" && v > new Date().toISOString().slice(0, 10))
			return "Date of birth cannot be in the future.";
	}
	return null;
}
export function editPayload(fields: Field[], draft: Record<string, string>) {
	return Object.fromEntries(
		fields.map((f) => [f.key, draft[f.key]?.trim() || null]),
	);
}

export const optionLabel = (value: string) => value.replace(/_/g, " ");
