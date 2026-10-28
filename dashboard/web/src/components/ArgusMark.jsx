export default function ArgusMark({ size = 21 }) {
  return (
    <svg
      className="argus-mark-art"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.5 20 6v5.1c0 5.1-3.2 8.6-8 10.4-4.8-1.8-8-5.3-8-10.4V6l8-3.5Z" />
      <text
        x="12"
        y="13.2"
        fill="currentColor"
        stroke="none"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontSize="5.1"
        fontWeight="800"
        letterSpacing=".15"
      >
        MVP
      </text>
    </svg>
  );
}
