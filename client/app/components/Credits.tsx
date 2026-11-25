import Link from "next/link";

export default async function Credits() {
  "use cache";
  const year = new Date().getFullYear();
  return (
    <section className="flex flex-col gap-1 text-white/85 text-center text-xs border-t border-white/20 pt-3">
      <p>Giochi Loschi © {year}</p>
      <p>
        Made with ♥ by{" "}
        <Link
          href="https://instagram.com/enricocristaudo"
          target="_blank"
          className="underline"
        >
          Enrico
        </Link>
      </p>
    </section>
  );
}
