import az from "./az";
import ru from "./ru";
import en from "./en";

export const dictionaries = { az, ru, en };

export const languages = [
  { code: "az", label: "AZ", name: "Azərbaycan" },
  { code: "ru", label: "RU", name: "Русский" },
  { code: "en", label: "EN", name: "English" },
];

export function getDictionary(locale) {
  return dictionaries[locale] || dictionaries.az;
}