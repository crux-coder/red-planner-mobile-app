import * as Crypto from "expo-crypto";
import type * as DocumentPicker from "expo-document-picker";
import { useRef, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";

import { DateField } from "./absence";
import { openFile } from "./documents";
import {
	Badge,
	Button,
	Section,
	Check,
	Empty,
	ErrorNotice,
	Input,
	Loading,
	Select,
	Tabs,
	s,
} from "./ui";
import { request, useOperation, useResource } from "./use-hr";

import { formatDate, label } from "@/lib/hr/domain";
import type {
	Answers,
	FormBlock,
	FormDetail,
	FormSummary,
	StartableForm,
} from "@/lib/hr/forms";
import { validateAnswers } from "@/lib/hr/forms";
export function Forms({ onOpen }: { onOpen: (id: string) => void }) {
	const [tab, setTab] = useState("Assigned");
	const [offset, setOffset] = useState(0);
	const [search, setSearch] = useState("");
	const [start, setStart] = useState<StartableForm | null>(null);
	const [director, setDirector] = useState("");
	const attempt = useRef("");
	const op = useOperation();
	const existing = useResource<{ responses: FormSummary[] }>(
		tab !== "Start a form" ? `/my-forms?offset=${offset}` : null,
	);
	const available = useResource<{ templates: StartableForm[] }>(
		tab === "Start a form" ? `/my-forms/available?offset=${offset}` : null,
	);
	const reviewers = useResource<{ directors: { id: string; name: string }[] }>(
		start?.requiresReview ? "/my-forms/reviewers" : null,
	);
	const resource = tab === "Start a form" ? available : existing;
	const rows = (existing.data?.responses ?? []).filter(
		(r) =>
			(tab === "Assigned"
				? r.status === "assigned"
				: r.status !== "assigned") &&
			r.title.toLowerCase().includes(search.toLowerCase()),
	);
	const templates = (available.data?.templates ?? []).filter((r) =>
		r.title.toLowerCase().includes(search.toLowerCase()),
	);
	return (
		<>
			<Tabs
				value={tab}
				options={["Assigned", "History", "Start a form"]}
				onChange={(v) => {
					setTab(v);
					setOffset(0);
					setStart(null);
				}}
			/>
			<Input title="Search this page" value={search} onChangeText={setSearch} />
			<ErrorNotice error={resource.error} retry={resource.refresh} />
			{resource.loading ? <Loading variant="list" /> : null}
			{resource.loading
				? null
				: tab === "Start a form"
					? templates.map((t) => (
							<Section key={t.id}>
								<Text style={s.heading}>{t.title}</Text>
								<Text style={s.muted}>
									{t.reference} · Revision {t.revision}
								</Text>
								<Text style={s.text}>{t.description}</Text>
								<Button
									title="Start form"
									secondary
									disabled={op.busy}
									onPress={() => {
										attempt.current = Crypto.randomUUID();
										setStart(t);
										setDirector("");
									}}
								/>
							</Section>
						))
					: rows.map((r) => (
							<Section key={r.id}>
								<Text style={s.heading}>{r.title}</Text>
								<Badge value={r.status} />
								<Text style={s.muted}>
									{r.reference} ·{" "}
									{r.dueDate ? `Due ${formatDate(r.dueDate)}` : "No due date"}
								</Text>
								{r.review.outcome ? (
									<Text style={s.muted}>Review: {label(r.review.outcome)}</Text>
								) : null}
								<Button
									title={
										r.status === "assigned" ? "Complete form" : "View response"
									}
									secondary
									onPress={() => onOpen(r.id)}
								/>
							</Section>
						))}
			{!resource.loading &&
			!resource.error &&
			!(tab === "Start a form" ? templates : rows).length ? (
				<Empty text="No matching forms on this page." />
			) : null}
			<View style={{ flexDirection: "row", gap: 8 }}>
				<View style={{ flex: 1 }}>
					<Button
						title="Previous page"
						secondary
						disabled={offset === 0 || resource.loading}
						onPress={() => setOffset((n) => Math.max(0, n - 200))}
					/>
				</View>
				<View style={{ flex: 1 }}>
					<Button
						title="Next page"
						secondary
						disabled={
							resource.loading ||
							(tab === "Start a form"
								? available.data?.templates.length
								: existing.data?.responses.length) !== 200
						}
						onPress={() => setOffset((n) => n + 200)}
					/>
				</View>
			</View>
			{start ? (
				<Section>
					<Text style={s.heading}>Start {start.title}</Text>
					{start.requiresReview ? (
						<>
							<Select
								title="Reviewer"
								value={director}
								onChange={setDirector}
								disabled={op.busy}
								options={(reviewers.data?.directors ?? []).map((d) => ({
									value: d.id,
									label: d.name,
								}))}
							/>
							<ErrorNotice error={reviewers.error} retry={reviewers.refresh} />
							{reviewers.loading ? <Loading variant="field" /> : null}
						</>
					) : null}
					<Button
						title="Create form"
						busy={op.busy}
						disabled={start.requiresReview && !director}
						onPress={() =>
							op.run(async () => {
								const result = await request<{ responseId: string }>(
									`/my-forms/${start.id}/start`,
									{
										method: "POST",
										body: {
											requestId: attempt.current,
											expectedRevision: start.revision,
											directorId: director || null,
										},
									},
								);
								setStart(null);
								onOpen(result.responseId);
							})
						}
					/>
					<Button
						title="Cancel"
						secondary
						disabled={op.busy}
						onPress={() => setStart(null)}
					/>
				</Section>
			) : null}
			<ErrorNotice error={op.error} />
		</>
	);
}
export function FormResponse({
	id,
	onChanged,
}: {
	id: string;
	onChanged: () => void;
}) {
	const resource = useResource<{ response: FormDetail }>(
		`/forms/responses/${id}`,
	);
	return (
		<>
			<ErrorNotice error={resource.error} retry={resource.refresh} />
			{resource.loading && !resource.data ? <Loading variant="form" /> : null}
			{resource.data ? (
				<FormEditor
					key={`${id}-${resource.data.response.status}`}
					initial={resource.data.response}
					onSaved={async () => {
						await resource.refresh();
						onChanged();
					}}
				/>
			) : null}
		</>
	);
}
function FormEditor({
	initial,
	onSaved,
}: {
	initial: FormDetail;
	onSaved: () => Promise<void>;
}) {
	const [answers, setAnswers] = useState<Answers>(initial.answers);
	const [files, setFiles] = useState<
		Record<string, DocumentPicker.DocumentPickerAsset[]>
	>({});
	const [step, setStep] = useState(0);
	const op = useOperation();
	const blocks = initial.definition.blocks;
	const sections: FormBlock[][] = [];
	for (const block of blocks) {
		if (block.type === "section" || !sections.length) sections.push([]);
		sections[sections.length - 1].push(block);
	}
	const groups = initial.definition.layout === "steps" ? sections : [blocks];
	const editable = initial.canSubmit && !op.busy;
	const answer = (id: string, value: Answers[string]) =>
		setAnswers((old) => ({ ...old, [id]: value }));
	const attach = (block: FormBlock) =>
		op.run(async () => {
			const picker: typeof DocumentPicker = require("expo-document-picker");
			const result = await picker.getDocumentAsync({
				multiple: true,
				copyToCacheDirectory: true,
				type:
					block.attachments?.accept === "images"
						? ["image/jpeg", "image/png", "image/webp"]
						: [
								"image/jpeg",
								"image/png",
								"image/webp",
								"application/pdf",
								"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
							],
			});
			if (result.canceled) return;
			const next = [...(files[block.id] ?? []), ...result.assets];
			if (next.length > (block.attachments?.maxFiles ?? 5))
				throw new Error(
					`Choose up to ${block.attachments?.maxFiles ?? 5} files.`,
				);
			if (next.some((f) => (f.size ?? 0) > 10 * 1024 * 1024))
				throw new Error("Each attachment must be 10 MB or less.");
			setFiles((old) => ({ ...old, [block.id]: next }));
		});
	const openAttachment = (fileId: string, content = false) =>
		op.run(async () => {
			const { url } = await request<{ url: string }>(
				`/forms/responses/${initial.id}/${content ? "content-files" : "attachments"}/${fileId}`,
			);
			await openFile(url);
		});
	const submit = () =>
		op.run(async () => {
			const error = validateAnswers(blocks, answers, files);
			if (error) throw new Error(error);
			const form = new FormData();
			form.append(
				"answers",
				JSON.stringify(
					Object.fromEntries(
						Object.entries(answers).filter(
							([, value]) =>
								typeof value === "string" ||
								typeof value === "boolean" ||
								Array.isArray(value),
						),
					),
				),
			);
			for (const [blockId, assets] of Object.entries(files))
				for (const asset of assets) {
					if (Platform.OS === "web" && asset.file)
						form.append(`file:${blockId}`, asset.file, asset.name);
					else
						form.append(`file:${blockId}`, {
							uri: asset.uri,
							name: asset.name,
							type: asset.mimeType ?? "application/octet-stream",
						} as unknown as Blob);
				}
			await request(`/forms/responses/${initial.id}/submit`, {
				method: "POST",
				body: form,
			});
			await onSaved();
		});
	return (
		<>
			<Text style={s.heading}>{initial.title}</Text>
			<Badge value={initial.status} />
			{initial.message ? <Text style={s.text}>{initial.message}</Text> : null}
			<Text style={s.muted}>
				{initial.reference} · Revision {initial.revision}
				{initial.dueDate ? ` · Due ${formatDate(initial.dueDate)}` : ""}
			</Text>
			{initial.definition.description ? (
				<Text style={s.text}>{initial.definition.description}</Text>
			) : null}
			{initial.cancellationReason ? (
				<Text style={s.text}>Cancellation: {initial.cancellationReason}</Text>
			) : null}
			{initial.review.required ? (
				<Section>
					<Text style={s.heading}>
						{initial.review.outcome
							? label(initial.review.outcome)
							: "Review required"}
					</Text>
					<Text style={s.muted}>
						{initial.review.directorName}
						{initial.review.reviewedAt
							? ` · ${formatDate(initial.review.reviewedAt)}`
							: ""}
					</Text>
					{initial.review.note ? (
						<Text style={s.text}>{initial.review.note}</Text>
					) : null}
				</Section>
			) : null}
			{groups.length > 1 ? (
				<Text style={s.muted}>
					Section {step + 1} of {groups.length}
				</Text>
			) : null}
			{(groups[step] ?? []).map((block) => {
				const value = answers[block.id];
				return (
					<Section key={block.id}>
						{block.label ? (
							<Text style={s.heading}>
								{block.label}
								{block.required ? " *" : ""}
							</Text>
						) : null}
						{block.description ? (
							<Text style={s.text}>{block.description}</Text>
						) : null}
						{block.contentFiles?.map((file) => (
							<Button
								key={file.id}
								title={`Open ${file.name}`}
								secondary
								disabled={op.busy}
								onPress={() => openAttachment(file.id, true)}
							/>
						))}
						{["short_text", "long_text"].includes(block.type) ? (
							<Input
								title="Answer"
								value={typeof value === "string" ? value : ""}
								onChangeText={(v) => answer(block.id, v)}
								multiline={block.type === "long_text"}
								editable={editable}
							/>
						) : block.type === "date" ? (
							<DateField
								title="Date"
								value={typeof value === "string" ? value : ""}
								onChange={(v) => answer(block.id, v)}
								disabled={!editable}
							/>
						) : block.type === "choice" || block.type === "yes_no" ? (
							<Select
								title="Answer"
								value={typeof value === "string" ? value : ""}
								options={(block.type === "yes_no"
									? ["Yes", "No"]
									: block.options
								).map((value) => ({ value, label: value }))}
								onChange={(v) => answer(block.id, v)}
								disabled={!editable}
							/>
						) : block.type === "declaration" ? (
							<Check
								title="I confirm this declaration"
								checked={value === true}
								onChange={(v) => answer(block.id, v)}
								disabled={!editable}
							/>
						) : block.type === "checklist" ? (
							block.options.map((option) => (
								<Check
									key={option}
									title={option}
									checked={Array.isArray(value) && value.includes(option)}
									disabled={!editable}
									onChange={(checked) =>
										answer(
											block.id,
											checked
												? [...(Array.isArray(value) ? value : []), option]
												: (Array.isArray(value) ? value : []).filter(
														(v) => v !== option,
													),
										)
									}
								/>
							))
						) : block.type === "attachment" ? (
							<>
								<Text style={s.muted}>
									Up to {block.attachments?.maxFiles ?? 5} files, 10 MB each.
								</Text>
								{initial.canSubmit ? (
									<Button
										title="Choose files"
										secondary
										disabled={!editable}
										onPress={() => attach(block)}
									/>
								) : null}
								{(files[block.id] ?? []).map((file, i) => (
									<View key={`${file.uri}-${i}`}>
										<Text style={s.text}>{file.name}</Text>
										<Button
											title={`Remove ${file.name}`}
											secondary
											disabled={!editable}
											onPress={() =>
												setFiles((old) => ({
													...old,
													[block.id]: old[block.id].filter((_, n) => n !== i),
												}))
											}
										/>
									</View>
								))}
								{value && typeof value === "object" && !Array.isArray(value)
									? value.attachments.map((file) => (
											<Button
												key={file.id}
												title={`Open ${file.name}`}
												secondary
												disabled={op.busy}
												onPress={() => openAttachment(file.id)}
											/>
										))
									: null}
							</>
						) : null}
					</Section>
				);
			})}
			<ErrorNotice error={op.error} />
			{groups.length > 1 ? (
				<View style={{ gap: 8 }}>
					<Button
						title="Previous section"
						secondary
						disabled={step === 0 || op.busy}
						onPress={() => setStep((n) => n - 1)}
					/>
					{step < groups.length - 1 ? (
						<Button
							title="Next section"
							disabled={op.busy}
							onPress={() => {
								const error = initial.canSubmit
									? validateAnswers(groups[step], answers, files)
									: null;
								if (error) op.setError(error);
								else {
									op.setError(null);
									setStep((n) => n + 1);
								}
							}}
						/>
					) : null}
				</View>
			) : null}
			{initial.canSubmit && step === groups.length - 1 ? (
				<Button
					title="Submit form"
					busy={op.busy}
					onPress={() =>
						Alert.alert(
							"Submit form?",
							"You cannot edit your answers after submission.",
							[
								{ text: "Back", style: "cancel" },
								{ text: "Submit", onPress: submit },
							],
						)
					}
				/>
			) : null}
		</>
	);
}
