import { Platform } from "react-native";
import Svg, { Path } from "react-native-svg";

const paths = {
	jacket:
		"m8 3-4 3-3 13 4 1 2-10v11h10V10l2 10 4-1-3-13-4-3 M8 3l4 4 4-4 M12 7v14 M8 15h2 M14 15h2",
	vest: "M8 3 5 4v6l-2 3v8h18v-8l-2-3V4l-3-1-4 4Z M12 7v14 M3 15h18 M6 4v7 M18 4v7",
	coverall:
		"m8 2-4 3-3 10 4 1 2-7v6l-1 7h5l1-6 1 6h5l-1-7V9l2 7 4-1-3-10-4-3-4 4Z M12 6v7 M7 13h10",
	"long-sleeve":
		"M8 3 4 5 1 20l4 1 2-11v11h10V10l2 11 4-1-3-15-4-2a4 4 0 0 1-8 0Z",
	trousers: "M6 3h12l2 18h-6l-2-11-2 11H4Z M6 6h12 M9 6v3l-3 2 M15 6v3l3 2",

	"chevrons-up-down": "m8 9 4-4 4 4 M8 15l4 4 4-4",
	clothing: "M8 3 3 6l-2 5 5 2v8h12v-8l5-2-2-5-5-3a4 4 0 0 1-8 0Z",
	message:
		"M21 11a8 8 0 0 1-8 8H8l-5 3 1-6a8 8 0 0 1-1-5 8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z M7 9h10 M7 13h6",
	document: "M14 2H5v20h14V7Z M14 2v6h5 M8 12h8 M8 16h6",
	folder: "M3 6h7l2 3h9v11H3Z M3 6V4h7l2 2h8v3",
	receipt:
		"M5 2l2 2 2-2 3 2 3-2 2 2 2-2v20l-2-2-2 2-3-2-3 2-2-2-2 2Z M8 8h8 M8 12h8 M8 16h4",

	signature:
		"M20 7V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7 M8 7h6 M8 11h4 M16 16l4-4 2 2-4 4-3 1Z",
	shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z m-4-11 3 3 5-5",
	bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
	home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
	briefcase:
		"M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2 M3 6h18v14H3Z M3 11a20 20 0 0 0 18 0 M12 10v4",
	clipboard: "M9 4H5v17h14V4h-4 M9 2h6v4H9Z M9 11h6 M9 16h6",
	more: "M4 12h.01 M12 12h.01 M20 12h.01",
	pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
	user: "M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
	door: "M3 21h18 M5 21V3l12-1v19 M17 5h3v16 M13 12h.01",
	navigation: "m22 2-7 20-4-9-9-4Z",
	phone:
		"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z",
	chevron: "m9 6 6 6-6 6",
	calendar:
		"M3 5h18v16H3Z M16 3v4 M8 3v4 M3 11h18 M8 15h.01 M12 15h.01 M16 15h.01 M8 18h.01 M12 18h.01",
	close: "m6 6 12 12 M6 18 18 6",
	check: "m5 12 4 4L19 6",
};
export type IconName = keyof typeof paths;
export function Icon({
	name,
	size = 22,
	color = "#10213b",
	filled = false,
}: {
	name: IconName;
	size?: number;
	color?: string;
	filled?: boolean;
}) {
	return (
		<Svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={filled ? color : "none"}
			stroke={color}
			strokeWidth={name === "more" ? 4 : 2}
			strokeLinecap="round"
			strokeLinejoin="round"
			{...(Platform.OS === "web"
				? { "aria-hidden": true }
				: { accessibilityElementsHidden: true })}
		>
			<Path d={paths[name]} />
		</Svg>
	);
}
