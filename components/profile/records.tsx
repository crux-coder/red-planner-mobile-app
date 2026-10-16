import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Text, View } from "react-native";

import { Action, Detail, ProfileSkeleton, Section, s } from "./ui";

import { Input, Select } from "@/components/hr/ui";
import { request, useResource } from "@/components/hr/use-hr";
import { optionLabel, validateDraft } from "@/lib/profile/model";

type Doc = {
	id: string;
	title?: string;
	original_filename: string;
	document_kind?: string;
	available_at?: string;
};
type Requirement = {
	id: string;
	label?: string;
	name?: string;
	title?: string;
	documentKind: string | null;
	evidenceMode: string;
	status: string;
	expiresAt?: string;
	dueAt?: string;
	evidenceDocumentIds: string[];
};
type Training = {
	id: string;
	kind: string;
	details: string;
	training_date: string | null;
	expiry_date: string | null;
	does_not_expire: boolean;
	review_status: string;
	archived_at: string | null;
	attachments: { document: Doc }[];
};
async function chooseFile(form: FormData, key: string) {
	const picker: typeof import("expo-document-picker") = require("expo-document-picker");
	const result = await picker.getDocumentAsync({
		type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
		copyToCacheDirectory: true,
	});
	if (result.canceled) return false;
	const asset = result.assets[0];
	if (!asset.size || asset.size > 10 * 1024 * 1024)
		throw new Error("Choose a non-empty file of 10 MB or less.");
	if (Platform.OS === "web") {
		if (!asset.file) throw new Error("Unable to read this file.");
		form.append(key, asset.file, asset.name);
	} else {
		form.append(key, {
			uri: asset.uri,
			name: asset.name,
			type: asset.mimeType || "application/octet-stream",
		} as unknown as Blob);
	}
	return true;
}
export function ProfileRecords({
	qualifications,
	revision,
	section,
	onBusyChange,
}: {
	revision: number;
	section: "training" | "documents";
	onBusyChange: (busy: boolean) => void;
	qualifications: {
		id: string;
		name: string;
		issuer: string;
		identifier: string | null;
		issue_date: string;
		expiry_date: string | null;
		does_not_expire: boolean;
		document: Doc | null;
	}[];
}) {
	const docs = useResource<{
		requirements: Requirement[];
		documents: Doc[];
		configurationError: string | null;
	}>(section === "documents" ? "/profile/documents" : null, revision);
	const training = useResource<{
		requirements: { kind: string; name: string; not_required: boolean }[];
		records: Training[];
	}>(section === "training" ? "/profile/training" : null, revision);
	const dbs = useResource<{
		checks: {
			id: string;
			check_date: string;
			result: string;
			details: string | null;
			document: Doc;
		}[];
	}>(section === "documents" ? "/profile/dbs-checks" : null, revision);
	const [busy, setBusy] = useState<string | null>(null);
	useEffect(() => {
		onBusyChange(Boolean(busy));
	}, [busy, onBusyChange]);
	const lock = useRef(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [otherTitle, setOtherTitle] = useState("");
	const [trainingOpen, setTrainingOpen] = useState(false);
	const [kind, setKind] = useState("");
	const [details, setDetails] = useState("");
	const [date, setDate] = useState("");
	const [expiry, setExpiry] = useState("");
	const [noExpiry, setNoExpiry] = useState("no");
	async function run(key: string, work: () => Promise<void>) {
		if (lock.current) return;
		lock.current = true;
		setBusy(key);
		setError(null);
		setNotice(null);
		try {
			await work();
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "Unable to complete this action.",
			);
		} finally {
			lock.current = false;
			setBusy(null);
		}
	}
	async function open(doc: Doc) {
		await run(doc.id, async () => {
			const data = await request<{ url: string }>(
				`/profile/documents/${doc.id}/preview`,
				{ method: "POST" },
			);
			if (!/^https:\/\//.test(data.url))
				throw new Error("The document link is invalid.");
			await Linking.openURL(data.url);
		});
	}
	async function upload(documentKind?: string) {
		await run(documentKind || "other", async () => {
			if (
				!documentKind &&
				(!otherTitle.trim() || otherTitle.trim().length > 160)
			)
				throw new Error("Enter a document name of up to 160 characters.");
			const form = new FormData();
			if (!(await chooseFile(form, "file"))) return;
			form.append(
				documentKind ? "kind" : "title",
				documentKind || otherTitle.trim(),
			);
			await request(`/profile/documents${documentKind ? "" : "/other"}`, {
				method: "POST",
				body: form,
			});
			await docs.refresh();
			setOtherTitle("");
			setNotice("Document uploaded.");
		});
	}
	async function submitTraining() {
		await run("training", async () => {
			const problem = validateDraft(
				[
					{ key: "date", label: "Training date", type: "date" },
					{ key: "expiry", label: "Expiry date", type: "date" },
				],
				{ date, expiry: noExpiry === "yes" ? "" : expiry },
			);
			if (problem) throw new Error(problem);
			if (!kind) throw new Error("Choose a training item.");
			if (expiry && date && noExpiry !== "yes" && expiry < date)
				throw new Error("Expiry cannot be before training.");
			const form = new FormData();
			if (!(await chooseFile(form, "files"))) return;
			form.append(
				"record",
				JSON.stringify({
					version: 0,
					kind,
					details,
					trainingDate: date || null,
					expiryDate: noExpiry === "yes" ? null : expiry || null,
					doesNotExpire: noExpiry === "yes",
					reviewStatus: "to_check",
					documentIds: [],
				}),
			);
			await request("/profile/training", { method: "POST", body: form });
			await training.refresh();
			setTrainingOpen(false);
			setKind("");
			setDetails("");
			setDate("");
			setExpiry("");
			setNotice("Training submitted for review.");
		});
	}
	const documentRow = (doc: Doc) => (
		<View key={doc.id} style={{ paddingVertical: 8 }}>
			<Text style={s.value}>{doc.title || doc.original_filename}</Text>
			<Action
				title="Open document"
				disabled={Boolean(busy)}
				onPress={() => open(doc)}
			/>
			{busy === doc.id ? (
				<ActivityIndicator
					color="#e90087"
					accessibilityLabel="Opening document"
				/>
			) : null}
		</View>
	);
	return (
		<>
			{error ? (
				<Text accessibilityRole="alert" style={s.error}>
					{error}
				</Text>
			) : null}
			{notice ? (
				<Text
					accessibilityLiveRegion="polite"
					style={{ color: "#227646", paddingVertical: 12 }}
				>
					{notice}
				</Text>
			) : null}
			{section === "documents" ? (
				<Section title="Personal documents">
					{docs.loading && !docs.data ? <ProfileSkeleton compact /> : null}
					{docs.error ? (
						<>
							<Text style={s.error}>{docs.error}</Text>
							<Action title="Retry documents" onPress={docs.refresh} />
						</>
					) : null}
					{docs.data?.configurationError ? (
						<Text style={s.error}>
							Your document requirements need configuration. Contact HR.
						</Text>
					) : null}
					{docs.data?.requirements.map((r) => (
						<View key={r.id} style={{ paddingVertical: 12, gap: 6 }}>
							<Text style={s.heading}>
								{r.label ||
									r.name ||
									r.title ||
									optionLabel(r.documentKind || "Document requirement")}
							</Text>
							<Detail label="Status" value={optionLabel(r.status)} />
							<Detail label="Due" value={r.dueAt} />
							<Detail label="Expires" value={r.expiresAt} />
							<Action
								title="Upload evidence"
								busy={busy !== null && busy === r.documentKind}
								disabled={
									Boolean(busy) ||
									r.status === "not_applicable" ||
									!r.documentKind ||
									r.evidenceMode === "verification"
								}
								onPress={() => upload(r.documentKind || undefined)}
							/>
						</View>
					))}
					{docs.data?.documents.length === 0 ? (
						<Text style={s.label}>No documents uploaded.</Text>
					) : null}
					{docs.data?.documents.map(documentRow)}
					{docs.data ? (
						<View style={{ gap: 12, paddingTop: 12 }}>
							<Input
								title="Other document name"
								value={otherTitle}
								editable={!busy}
								onChangeText={setOtherTitle}
							/>
							<Action
								title="Choose file & upload"
								busy={busy === "other"}
								disabled={Boolean(busy)}
								onPress={() => upload()}
							/>
						</View>
					) : null}
				</Section>
			) : null}
			{section === "training" ? (
				<Section title="Training & certificates">
					{training.loading && !training.data ? (
						<ProfileSkeleton compact />
					) : null}
					{training.error ? (
						<>
							<Text style={s.error}>{training.error}</Text>
							<Action title="Retry training" onPress={training.refresh} />
						</>
					) : null}
					{training.data?.requirements.map((r) => (
						<View
							key={r.kind}
							style={{
								gap: 8,
								paddingVertical: 14,
								borderBottomWidth: 1,
								borderBottomColor: "#eef1f5",
							}}
						>
							<Text style={s.heading}>{r.name}</Text>
							<Detail label="Required" value={!r.not_required} />
							{!training.data?.records.some((t) => t.kind === r.kind) ? (
								<Text style={s.label}>No training record submitted.</Text>
							) : null}
							{training.data?.records
								.filter((t) => t.kind === r.kind)
								.map((t) => (
									<View key={t.id} style={{ gap: 5 }}>
										<Detail
											label="Review status"
											value={optionLabel(t.review_status)}
										/>
										<Detail label="Training date" value={t.training_date} />
										<Detail
											label="Expiry"
											value={
												t.does_not_expire ? "Does not expire" : t.expiry_date
											}
										/>
										<Detail label="Details" value={t.details} />
										{t.archived_at ? (
											<Detail label="Archived" value={t.archived_at} />
										) : null}
										{t.attachments.map((a) => documentRow(a.document))}
									</View>
								))}
						</View>
					))}
					{training.data?.records
						.filter(
							(t) =>
								!training.data?.requirements.some((r) => r.kind === t.kind),
						)
						.map((t) => (
							<View key={t.id} style={{ paddingVertical: 14 }}>
								<Text style={s.heading}>{optionLabel(t.kind)}</Text>
								<Detail
									label="Review status"
									value={optionLabel(t.review_status)}
								/>
								<Detail label="Training date" value={t.training_date} />
								<Detail
									label="Expiry"
									value={t.does_not_expire ? "Does not expire" : t.expiry_date}
								/>
								<Detail label="Details" value={t.details} />
								{t.archived_at ? (
									<Detail label="Archived" value={t.archived_at} />
								) : null}
								{t.attachments.map((a) => documentRow(a.document))}
							</View>
						))}
					{training.data ? (
						<Action
							title={
								trainingOpen
									? "Close submission form"
									: "Submit training certificate"
							}
							disabled={Boolean(busy)}
							onPress={() => setTrainingOpen((v) => !v)}
						/>
					) : null}
					{trainingOpen ? (
						<View style={{ gap: 16 }}>
							<Select
								title="Training item"
								value={kind}
								disabled={Boolean(busy)}
								options={
									training.data?.requirements.map((r) => ({
										value: r.kind,
										label: r.name,
									})) ?? []
								}
								onChange={setKind}
							/>
							<Input
								title="Details"
								multiline
								value={details}
								editable={!busy}
								onChangeText={setDetails}
							/>
							<Input
								title="Training date (YYYY-MM-DD)"
								value={date}
								editable={!busy}
								onChangeText={setDate}
							/>
							<Select
								title="Does not expire"
								value={noExpiry}
								disabled={Boolean(busy)}
								options={[
									{ value: "no", label: "No" },
									{ value: "yes", label: "Yes" },
								]}
								onChange={setNoExpiry}
							/>
							{noExpiry === "no" ? (
								<Input
									title="Expiry date (YYYY-MM-DD)"
									value={expiry}
									editable={!busy}
									onChangeText={setExpiry}
								/>
							) : null}
							<Text style={s.label}>
								Your certificate will be sent to HR for review.
							</Text>
							<Action
								title="Choose certificate & submit"
								primary
								busy={busy === "training"}
								disabled={Boolean(busy)}
								onPress={submitTraining}
							/>
						</View>
					) : null}
				</Section>
			) : null}
			{section === "training" ? (
				<Section title="Qualifications" managed>
					{qualifications.length === 0 ? (
						<Text style={s.label}>No qualifications recorded.</Text>
					) : (
						qualifications.map((q) => (
							<View key={q.id} style={{ paddingVertical: 12 }}>
								<Text style={s.heading}>{q.name}</Text>
								<Detail label="Issuer" value={q.issuer} />
								<Detail label="Identifier" value={q.identifier} />
								<Detail label="Issue date" value={q.issue_date} />
								<Detail
									label="Expiry"
									value={q.does_not_expire ? "Does not expire" : q.expiry_date}
								/>
								{q.document ? documentRow(q.document) : null}
							</View>
						))
					)}
				</Section>
			) : null}
			{section === "documents" ? (
				<Section title="DBS checks" managed>
					{dbs.loading && !dbs.data ? <ProfileSkeleton compact /> : null}
					{dbs.error ? (
						<>
							<Text style={s.error}>{dbs.error}</Text>
							<Action title="Retry DBS checks" onPress={dbs.refresh} />
						</>
					) : null}
					{dbs.data?.checks.length === 0 ? (
						<Text style={s.label}>No checks recorded.</Text>
					) : null}
					{dbs.data?.checks.map((check) => (
						<View key={check.id} style={{ paddingVertical: 12 }}>
							<Detail label="Check date" value={check.check_date} />
							<Detail label="Result" value={check.result} />
							<Detail label="Details" value={check.details} />
							{documentRow(check.document)}
						</View>
					))}
				</Section>
			) : null}
		</>
	);
}
