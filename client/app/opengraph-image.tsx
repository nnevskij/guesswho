import { PAGE_COLORS } from "./lib/colors";
import { CatalogueArt, OG_SIZE, ogImage } from "./lib/og";

export const alt = "Giochi Loschi: giochi da fare insieme, ognuno con il suo telefono";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    background: PAGE_COLORS.violet,
    eyebrow: "giochiloschi.com",
    title: "Giochi Loschi",
    subtitle: "Giochi da fare nella stessa stanza, ognuno con il suo telefono.",
    art: <CatalogueArt />,
  });
}
