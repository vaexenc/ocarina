import {useRef} from "react";

export default function RangeInput({
	className,
	min,
	max,
	step,
	value,
	onChange,
	onChangeDebounce,
}: {
	className: string;
	min: number;
	max: number;
	step: number;
	value: number;
	onChange: React.ChangeEventHandler<HTMLInputElement>;
	onChangeDebounce: () => void;
}) {
	const timeoutRef = useRef<NodeJS.Timeout>();

	return (
		<input
			type="range"
			className={className}
			min={min}
			max={max}
			step={step}
			defaultValue={value}
			style={{"--value": value * 100 + "%"} as React.CSSProperties}
			onChange={(e) => {
				onChange(e);

				if (timeoutRef) {
					clearTimeout(timeoutRef.current);
				}

				timeoutRef.current = setTimeout(onChangeDebounce, 200);
			}}
		/>
	);
}
