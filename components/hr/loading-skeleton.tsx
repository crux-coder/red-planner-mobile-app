import { StyleSheet, View } from "react-native";

export type HrSkeletonVariant =
	| "overview"
	| "balance"
	| "absence"
	| "content"
	| "list"
	| "document"
	| "form"
	| "field";

export function HrLoadingSkeleton({
	variant = "content",
}: {
	variant?: HrSkeletonVariant;
}) {
	return (
		<View
			accessible
			accessibilityRole="progressbar"
			accessibilityLabel="Loading HR"
			accessibilityState={{ busy: true }}
			style={s.content}
		>
			{variant === "list" ? (
				<>
					{[0, 1, 2].map((key) => (
						<View key={key} style={s.section}>
							<Absence />
						</View>
					))}
				</>
			) : variant === "document" ? (
				<>
					<View style={s.section}>
						<View style={[s.block, s.heading]} />
						<View style={[s.block, s.badge]} />
						<View style={[s.block, s.short]} />
					</View>
					<View style={s.section}>
						<View style={[s.block, s.heading]} />
						{[0, 1, 2].map((key) => (
							<View key={key} style={[s.block, s.line]} />
						))}
						<View style={[s.block, s.short]} />
						<View style={[s.block, s.button]} />
					</View>
				</>
			) : variant === "form" ? (
				<>
					<View style={[s.block, s.heading]} />
					<View style={[s.block, s.short]} />
					{[0, 1, 2].map((key) => (
						<View key={key} style={s.section}>
							<Field />
						</View>
					))}
				</>
			) : variant === "field" ? (
				<Field />
			) : variant === "overview" ? (
				<>
					<View style={s.lines}>
						<Balance />
						<View style={s.leaveYear}>
							<View style={[s.block, { width: 100, height: 16 }]} />
							<View style={s.leaveTotals}>
								{[0, 1, 2].map((key) => (
									<View key={key} style={s.leaveMetric}>
										<View style={[s.block, { width: "70%", height: 28 }]} />
										<View style={[s.block, { width: "90%", height: 16 }]} />
									</View>
								))}
							</View>
						</View>
						<View style={[s.block, s.button]} />
					</View>
					<View style={s.navigation}>
						{[0, 1, 2, 3].map((key) => (
							<View key={key} style={s.row}>
								<View style={[s.block, s.icon]} />
								<View style={s.rowText}>
									<View style={[s.block, s.heading]} />
									<View style={[s.block, s.line]} />
								</View>
							</View>
						))}
					</View>
					<View style={[s.block, s.heading]} />
					<Absence />
				</>
			) : variant === "balance" ? (
				<Balance />
			) : variant === "absence" ? (
				<Absence />
			) : (
				<>
					<View style={[s.block, s.heading]} />
					<View style={[s.block, s.line]} />
					<View style={[s.block, s.short]} />
				</>
			)}
		</View>
	);
}

function Field() {
	return (
		<View style={s.lines}>
			<View style={[s.block, s.short]} />
			<View style={[s.block, s.button]} />
		</View>
	);
}

function Balance() {
	return (
		<View style={s.balancePanel}>
			<View style={[s.block, s.balance]} />
			<View style={[s.block, s.balanceLabel]} />
			<View style={[s.block, s.balanceTrack]} />
			<View style={[s.block, s.balanceTotal]} />
		</View>
	);
}
function Absence() {
	return (
		<View style={s.lines}>
			<View style={[s.block, s.heading]} />
			<View style={[s.block, s.badge]} />
			<View style={[s.block, s.line]} />
			<View style={[s.block, s.button]} />
		</View>
	);
}
const s = StyleSheet.create({
	section: {
		paddingVertical: 16,
		gap: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#e0e6ef",
	},
	leaveYear: {
		backgroundColor: "#f5f7fa",
		borderRadius: 18,
		padding: 12,
		gap: 10,
	},
	leaveTotals: { flexDirection: "row", gap: 12 },
	leaveMetric: { flex: 1, gap: 4 },
	balanceTrack: {
		width: "100%",
		height: 7,
		backgroundColor: "rgba(255,255,255,0.2)",
		marginTop: 16,
	},
	balanceTotal: {
		width: 110,
		height: 20,
		backgroundColor: "rgba(255,255,255,0.2)",
		marginTop: 4,
	},
	content: { gap: 20, width: "100%" },
	lines: { gap: 12 },
	navigation: {
		backgroundColor: "#f5f7fa",
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 6,
	},
	block: { backgroundColor: "#e2e8f0", borderRadius: 6 },
	heading: { width: "45%", height: 20 },
	balancePanel: {
		backgroundColor: "#10213b",
		borderRadius: 20,
		padding: 24,
		gap: 4,
		alignItems: "center",
	},
	balance: { width: 80, height: 60, backgroundColor: "rgba(255,255,255,0.2)" },
	balanceLabel: {
		width: 120,
		height: 24,
		backgroundColor: "rgba(255,255,255,0.2)",
	},
	line: { width: "85%", height: 14 },
	short: { width: "60%", height: 14 },
	button: { height: 48, borderRadius: 14 },
	badge: { width: 80, height: 24, borderRadius: 12 },
	row: { flexDirection: "row", gap: 12, alignItems: "center", minHeight: 64 },
	icon: { width: 40, height: 40, borderRadius: 12 },
	rowText: { flex: 1, gap: 8 },
});
