/** Shared SVG symbols: the feather mark, its sparkle, and the GitHub mark. */
export function Sprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <symbol id="feather" viewBox="270 150 540 680">
        <g transform="rotate(38 512 512)">
          <path
            fill="currentColor"
            d="M516 150C576 214 600 320 596 420L572 436 594 452C588 552 562 640 528 712L512 722 496 712C464 652 440 590 432 530L456 512 428 500C424 420 436 330 458 262L482 252 468 232C482 196 498 168 516 150Z"
          />
          <path d="M512 722L512 850" stroke="currentColor" strokeWidth="20" strokeLinecap="round" />
        </g>
      </symbol>
      <symbol id="star" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 0C12.9 7.2 16.8 11.1 24 12 16.8 12.9 12.9 16.8 12 24 11.1 16.8 7.2 12.9 0 12 7.2 11.1 11.1 7.2 12 0Z" />
      </symbol>
      <symbol id="gh" viewBox="0 0 16 16">
        <path
          fill="currentColor"
          d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
        />
      </symbol>
    </svg>
  );
}

export const GitHubIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} aria-hidden="true">
    <use href="#gh" />
  </svg>
);

export const Twinkle = () => (
  <svg className="twinkle" aria-hidden="true">
    <use href="#star" />
  </svg>
);
