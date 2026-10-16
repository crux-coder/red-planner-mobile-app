import { StyleSheet, View } from "react-native";

export function LoadingSkeleton({
	label,
	compact = false,
	inline = false,
	inverted = false,
}: {
	label: string;
	compact?: boolean;
	inline?: boolean;
	inverted?: boolean;
}) {
	if (inline) {
		return (
			<View
				accessible
				accessibilityRole="progressbar"
				accessibilityLabel={label}
				accessibilityState={{ busy: true }}
				style={s.inline}
			>
				<View style={[s.block, s.inlineBar, inverted && s.inverted]} />
			</View>
		);
	}
	return (
		<View
			accessible
			accessibilityRole="progressbar"
			accessibilityLabel={label}
			accessibilityState={{ busy: true }}
			style={s.card}
		>
			<View style={[s.block, s.caption]} />
			<View style={[s.block, s.title]} />
			<View style={[s.block, s.description]} />
			{!compact ? (
				<View style={s.details}>
					<View style={[s.block, s.line]} />
					<View style={[s.block, s.description]} />
					<View style={[s.block, s.line]} />
				</View>
			) : null}
			<View style={[s.block, s.button]} />
		</View>
	);
}

const s = StyleSheet.create({
	inline: { height: 20, justifyContent: "center", alignItems: "center" },
	inlineBar: { width: 88, height: 12 },
	inverted: { backgroundColor: "rgba(255,255,255,0.65)" },
	card: {
		padding: 20,
		gap: 12,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: "#e7edf4",
		backgroundColor: "#f7f9fc",
		marginBottom: 14,
	},
	block: { backgroundColor: "#e2e8f0", borderRadius: 6 },
	caption: { width: "35%", height: 12 },
	title: { width: "75%", height: 24 },
	description: { width: "60%", height: 14 },
	line: { width: "90%", height: 14 },
	details: { gap: 16, paddingVertical: 16 },
	button: { height: 46, marginTop: 4, borderRadius: 12 },
});
