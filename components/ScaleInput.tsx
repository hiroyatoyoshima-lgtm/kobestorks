"use client";

export default function ScaleInput({
  value,
  onChange,
  max = 5,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const options = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="scale">
      {options.map((n) => (
        <button
          key={n}
          type="button"
          className={n === value ? "sel" : ""}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
