/**
 * Formats a Date object into a standard time string (e.g. "04:30 PM")
 * 
 * @param {Date} [date] - Date object, defaults to current time
 * @returns {string} Formatted time string
 */
export const formatTime = (date = new Date()) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Strips markdown styling and unwanted characters from text (if necessary)
 * 
 * @param {string} text - Raw input text
 * @returns {string} Cleaned text
 */
export const cleanText = (text) => {
  if (!text) return "";
  return text.trim();
};
