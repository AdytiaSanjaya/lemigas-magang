import Image from "next/image";

export default function LembagasLogo({
  className = "h-10 w-10",
}: {
  className?: string;
}) {
  return (
    <Image
      src="/logo-lemigas.png"
      alt="Logo LEMIGAS"
      width={48}
      height={48}
      className={`${className} object-contain`}
    />
  );
}
