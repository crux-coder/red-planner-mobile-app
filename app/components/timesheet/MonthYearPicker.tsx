import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { format, getYear, getMonth } from "date-fns";

interface MonthYearPickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({ date, onDateChange }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [isYearPickerVisible, setIsYearPickerVisible] = useState(false);
  
  const currentMonth = getMonth(date);
  const currentYear = getYear(date);
  
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Generate years (5 years before and after current year)
  const generateYears = () => {
    const thisYear = getYear(new Date());
    return Array.from({ length: 11 }, (_, i) => thisYear - 5 + i);
  };
  
  const years = generateYears();
  
  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(date);
    newDate.setMonth(monthIndex);
    onDateChange(newDate);
    setIsMonthPickerVisible(false);
  };
  
  const handleYearSelect = (year: number) => {
    const newDate = new Date(date);
    newDate.setFullYear(year);
    onDateChange(newDate);
    setIsYearPickerVisible(false);
  };
  
  return (
    <View>
      <View className="flex-row items-center justify-center">
        {/* Month Dropdown */}
        <TouchableOpacity
          onPress={() => setIsMonthPickerVisible(true)}
          className="flex-row items-center mr-2 px-3 py-2 bg-card rounded-md border border-border"
        >
          <Text className={`mr-1 ${isDark ? "text-white" : "text-black"}`}>
            {format(date, "MMMM")}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={isDark ? "#fff" : "#222"}
          />
        </TouchableOpacity>
        
        {/* Year Dropdown */}
        <TouchableOpacity
          onPress={() => setIsYearPickerVisible(true)}
          className="flex-row items-center px-3 py-2 bg-card rounded-md border border-border"
        >
          <Text className={`mr-1 ${isDark ? "text-white" : "text-black"}`}>
            {format(date, "yyyy")}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={isDark ? "#fff" : "#222"}
          />
        </TouchableOpacity>
      </View>
      
      {/* Month Picker Modal */}
      <Modal
        visible={isMonthPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMonthPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsMonthPickerVisible(false)}
        >
          <View 
            className={`rounded-lg ${isDark ? "bg-card" : "bg-white"} border border-border`}
            style={styles.pickerContainer}
          >
            <View className="border-b border-border p-3">
              <Text className={`font-medium text-center ${isDark ? "text-white" : "text-black"}`}>
                Select Month
              </Text>
            </View>
            <FlatList
              data={months}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => handleMonthSelect(index)}
                  className={`p-3 ${index === currentMonth ? "bg-primary/20" : ""}`}
                >
                  <Text 
                    className={`${index === currentMonth ? "font-bold text-primary" : isDark ? "text-white" : "text-black"}`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Year Picker Modal */}
      <Modal
        visible={isYearPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsYearPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsYearPickerVisible(false)}
        >
          <View 
            className={`rounded-lg ${isDark ? "bg-card" : "bg-white"} border border-border`}
            style={styles.pickerContainer}
          >
            <View className="border-b border-border p-3">
              <Text className={`font-medium text-center ${isDark ? "text-white" : "text-black"}`}>
                Select Year
              </Text>
            </View>
            <FlatList
              data={years}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleYearSelect(item)}
                  className={`p-3 ${item === currentYear ? "bg-primary/20" : ""}`}
                >
                  <Text 
                    className={`${item === currentYear ? "font-bold text-primary" : isDark ? "text-white" : "text-black"}`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  pickerContainer: {
    width: Dimensions.get("window").width * 0.8,
    maxHeight: 350,
  },
});

export default MonthYearPicker;
