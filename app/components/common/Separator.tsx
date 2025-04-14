import React from "react";
import { View } from "react-native";

interface SeparatorProps {
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({ className = "" }) => {
  return <View className={`h-px bg-border my-4 ${className}`} />;
};

export default Separator;
