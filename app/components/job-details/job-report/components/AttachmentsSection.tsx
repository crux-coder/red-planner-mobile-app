import React, { useCallback } from "react";
import { View, TouchableOpacity, Image, Alert, StyleSheet, FlatList } from "react-native";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import type { JobReportData } from "../hooks/useJobReport";

interface AttachmentsSectionProps {
  reportData: JobReportData;
  setReportData: React.Dispatch<React.SetStateAction<JobReportData | null>>;
}

export const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({ reportData, setReportData }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const files = Array.isArray(reportData?.files) ? reportData.files : [];

  const addPhotos = useCallback(async () => {
    try {
      const ImagePicker = await import("expo-image-picker");

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "We need access to your photos to attach images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
      });

      if (result.canceled) return;

      const picked = result.assets?.map((a) => a.uri).filter(Boolean) as string[];
      if (!picked?.length) return;

      setReportData((prev) => {
        const current = (prev?.files ?? []) as string[];
        const next: JobReportData = {
          ...(prev as JobReportData),
          files: [...current, ...picked],
        };
        return next;
      });
    } catch (e) {
      console.error("AttachmentsSection addPhotos error:", e);
      Alert.alert("Image Picker not available", "Unable to open photo library. You can still paste URLs elsewhere.");
    }
  }, [setReportData]);

  const removeAt = (index: number) => {
    setReportData((prev) => {
      const current = ((prev?.files ?? []) as string[]).slice();
      current.splice(index, 1);
      const next: JobReportData = {
        ...(prev as JobReportData),
        files: current,
      };
      return next;
    });
  };

  // Build list with an extra trailing "add" button item
  type ListItem = { kind: "file"; uri: string } | { kind: "add" };
  const listData: ListItem[] = [
    ...files.map((uri) => ({ kind: "file" as const, uri })),
    { kind: "add" as const },
  ];

  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if (item.kind === "add") {
      return (
        <TouchableOpacity
          onPress={addPhotos}
          style={[
            styles.card,
            {
              borderColor: isDark ? colors.dark.border : colors.light.border,
              backgroundColor: isDark ? colors.dark.card : colors.light.card,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <Ionicons
            name="image"
            size={24}
            color={isDark ? colors.dark.foreground : colors.light.foreground}
          />
          <Text
            style={{
              marginTop: 6,
              color: isDark ? colors.dark.foreground : colors.light.foreground,
              fontSize: 12,
            }}
          >
            Add photos
          </Text>
        </TouchableOpacity>
      );
    }

    const isImage =
      item.uri.startsWith("ph://") ||
      item.uri.startsWith("content://") ||
      item.uri.match(/\.(png|jpg|jpeg|gif|webp)$/i);
    return (
      <View
        style={[
          styles.card,
          {
            borderColor: isDark ? colors.dark.border : colors.light.border,
            backgroundColor: isDark ? colors.dark.card : colors.light.card,
          },
        ]}
      >
        {isImage ? (
          <Image source={{ uri: item.uri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.thumb,
              styles.nonImage,
              { backgroundColor: isDark ? colors.dark.muted : colors.light.muted },
            ]}
          >
            <Ionicons
              name="document"
              size={24}
              color={isDark ? colors.dark.background : colors.light.background}
            />
          </View>
        )}
        <TouchableOpacity style={styles.removeBtn} onPress={() => removeAt(index)}>
          <Ionicons
            name="close-circle"
            size={22}
            color={isDark ? colors.dark.primary : colors.light.primary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View
      className="mb-6 p-4 rounded-lg"
      style={{
        backgroundColor: isDark ? colors.dark.card : colors.light.card,
        borderColor: isDark ? colors.dark.border : colors.light.border,
        borderWidth: 1,
      }}
    >
      <Text
        className="text-lg font-semibold mb-3"
        style={{ color: isDark ? colors.dark.foreground : colors.light.foreground }}
      >
        Attachments
      </Text>

      <FlatList
        data={listData}
        keyExtractor={(item, idx) => ("kind" in item && item.kind === "file" ? `${item.uri}-${idx}` : "add-button")}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  card: {
    width: 88,
    height: 88,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  nonImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
  },
});

export default AttachmentsSection;
