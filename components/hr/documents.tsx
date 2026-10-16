import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";
import { Alert, Text, View } from "react-native";

import { Signature, type SignatureHandle } from "./signature";
import {
	Badge,
	Button,
	Section,
	Check,
	Empty,
	ErrorNotice,
	Input,
	Loading,
	Row,
	Select,
	Tabs,
	s,
} from "./ui";
import { request, useOperation, useResource } from "./use-hr";

import { formatDate, label } from "@/lib/hr/domain";
import type {
	Completion,
	DocumentHistory,
	DocumentStep,
	Pack,
	PackSummary,
} from "@/lib/hr/types";

export async function openFile(url: string) {
	const parsed = new URL(url);
	if (parsed.protocol !== "https:" || parsed.username || parsed.password)
		throw new Error("This file link is not secure.");
	await WebBrowser.openBrowserAsync(url);
}
export function Documents({
	revision,
	onPack,
	onRecord,
	onForms,
}: {
	revision: number;
	onPack: (id: string) => void;
	onRecord: (id: string) => void;
	onForms: () => void;
}) {
	const [tab, setTab] = useState("To complete");
	const [search, setSearch] = useState("");
	const packs = useResource<{ packs: PackSummary[] }>(
		"/hr-documents/packs",
		revision,
	);
	const history = useResource<{ documents: DocumentHistory[] }>(
		tab === "History" ? "/hr-documents/history" : null,
		revision,
	);
	const source = tab === "History" ? history : packs;
	const pending = (packs.data?.packs ?? []).filter((p) =>
		p.distributionTitle.toLowerCase().includes(search.toLowerCase()),
	);
	const completed = (history.data?.documents ?? []).filter((d) =>
		`${d.title} ${d.distributionTitle} ${d.versionLabel} ${d.status}`
			.toLowerCase()
			.includes(search.toLowerCase()),
	);
	return (
		<>
			<Tabs
				value={tab}
				options={["To complete", "History"]}
				onChange={setTab}
			/>
			<Input
				title="Search documents"
				value={search}
				onChangeText={setSearch}
				placeholder="Title, version or status"
			/>
			<ErrorNotice error={source.error} retry={source.refresh} />
			{source.loading ? <Loading variant="list" /> : null}
			{source.loading
				? null
				: tab === "To complete"
					? pending.map((pack) => (
							<Section key={pack.id}>
								<Text style={s.heading}>{pack.distributionTitle}</Text>
								<Text style={s.muted}>
									{pack.completedCount} of {pack.documentCount} completed · Due{" "}
									{formatDate(pack.dueDate)}
								</Text>
								{pack.overdue ? <Badge value="overdue" /> : null}
								{pack.message ? (
									<Text style={s.text}>{pack.message}</Text>
								) : null}
								<Text style={s.muted}>
									{[
										pack.signatureCount
											? `${pack.signatureCount} to sign`
											: null,
										pack.acknowledgementCount
											? `${pack.acknowledgementCount} to acknowledge`
											: null,
										pack.acceptanceCount
											? `${pack.acceptanceCount} to respond to`
											: null,
										pack.readReceiptCount
											? `${pack.readReceiptCount} to read`
											: null,
									]
										.filter(Boolean)
										.join(" · ")}
								</Text>
								<Button
									title="Review documents"
									onPress={() => onPack(pack.id)}
								/>
							</Section>
						))
					: completed.map((doc) => (
							<Section key={doc.id}>
								<Text style={s.heading}>{doc.title}</Text>
								<Badge value={doc.status} />
								<Text style={s.muted}>
									{doc.versionLabel} · {formatDate(doc.completedAt)}
								</Text>
								<Text style={s.muted}>{doc.distributionTitle}</Text>
								{doc.workingTimeOptOutState ? (
									<Text style={s.muted}>
										Working time: {label(doc.workingTimeOptOutState.status)}
									</Text>
								) : null}
								<Button
									title="View record & PDF"
									secondary
									onPress={() => onRecord(doc.id)}
								/>
							</Section>
						))}
			{!source.loading &&
			!source.error &&
			!(tab === "History" ? completed : pending).length ? (
				<Empty
					text={
						search
							? "No matching documents."
							: tab === "History"
								? "No completed documents yet."
								: "You’re up to date. No documents need your response."
					}
				/>
			) : null}
			<Row
				title="My forms"
				detail="Complete assigned forms or start a new form"
				icon="clipboard"
				onPress={onForms}
			/>
		</>
	);
}
export function DocumentPack({
	id,
	onChanged,
}: {
	id: string;
	onChanged: () => void;
}) {
	const data = useResource<{ pack: Pack }>(`/hr-documents/packs/${id}`);
	const [selected, setSelected] = useState<string | null>(null);
	const [disclosed, setDisclosed] = useState(false);
	const pack = data.data?.pack;
	return (
		<>
			<ErrorNotice error={data.error} retry={data.refresh} />
			{data.loading && !pack ? <Loading variant="document" /> : null}
			{pack ? (
				<>
					<Text style={s.heading}>{pack.distributionTitle}</Text>
					<Badge value={pack.status} />
					{pack.message ? <Text style={s.text}>{pack.message}</Text> : null}
					<Text style={s.muted}>Due {formatDate(pack.dueDate)}</Text>
					{pack.status === "deferred" || pack.status === "withdrawn" ? (
						<Section>
							<Text style={s.text}>
								{pack.deferralReason ||
									pack.withdrawnReason ||
									"No response is currently required."}
							</Text>
							{pack.followUpDate ? (
								<Text style={s.muted}>
									Follow-up {formatDate(pack.followUpDate)}
								</Text>
							) : null}
						</Section>
					) : null}
					<Section>
						<Text style={s.heading}>Before you review HR documents</Text>
						<Text style={s.muted}>
							We record successful document access, review qualification and any
							response you submit. These events do not prove that you read or
							understood the document.
						</Text>
						<Text style={s.muted}>
							Completion evidence can include timestamps, IP address,
							device/browser details, identity snapshots, declarations, reasons,
							signatures, artifact hashes and withdrawals. We do not collect
							continuous scroll position, reading duration, cursor movement or
							attention tracking.
						</Text>
						{!disclosed ? (
							<Button
								title="Continue to documents"
								onPress={() => setDisclosed(true)}
							/>
						) : null}
					</Section>
					{disclosed ? (
						<>
							<Select
								title="Document"
								value={selected ?? pack.steps[0]?.id ?? ""}
								options={pack.steps.map((step) => ({
									value: step.id,
									label: `${step.position}. ${step.title} · ${label(step.status)}`,
								}))}
								onChange={setSelected}
							/>
							{(() => {
								const step =
									pack.steps.find((d) => d.id === selected) ?? pack.steps[0];
								return step ? (
									<Step
										key={step.id}
										pack={pack}
										step={step}
										onChanged={async () => {
											await data.refresh();
											onChanged();
										}}
									/>
								) : (
									<Empty text="This pack has no documents." />
								);
							})()}
						</>
					) : null}
				</>
			) : null}
		</>
	);
}
function Step({
	pack,
	step,
	onChanged,
}: {
	pack: Pack;
	step: DocumentStep;
	onChanged: () => Promise<void>;
}) {
	const op = useOperation();
	const [confirmed, setConfirmed] = useState(false);
	const [outcome, setOutcome] = useState("accepted");
	const [reason, setReason] = useState("");
	const signature = useRef<SignatureHandle>(null);
	const complete = !["not_viewed", "viewed"].includes(step.status);
	const inactive =
		complete || ["deferred", "withdrawn", "completed"].includes(pack.status);
	const workingTime =
		step.category === "working_time_opt_out" &&
		step.captureMethod === "click_to_accept";
	const sign = step.captureMethod === "drawn_electronic_signature";
	const base = `/hr-documents/packs/${pack.id}/steps/${step.id}`;
	const open = () =>
		op.run(async () => {
			const result = await request<{ url: string }>(`${base}/open`, {
				method: "POST",
				body: { mode: "external_file" },
			});
			await openFile(result.url);
			if (!complete) {
				await request(`${base}/action`, {
					method: "POST",
					body: {
						action: "mark_review_complete",
						reviewMethod: "external_file",
					},
				});
			}
			await onChanged();
		});
	const submit = () =>
		op.run(async () => {
			if (!step.reviewCompletedAt)
				throw new Error("Open the document before submitting your response.");
			if (
				outcome !== "accepted" &&
				!workingTime &&
				step.behaviour === "acceptance" &&
				!reason.trim()
			)
				throw new Error("Add a reason for your response.");
			if (
				outcome !== "declined" &&
				step.declarationText &&
				!confirmed &&
				!workingTime
			)
				throw new Error("Confirm the declaration before submitting.");
			let body: Record<string, unknown> = {
				action: "acknowledge",
				declarationConfirmed: confirmed,
			};
			if (workingTime)
				body = { action: "respond_working_time_opt_out", outcome };
			else if (step.behaviour === "acceptance") {
				body = {
					action: sign ? "sign" : "accept",
					outcome,
					reason: outcome === "accepted" ? undefined : reason.trim(),
					declarationConfirmed: outcome === "declined" ? false : confirmed,
				};
				if (sign && outcome !== "declined") {
					if (!signature.current) throw new Error("Enter your signature.");
					Object.assign(body, await signature.current.capture());
				}
			}
			await request(`${base}/action`, { method: "POST", body });
			setConfirmed(false);
			await onChanged();
		});
	return (
		<>
			<Section>
				<Text style={s.heading}>{step.title}</Text>
				<Text style={s.muted}>
					{step.versionLabel} · Effective {formatDate(step.effectiveDate)}
				</Text>
				<Badge value={step.status} />
				{step.description ? (
					<Text style={s.text}>{step.description}</Text>
				) : null}
				{step.prominentTermsSummary ? (
					<Text style={s.text}>{step.prominentTermsSummary}</Text>
				) : null}
				{step.changeReason ? (
					<Text style={s.text}>Reason for change: {step.changeReason}</Text>
				) : null}
				{step.contractualChangeItems?.map((change, i) => (
					<View key={i} style={{ gap: 5 }}>
						<Text style={s.label}>{change.term}</Text>
						<Text style={s.muted}>Current: {change.currentTerm}</Text>
						<Text style={s.text}>Proposed: {change.proposedTerm}</Text>
						<Text style={s.muted}>Impact: {change.employeeImpact}</Text>
					</View>
				))}
				{step.queryWindowEndsAt ? (
					<Text style={s.muted}>
						Query window: {formatDate(step.queryWindowStartsAt)} –{" "}
						{formatDate(step.queryWindowEndsAt)}
					</Text>
				) : null}
				{step.employeeContactRoute ? (
					<View style={{ gap: 5 }}>
						<Text style={s.label}>
							Questions? Contact {step.employeeContactRoute.contactName}
						</Text>
						<Text selectable style={s.text}>
							{step.employeeContactRoute.destination}
						</Text>
						<Text style={s.muted}>
							{step.employeeContactRoute.availability}
							{step.employeeContactRoute.responseTargetHours
								? ` · Response target: ${step.employeeContactRoute.responseTargetHours} hours`
								: ""}
						</Text>
					</View>
				) : null}
				{step.canOpen ? (
					<Button title="Open PDF" secondary busy={op.busy} onPress={open} />
				) : (
					<Text style={s.muted}>This document is not available to open.</Text>
				)}
				{step.behaviour === "read_receipt" ? (
					<Text style={s.muted}>
						Opening this document records a read receipt. It is not acceptance,
						consent or proof of understanding.
					</Text>
				) : null}
			</Section>
			{!inactive && step.behaviour !== "read_receipt" ? (
				<Section>
					<Text style={s.heading}>Your response</Text>
					{!step.reviewCompletedAt ? (
						<Text style={s.muted}>
							Open the PDF to review it before responding.
						</Text>
					) : (
						<Text style={s.muted}>
							Review recorded {formatDate(step.reviewCompletedAt)}.
						</Text>
					)}
					{step.behaviour === "acceptance" ? (
						<Select
							title="Response"
							value={outcome}
							onChange={setOutcome}
							disabled={op.busy}
							options={[
								{
									value: "accepted",
									label: workingTime ? "I choose to opt out" : "Accept",
								},
								{
									value: "declined",
									label: workingTime ? "I do not wish to opt out" : "Decline",
								},
								...(!workingTime
									? [
											{
												value: "accepted_under_protest",
												label: "Accept under protest",
											},
										]
									: []),
							]}
						/>
					) : null}
					{outcome !== "accepted" &&
					!workingTime &&
					step.behaviour === "acceptance" ? (
						<Input
							title="Reason"
							value={reason}
							onChangeText={setReason}
							multiline
							editable={!op.busy}
						/>
					) : null}
					{step.declarationText ? (
						<Text style={s.text}>{step.declarationText}</Text>
					) : null}
					{outcome !== "declined" && !workingTime ? (
						<Check
							title="I confirm the declaration above"
							checked={confirmed}
							onChange={setConfirmed}
							disabled={op.busy}
						/>
					) : null}
					{sign && outcome !== "declined" ? (
						<Signature
							ref={signature}
							typedOnly={step.signatureInputPolicy === "typed_name_required"}
							disabled={op.busy}
						/>
					) : null}
					<Button
						title={
							outcome === "declined"
								? "Submit decline"
								: outcome === "accepted_under_protest"
									? "Submit acceptance under protest"
									: step.buttonLabel || "Submit response"
						}
						disabled={!step.reviewCompletedAt}
						busy={op.busy}
						onPress={() =>
							Alert.alert(
								"Submit your response?",
								"Your response will be recorded with this document.",
								[
									{ text: "Back", style: "cancel" },
									{ text: "Submit", onPress: submit },
								],
							)
						}
					/>
				</Section>
			) : null}
			<ErrorNotice error={op.error} />
		</>
	);
}
export function DocumentRecord({
	id,
	onChanged,
}: {
	id: string;
	onChanged: () => void;
}) {
	const result = useResource<{ record: Completion }>(
		`/hr-documents/history/${id}`,
	);
	const op = useOperation();
	const record = result.data?.record;
	const state =
		record?.workingTimeOptOutState?.status ??
		(record?.workingTimeOptOutWithdrawal
			? "withdrawal_pending"
			: record?.status === "declined"
				? "not_opted_out"
				: "opted_out");
	const withdrawal =
		record?.workingTimeOptOutState?.withdrawal ??
		record?.workingTimeOptOutWithdrawal;
	const change = (action: "withdrawal" | "opt-out") =>
		Alert.alert(
			action === "withdrawal"
				? "Withdraw working-time opt-out?"
				: "Opt out of the working-time limit?",
			action === "withdrawal"
				? "I withdraw my agreement to opt out of the 48-hour average weekly working time limit under the Working Time Regulations 1998. I understand that this withdrawal will take effect one month after this notice."
				: "Confirm that you voluntarily agree to opt out under the declaration recorded with this document.",
			[
				{ text: "Back", style: "cancel" },
				{
					text: "Confirm",
					onPress: () =>
						op.run(async () => {
							await request(`/hr-documents/history/${id}/${action}`, {
								method: "POST",
								body:
									action === "opt-out" ? { declarationConfirmed: true } : {},
							});
							await result.refresh();
							onChanged();
						}),
				},
			],
		);
	return (
		<>
			<ErrorNotice error={result.error} retry={result.refresh} />
			{result.loading ? <Loading variant="document" /> : null}
			{record && !result.loading ? (
				<>
					<Section>
						<Text style={s.heading}>{record.title}</Text>
						<Badge value={record.status} />
						<Text style={s.muted}>
							{record.versionLabel} · {record.distributionTitle}
						</Text>
						<Text style={s.muted}>
							Completed {formatDate(record.completedAt)}
						</Text>
						<Text style={s.text}>{record.declarationText}</Text>
						<Text style={s.muted}>
							Declaration{" "}
							{record.declarationConfirmed ? "confirmed" : "not confirmed"}
						</Text>
						{record.outcomeReason ? (
							<Text style={s.text}>Reason: {record.outcomeReason}</Text>
						) : null}
						<Text style={s.muted}>
							Review: {label(record.reviewMethod)} ·{" "}
							{formatDate(record.reviewCompletedAt)}
						</Text>
						{record.signatureCapture ? (
							<Text style={s.muted}>
								Signature: {label(record.signatureCapture.inputMethod)}
								{record.signatureCapture.typedName
									? ` · ${record.signatureCapture.typedName}`
									: ""}
							</Text>
						) : null}
						{record.adminRecording ? (
							<Text style={s.muted}>
								Recorded {record.adminRecording.method} completion ·{" "}
								{record.adminRecording.assistingPerson} ·{" "}
								{record.adminRecording.assistanceDetails}
							</Text>
						) : null}
						<Button
							title="Open completed PDF"
							secondary
							busy={op.busy}
							onPress={() =>
								op.run(async () => {
									const { url } = await request<{ url: string }>(
										`/hr-documents/history/${id}/artifact`,
										{ method: "POST" },
									);
									await openFile(url);
								})
							}
						/>
					</Section>
					{record.isWorkingTimeOptOut ? (
						<Section>
							<Text style={s.heading}>Working-time opt-out</Text>
							<Text style={s.text}>{label(state)}</Text>
							{withdrawal ? (
								<>
									<Text style={s.text}>{withdrawal.wording}</Text>
									<Text style={s.muted}>
										Notice: {formatDate(withdrawal.noticeAt)} · Effective:{" "}
										{formatDate(withdrawal.effectiveDate)}
									</Text>
								</>
							) : null}
							{state === "opted_out" ? (
								<Button
									title="Withdraw opt-out"
									secondary
									disabled={op.busy}
									onPress={() => change("withdrawal")}
								/>
							) : ["not_opted_out", "withdrawn"].includes(state) ? (
								<Button
									title="Opt out"
									secondary
									disabled={op.busy}
									onPress={() => change("opt-out")}
								/>
							) : null}
						</Section>
					) : null}
				</>
			) : null}
			<ErrorNotice error={op.error} />
		</>
	);
}
