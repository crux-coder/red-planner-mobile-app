// Define constants for dropdown options based on schema constraints
export const WEATHER_CONDITIONS = [
	"normal",
	"heat",
	"snowing",
	"raining",
	"N/A",
];
export const DATA_CONTROL_OPTIONS = ["local", "gps", "previous data"];
export const DATA_SENT_VIA_OPTIONS = ["RLS VPN", "WeTransfer", "Other"];
export const MARKS_PICKED_UP_OPTIONS = [
	"Scanned",
	"Instrument",
	"GPS",
	"Sketched",
];
export const DATA_TYPE_SENT_OPTIONS = [
	"RAW Scans",
	"Photographs",
	"Sketches",
	"GPS",
	"Total Station",
];
export const DISRUPTION_OPTIONS = [
	"Limited Access",
	"Weather",
	"No access",
	"Equipment malfunction",
	"Permit delays",
	"Unforeseen obstacles",
	"Terrain challenges",
];
export const BRIEFINGS_OPTIONS = [
	"Daily Briefings",
	"D&A test",
	"Site inductions",
];
export const PERMITS_OPTIONS = [
	"Permit To Work",
	"Access/Egress Permit",
	"Confined Space Entry Permit",
	"Utility Locating Permit",
	"Public Right-of-Way Access",
	"Utility Clearance Permits",
	"Dig Permits",
	"Right-of-entry permit",
];
export const REPORTING_ISSUES_OPTIONS = [
	"Early Warnings",
	"Health",
	"Safety Issues",
	"Environmental Issues",
	"Accident",
	"Incident",
	"Near miss",
];

// Storage bucket for job report attachments
// Ensure this bucket exists in Supabase Storage and is set to public
// if you want to use getPublicUrl links directly.
// Note: This aligns with the previously used bucket name in the codebase
// (e.g., legacy code referenced "job-reports").
export const JOB_REPORT_FILES_BUCKET = "job-reports";
