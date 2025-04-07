import { cn } from "@/lib/utils";
import { JobStatus, JobType } from "@/app/(app)/(protected)/index";

export const colorClasses = {
  blue: {
    bg: "#d9efff",
    bgDark: "#1F2E4D",
    border: "#64baff",
    text: "#64baff",
    shadow: "#64baff",
  },
  green: {
    bg: "#ebfbeb",
    bgDark: "#173723",
    border: "#70cc70",
    text: "#70cc70",
    shadow: "#70cc70",
  },
  red: {
    bg: "#ffd9d9",
    bgDark: "#4A2021",
    border: "#ff6465",
    text: "#ff6465",
    shadow: "#ff6465",
  },
  purple: {
    bg: "#f9d9ff",
    bgDark: "#39244D",
    border: "#e464ff",
    text: "#e464ff",
    shadow: "#e464ff",
  },
  yellow: {
    bg: "#f8f4d6",
    bgDark: "#493B18",
    border: "#dec643",
    text: "#dec643",
    shadow: "#dec643",
  },
  gray: {
    bg: "#f0f0f0",
    bgDark: "#2c2c2c",
    border: "#a0a0a0",
    text: "#a0a0a0",
    shadow: "#a0a0a0",
  },
  light_blue: {
    bg: "#d9efff",
    bgDark: "#1F2E4D",
    border: "#64baff",
    text: "#64baff",
    shadow: "#64baff",
  },
};

export const jobTypeColorClasses = {
  survey: {
    bg: "#e6f7e6",
    bgDark: "#1A3B1A",
    border: "#4CAF50",
    text: "#4CAF50",
    shadow: "#4CAF50",
  },
  data: {
    bg: "#fff3e6",
    bgDark: "#4D3924",
    border: "#FFA726",
    text: "#FFA726",
    shadow: "#FFA726",
  },
  cad: {
    bg: "#e6e6ff",
    bgDark: "#2C2C4D",
    border: "#7C4DFF",
    text: "#7C4DFF",
    shadow: "#7C4DFF",
  },
  qa: {
    bg: "#ffe6e6",
    bgDark: "#4D2424",
    border: "#FF7373",
    text: "#FF7373",
    shadow: "#FF7373",
  },
};

export const getJobStatusColor = (
  status: JobStatus,
  purpose: "bg" | "bgDark" | "border" | "text" | "shadow",
  isDark = false
) => {
  const colorVariants = {
    booked: colorClasses.blue[purpose],
    completed: colorClasses.green[purpose],
    canceled: colorClasses.red[purpose],
    in_progress: colorClasses.purple[purpose],
    to_reschedule: colorClasses.yellow[purpose],
    unscheduled: colorClasses.gray[purpose],
    pre_booked: colorClasses.light_blue[purpose],
  };
  
  return colorVariants[status] || colorClasses.yellow[purpose];
};

export const getJobTypeColor = (
  type: JobType,
  purpose: "bg" | "bgDark" | "border" | "text" | "shadow",
  isDark = false
) => {
  const colorVariants = {
    survey: jobTypeColorClasses.survey[purpose],
    data: jobTypeColorClasses.data[purpose],
    cad: jobTypeColorClasses.cad[purpose],
    qa: jobTypeColorClasses.qa[purpose],
  };
  
  return colorVariants[type] || jobTypeColorClasses.survey[purpose];
};
