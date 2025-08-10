import React from "react";
import { Text as RNText, TextProps as RNTextProps } from "react-native";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";

interface TextProps extends RNTextProps {
  variant?: "default" | "heading" | "subheading" | "caption";
}

export const Text: React.FC<TextProps> = ({
  variant = "default",
  style,
  children,
  ...props
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const variantStyles = {
    default: {
      fontSize: 14,
    },
    heading: {
      fontSize: 18,
      fontWeight: "bold" as const,
    },
    subheading: {
      fontSize: 16,
      fontWeight: "600" as const,
    },
    caption: {
      fontSize: 12,
      opacity: 0.7,
    },
  };

  return (
    <RNText
      style={[
        {
          color: isDark ? colors.dark.foreground : colors.light.foreground,
        },
        variantStyles[variant],
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};
