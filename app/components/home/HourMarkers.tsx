import { View, StyleSheet } from "react-native";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";

interface HourMarkersProps {
  hourHeight: number;
}

export default function HourMarkers({ hourHeight }: HourMarkersProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const renderHourMarkers = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      const formattedHour = `${i.toString().padStart(2, "0")}:00`;
      hours.push(
        <View key={i} style={[styles.hourMarker, { top: i * hourHeight }]}>
          <Text style={[styles.hourText, isDark && styles.hourTextDark]}>
            {formattedHour}
          </Text>
          <View style={[styles.hourLine, isDark && styles.hourLineDark]} />
        </View>
      );
    }
    return hours;
  };

  return <>{renderHourMarkers()}</>;
}

const styles = StyleSheet.create({
  hourMarker: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
  },
  hourText: {
    width: 50,
    fontSize: 12,
    color: "#666",
  },
  hourTextDark: {
    color: "#aaa",
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  hourLineDark: {
    backgroundColor: "#333",
  },
});
