import { PAGE_COLORS } from "../lib/colors";
import { OG_SIZE, TokensArt, ogImage } from "../lib/og";

export const alt = "Guess Who su Giochi Loschi: entra nella stanza e scegli un personaggio segreto";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    background: PAGE_COLORS.violet,
    eyebrow: "Giochi Loschi",
    title: "Guess Who",
    subtitle: "Scegli un personaggio segreto, poi indovina chi ha scelto cosa.",
    art: <TokensArt />,
  });
}
