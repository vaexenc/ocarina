export default function RangeInput({
	className,
	ariaLabel,
	min,
	max,
	step,
	value,
	onChange,
}: {
	className: string;
	ariaLabel: string;
	min: number;
	max: number;
	step: number;
	value: number;
	onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
	return (
		<input
			type="range"
			aria-label={ariaLabel}
			// The visual track is a 0–1 fraction; announce it as a percentage instead.
			aria-valuetext={`${Math.round(value * 100)}%`}
			className={className}
			min={min}
			max={max}
			step={step}
			value={value}
			style={{"--value": `${value * 100}%`} as React.CSSProperties}
			onChange={onChange}
		/>
	);
}
