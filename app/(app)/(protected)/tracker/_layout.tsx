import { Stack } from "expo-router";
import React from "react";

export default function TrackerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Time Tracker" }} />
    </Stack>
  );
}
