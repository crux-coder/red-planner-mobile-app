import React from "react";
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
  StyleSheet,
} from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";

export interface TextInputProps extends RNTextInputProps {
  className?: string;
}

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  ({ className = "", style, ...props }, ref) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    return (
      <RNTextInput
        ref={ref}
        placeholderTextColor={isDark ? colors.dark.muted : colors.light.muted}
        style={[
          styles.input,
          {
            color: isDark ? colors.dark.foreground : colors.light.foreground,
            backgroundColor: isDark ? colors.dark.card : colors.light.card,
            borderColor: isDark ? colors.dark.border : colors.light.border,
          },
          style,
        ]}
        {...props}
      />
    );
  }
);

TextInput.displayName = "TextInput";

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
});
