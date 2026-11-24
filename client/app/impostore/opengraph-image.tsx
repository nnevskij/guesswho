import { PAGE_COLORS } from "../lib/colors";
import { CardsArt, OG_SIZE, ogImage } from "../lib/og";

export const alt = "Impostore su ACpicchia!: tutti hanno la stessa parola, tranne uno";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    background: PAGE_COLORS.coral,
    eyebrow: "ACpicchia!",
    title: "Impostore",
    subtitle: "Tutti hanno la stessa parola, tranne uno. Riuscirete a scoprirlo?",
    art: <CardsArt />,
  });
}
