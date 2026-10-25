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
      <path d="M7.4 12s1.9-3.1 4.6-3.1 4.6 3.1 4.6 3.1-1.9 3.1-4.6 3.1S7.4 12 7.4 12Z" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}
