import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { H1 } from "@/components/ui/typography";

interface DateNavigatorProps {
  currentDate: Date;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}

export default function DateNavigator({
  currentDate,
  onPreviousDay,
  onNextDay,
  onToday,
}: DateNavigatorProps) {
  // Format date for display
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <View className="p-4">
      <View className="flex-row justify-between items-center mb-2">
        <H1>{formattedDate}</H1>
      </View>

      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-primary font-medium" onPress={onPreviousDay}>
          Previous Day
        </Text>
        <Text className="text-primary font-medium" onPress={onToday}>
          Today
        </Text>
        <Text className="text-primary font-medium" onPress={onNextDay}>
          Next Day
        </Text>
      </View>
    </View>
  );
}
