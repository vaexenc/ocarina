import {useRef, useState, useMemo} from "react";
import style from "./LoadingScreen.module.less";
import Color from "color";
import {clamp, map} from "/src/util";
import clsx from "clsx";

function TestRangeInput({
	progress,
	onChange
}: {
	progress: number;
	onChange: (e: React.ChangeEvent) => void;
}) {
	return (
		<div className={style["test-range-input-container"]}>
			<input
				type="range"
				className="test-range-input"
				min="0"
				max="100"
				step="0.01"
				defaultValue={progress}
				onChange={onChange}
			/>
			<span className="value">{progress}</span>
		</div>
	);
}

function StoneSymbol({
	className,
	style,
	name,
	iconName
}: {
	className: string;
	style: React.CSSProperties;
	name: string;
	iconName: string;
}) {
	return (
		<div className={className} style={style}>
			<div className="animation-layer-vertical">
				<div className={clsx("stone-symbol", name, iconName)}></div>
			</div>
		</div>
	);
}

export default function LoadingScreen() {
	const [progress, setProgress] = useState(0);
	const [visible, setVisible] = useState(true);
	const [isFadingOut, setIsFadingOut] = useState(false);
	const triforceRef = useRef<HTMLImageElement>(null);

	const stoneSymbolData = useMemo(
		() => [
			{
				className: clsx("stone-symbol-container", {hidden: progress <= 0}),
				style: {
					"--color": Color("#ffffff")
						.mix(Color("#00c14f"), clamp(map(progress, 0, 33, 0, 1), 0, 1) * 1)
						.hex()
				} as React.CSSProperties,
				name: "kokiri",
				iconName: "icon-kokiri"
			},
			{
				className: clsx("stone-symbol-container", {hidden: progress < 33}),
				style: {
					"--color": Color("#ffffff")
						.mix(Color("#f22700"), clamp(map(progress, 33, 66, 0, 1), 0, 1) * 1)
						.hex()
				} as React.CSSProperties,
				name: "goron",
				iconName: "icon-goron"
			},
			{
				className: clsx("stone-symbol-container", {hidden: progress < 66}),
				style: {
					"--color": Color("#ffffff")
						.mix(Color("#007dcc"), clamp(map(progress, 66, 100, 0, 1), 0, 1) * 1)
						.hex()
				} as React.CSSProperties,
				name: "zora",
				iconName: "icon-zora"
			}
		],
		[progress]
	);

	function testInputOnChange(e: React.ChangeEvent) {
		const target = e.target as HTMLInputElement;
		setProgress(Number(target.value));
	}

	return (
		visible && (
			<>
				<TestRangeInput progress={progress} onChange={testInputOnChange} />
				<div
					className={clsx(style["loading-screen"], {
						[style.loaded]: progress >= 100,
						[style["fading-out"]]: isFadingOut
					})}
					onClick={() => {
						if (progress >= 100) {
							setIsFadingOut(true);
							setTimeout(() => {
								setVisible(false);
							}, 600);
						}
					}}
				>
					<div className="loading-screen-content">
						<div className={"stone-symbols"}>
							{stoneSymbolData.map((v) => (
								<StoneSymbol
									key={v.name}
									className={v.className}
									style={v.style}
									name={v.name}
									iconName={v.iconName}
								/>
							))}
						</div>
						<div
							className={clsx("progress-bar-container", {"hidden": progress >= 100})}
						>
							<div
								className="bar"
								style={
									{
										"--progress": `${progress}%`
									} as React.CSSProperties
								}
							></div>
						</div>
						<img
							className={clsx("triforce", {"hidden": progress < 100})}
							src="images/icons/triforce.svg"
							ref={triforceRef}
						/>
					</div>
				</div>
			</>
		)
	);
}
