/** Símbolo del club Noctua («La Mirada»): dos ojos rasgados. */
export function NoctuaMark({ className, color = "#e9e1cf" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="318 456 444 132" className={className} aria-hidden="true">
      <path d="M566,566 C598,512 660,476 752,466 C742,486 726,512 704,534 C668,570 616,586 566,566 Z" fill={color} />
      <path d="M514,566 C482,512 420,476 328,466 C338,486 354,512 376,534 C412,570 464,586 514,566 Z" fill={color} />
    </svg>
  );
}
