import React, { useState, useEffect } from "react";
import { View, Modal, Platform, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/lib/useColorScheme";

interface CoefficientInputDialogProps {
  visible: boolean;
  onClose: () => void;
  onSave: (coefficient: number) => void;
  title: string;
  initialCoefficient: number;
  actionType: "shift" | "overtime";
}

export const CoefficientInputDialog: React.FC<CoefficientInputDialogProps> = ({
  visible,
  onClose,
  onSave,
  title,
  initialCoefficient,
  actionType,
}) => {
  const [coefficient, setCoefficient] = useState<number>(initialCoefficient);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Reset coefficient when dialog opens
  useEffect(() => {
    if (visible) {
      setCoefficient(initialCoefficient);
    }
  }, [visible, initialCoefficient]);

  const handleSave = () => {
    onSave(coefficient);
    onClose();
  };

  // Determine suggested coefficients based on action type
  const suggestedCoefficients = actionType === "overtime" 
    ? [1.5, 2.0, 2.5] 
    : [1.0, 1.25, 1.5];

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === "ios" ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/25 justify-center items-center">
        <View className="bg-white dark:bg-zinc-800 rounded-2xl w-[90vw] shadow-lg">
          <Text className="text-lg font-semibold p-4 text-zinc-900 dark:text-white">
            {title}
          </Text>
          
          {/* Separator below title */}
          <View className="h-1 border-b border-border dark:border-zinc-700" />
          
          <View className="p-4">
            {/* Description */}
            <Text className="text-zinc-500 dark:text-zinc-400 mb-4">
              {actionType === "overtime" 
                ? "Set the overtime coefficient for this shift." 
                : "Set the coefficient for this shift."}
            </Text>

            {/* Suggested coefficients */}
            <Text className="text-zinc-500 dark:text-zinc-400 mb-2">
              Suggested coefficients:
            </Text>
            <View className="flex flex-row justify-between mb-4">
              {suggestedCoefficients.map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setCoefficient(value)}
                  className={`py-2 px-4 rounded-lg ${
                    coefficient === value 
                      ? "bg-blue-600 dark:bg-blue-700" 
                      : "bg-zinc-100 dark:bg-zinc-700"
                  }`}
                >
                  <Text 
                    className={`font-medium ${
                      coefficient === value 
                        ? "text-white" 
                        : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {value.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom coefficient input */}
            <Text className="text-zinc-500 dark:text-zinc-400 mb-2">
              Custom coefficient:
            </Text>
            <View className="flex flex-row items-center justify-between mb-4">
              <TouchableOpacity
                onPress={() => setCoefficient(Math.max(0.5, coefficient - 0.1))}
                className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-700"
              >
                <Text className="text-gray-800 dark:text-gray-200 font-medium">
                  <Ionicons name="remove" size={24} />
                </Text>
              </TouchableOpacity>
              <Text className="text-zinc-900 dark:text-zinc-100 font-medium w-10 text-center">
                {coefficient.toFixed(2)}
              </Text>
              <TouchableOpacity
                onPress={() => setCoefficient(Math.min(10, coefficient + 0.1))}
                className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-700"
              >
                <Text className="text-gray-800 dark:text-gray-200 font-medium">
                  <Ionicons name="add" size={24} />
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Separator above actions */}
          <View className="h-1 border-b border-border dark:border-zinc-700" />
          
          <View className="flex flex-row justify-end p-4">
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              className="py-2.5 px-4 rounded-lg bg-zinc-100 dark:bg-zinc-700 mr-2"
            >
              <Text className="text-base font-semibold text-blue-600 dark:text-blue-400">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.7}
              className="py-2.5 px-4 rounded-lg bg-blue-600 dark:bg-blue-700"
            >
              <Text className="text-base font-semibold text-white">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
