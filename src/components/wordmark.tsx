import Image from "next/image";

export function Wordmark({ height = 32 }: { height?: number }) {
  const width = Math.round(height * (354 / 160));
  return (
    <span className="inline-flex" style={{ height, width }}>
      <Image
        src="/logo/wordmark-light.png"
        alt="Wortwinkel"
        width={width}
        height={height}
        priority
        className="dark:hidden"
      />
      <Image
        src="/logo/wordmark-dark.png"
        alt="Wortwinkel"
        width={width}
        height={height}
        priority
        className="hidden dark:block"
      />
    </span>
  );
}
