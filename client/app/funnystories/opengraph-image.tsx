import { PAGE_COLORS } from "../lib/colors";
import { OG_SIZE, SheetsArt, ogImage } from "../lib/og";

export const alt = "Funny Stories su Giochi Loschi: il foglio piegato, sul telefono";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    background: PAGE_COLORS.orange,
    eyebrow: "Giochi Loschi",
    title: "Funny Stories",
    subtitle: "Rispondi alla cieca, passa il foglio e ridi delle storie alla fine.",
    art: <SheetsArt />,
  });
}
