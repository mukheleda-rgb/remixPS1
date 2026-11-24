
export const hapticFeedback = (type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "medium") => {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;

  switch (type) {
    case "light":
      navigator.vibrate(10);
      break;
    case "medium":
      navigator.vibrate(20);
      break;
    case "heavy":
      navigator.vibrate(50);
      break;
    case "success":
      navigator.vibrate([10, 30, 10]);
      break;
    case "warning":
      navigator.vibrate([20, 50, 20]);
      break;
    case "error":
      navigator.vibrate([50, 50, 50, 50, 50]);
      break;
    default:
      navigator.vibrate(20);
  }
};
