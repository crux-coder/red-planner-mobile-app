import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "./icon";

import type { HomeJob } from "@/lib/schedule";

export function FeaturedJob({
	job,
	currentTime,
	onOpen,
}: {
	job: HomeJob;
	currentTime: string;
	onOpen: (kind: "job" | "directions" | "contact", job: HomeJob) => void;
}) {
	return (
		<View style={s.hero}>
			<View style={s.top}>
				<Text style={s.badge}>
					{job.start <= currentTime ? "CURRENT JOB" : "UP NEXT"}
				</Text>
				<Text style={s.heroTime}>
					{job.start}–{job.end}
				</Text>
			</View>
			<Text accessibilityRole="header" style={s.heroTitle}>
				{job.name}
			</Text>
			<Text style={s.heroSubtitle}>{job.survey}</Text>
			<View style={s.row}>
				<Icon name="pin" color="#afcdeb" size={18} />
				<Text style={s.heroAddress}>
					{job.address || "No site address recorded"}
				</Text>
			</View>
			{job.detailsRestricted ? (
				<Text style={s.restricted}>
					Some site details are unavailable with your current access.
				</Text>
			) : null}
			<View style={s.preparation}>
				<View style={s.columns}>
					<View style={s.fact}>
						<Icon name="user" color="#afcdeb" size={21} />
						<View style={s.flex}>
							<Text style={s.caption}>With</Text>
							<Text style={s.value}>{job.teammate}</Text>
						</View>
					</View>
					<View style={s.divider} />
					<View style={s.fact}>
						<Icon name="briefcase" color="#afcdeb" size={21} />
						<View style={s.flex}>
							<Text style={s.caption}>Bring</Text>
							<Text style={s.value}>
								{job.equipment.join(" · ") || "No equipment assigned"}
							</Text>
						</View>
					</View>
				</View>
				<View style={s.access}>
					<Icon name="door" color="#afcdeb" size={21} />
					<View style={s.flex}>
						<Text style={s.caption}>Access</Text>
						<Text style={s.value}>{job.access}</Text>
					</View>
				</View>
			</View>
			<Pressable
				accessibilityRole="button"
				onPress={() => onOpen("job", job)}
				style={({ pressed }) => [s.primary, pressed && s.pressed]}
			>
				<Text style={s.primaryText}>View job & brief</Text>
				<Icon name="chevron" size={20} color="#fff" />
			</Pressable>
			<View style={s.actions}>
				<Pressable
					accessibilityRole="button"
					onPress={() => onOpen("contact", job)}
					style={({ pressed }) => [s.action, pressed && s.pressed]}
				>
					<Icon name="phone" color="#afcdeb" size={20} />
					<Text style={s.actionText}>Site contact</Text>
				</Pressable>
				<View style={s.divider} />
				<Pressable
					accessibilityRole="button"
					onPress={() => onOpen("directions", job)}
					style={({ pressed }) => [s.action, pressed && s.pressed]}
				>
					<Icon name="navigation" color="#afcdeb" size={20} />
					<Text style={s.actionText}>Directions</Text>
				</Pressable>
			</View>
		</View>
	);
}

export function TodayJobList({
	jobs,
	currentTime,
	onOpen,
	onViewSchedule,
}: {
	jobs: HomeJob[];
	currentTime: string;
	onOpen: (job: HomeJob) => void;
	onViewSchedule: () => void;
}) {
	const upcoming = jobs.filter(
		(job) => job.status !== "completed" && job.end > currentTime,
	);
	const earlier = jobs.filter(
		(job) => job.status === "completed" || job.end <= currentTime,
	);
	return (
		<>
			{[
				{ title: "Later today", jobs: upcoming },
				{ title: "Earlier today", jobs: earlier },
			].map((group) =>
				group.title === "Earlier today" && !group.jobs.length ? null : (
					<View key={group.title} style={s.section}>
						<View style={s.sectionTop}>
							<Text accessibilityRole="header" style={s.heading}>
								{group.title}
							</Text>
							<Pressable
								accessibilityRole="button"
								onPress={onViewSchedule}
								style={s.viewAll}
							>
								<Text style={s.link}>View all</Text>
							</Pressable>
						</View>
						{group.jobs.length ? (
							group.jobs.map((job) => (
								<Pressable
									key={job.id}
									accessibilityRole="button"
									accessibilityLabel={`${job.start} to ${job.end}, ${job.name}, ${job.survey}`}
									accessibilityHint="Opens job details and brief"
									onPress={() => onOpen(job)}
									style={({ pressed }) => [s.card, pressed && s.pressed]}
								>
									<View style={s.rail}>
										<Text style={s.start}>{job.start}</Text>
										<View style={s.line} />
										<Text style={s.end}>{job.end}</Text>
									</View>
									<View style={s.body}>
										<Text style={s.title}>{job.name}</Text>
										<Text style={s.subtitle}>{job.survey}</Text>
										<View style={s.row}>
											<Icon name="pin" size={15} color="#53647d" />
											<Text style={s.address}>
												{job.address || "No site address recorded"}
											</Text>
										</View>
										{job.status === "completed" ? (
											<Text style={s.address}>Completed</Text>
										) : null}
									</View>
									<View style={s.chevron}>
										<Icon name="chevron" size={20} color="#e90087" />
									</View>
								</Pressable>
							))
						) : (
							<Text style={s.empty}>No more jobs scheduled for today.</Text>
						)}
					</View>
				),
			)}
		</>
	);
}

const s = StyleSheet.create({
	flex: { flex: 1 },
	hero: { backgroundColor: "#102638", borderRadius: 22, padding: 18 },
	top: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
		marginBottom: 14,
	},
	badge: {
		backgroundColor: "#e90087",
		color: "#fff",
		borderRadius: 14,
		overflow: "hidden",
		paddingHorizontal: 12,
		paddingVertical: 5,
		fontSize: 11,
		fontWeight: "700",
	},
	heroTime: {
		color: "#afcdeb",
		fontSize: 14,
		fontWeight: "600",
		fontVariant: ["tabular-nums"],
	},
	heroTitle: {
		fontSize: 27,
		lineHeight: 33,
		fontWeight: "700",
		color: "#fff",
		letterSpacing: -0.4,
	},
	heroSubtitle: {
		fontSize: 17,
		lineHeight: 24,
		color: "#afcdeb",
		marginTop: 4,
		marginBottom: 12,
	},
	row: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
	heroAddress: { flex: 1, color: "#afcdeb", fontSize: 14, lineHeight: 20 },
	restricted: { color: "#d4e3f2", fontSize: 12, lineHeight: 18, marginTop: 10 },
	preparation: {
		backgroundColor: "#1c354e",
		borderRadius: 15,
		padding: 13,
		marginTop: 20,
		marginBottom: 16,
	},
	columns: { flexDirection: "row", gap: 10 },
	fact: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 7 },
	caption: { color: "#afcdeb", fontSize: 12, lineHeight: 18, marginBottom: 3 },
	value: { color: "#fff", fontSize: 13, lineHeight: 19 },
	divider: { width: 1, backgroundColor: "#3c5770" },
	access: {
		flexDirection: "row",
		gap: 8,
		borderTopWidth: 1,
		borderTopColor: "#3c5770",
		paddingTop: 12,
		marginTop: 12,
	},
	primary: {
		minHeight: 48,
		backgroundColor: "#e90087",
		borderRadius: 12,
		padding: 13,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
	},
	primaryText: {
		flexShrink: 1,
		fontSize: 15,
		fontWeight: "700",
		color: "#fff",
	},
	actions: { flexDirection: "row", marginTop: 14 },
	action: {
		flex: 1,
		minHeight: 44,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 4,
	},
	actionText: { flexShrink: 1, fontSize: 13, color: "#fff", fontWeight: "600" },
	pressed: { opacity: 0.7 },
	section: { marginTop: 20, gap: 10 },
	sectionTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},
	heading: { flexShrink: 1, fontSize: 21, fontWeight: "700", color: "#10213b" },
	viewAll: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6 },
	link: { color: "#c40071", fontSize: 14, fontWeight: "600" },
	card: {
		flexDirection: "row",
		borderWidth: 1,
		borderColor: "#d8e1eb",
		borderRadius: 14,
		overflow: "hidden",
		backgroundColor: "#fff",
	},
	rail: {
		width: "22%",
		minWidth: 68,
		paddingHorizontal: 5,
		paddingVertical: 16,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#eaf4fd",
	},
	start: {
		fontSize: 15,
		fontWeight: "700",
		color: "#10213b",
		fontVariant: ["tabular-nums"],
	},
	end: { fontSize: 14, color: "#53647d", fontVariant: ["tabular-nums"] },
	line: { height: 25, width: 1, marginVertical: 6, backgroundColor: "#a1b5c9" },
	body: { flex: 1, padding: 12, justifyContent: "center", gap: 4 },
	title: { fontSize: 16, lineHeight: 21, fontWeight: "700", color: "#10213b" },
	subtitle: { fontSize: 13, lineHeight: 19, color: "#53647d" },
	address: { flexShrink: 1, fontSize: 12, lineHeight: 17, color: "#53647d" },
	chevron: { justifyContent: "center", paddingRight: 10 },
	empty: { fontSize: 14, lineHeight: 20, color: "#53647d", paddingBottom: 10 },
});
