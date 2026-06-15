export default function RangeInput({
	className,
	min,
	max,
	step,
	value,
	onChange,
}: {
	className: string;
	min: number;
	max: number;
	step: number;
	value: number;
	onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
	return (
		<input
			type="range"
			className={className}
			min={min}
			max={max}
			step={step}
			defaultValue={value}
			style={{"--value": `${value * 100}%`} as React.CSSProperties}
			onChange={onChange}
		/>
	);
}
