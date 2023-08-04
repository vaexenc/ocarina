import {useRef, useState} from "react";
import style from "./LoadingScreen.module.less";
import Color from "color";
import {clamp, map} from "../../util";

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

export default function LoadingScreen() {
	const [progress, setProgress] = useState(0);
	const [visible, setVisible] = useState(true);
	const [isFadingOut, setIsFadingOut] = useState(false);
	const triforceRef = useRef<HTMLImageElement>(null);

	function testInputOnChange(e: React.ChangeEvent) {
		const target = e.target as HTMLInputElement;
		setProgress(Number(target.value));
	}

	return (
		visible && (
			<>
				<TestRangeInput progress={progress} onChange={testInputOnChange} />
				<div
					className={
						style["loading-screen"] +
						(progress >= 100 ? " " + style["loaded"] : "") +
						(isFadingOut ? " " + style["fading-out"] : "")
					}
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
						<div className={`stone-symbols`}>
							<div
								className={
									"stone-symbol-container " + (progress > 0 ? "" : " hidden")
								}
								style={
									{
										"--color": Color("#ffffff")
											.mix(
												Color("#00c14f"),
												clamp(map(progress, 0, 33, 0, 1), 0, 1) * 1
											)
											.hex()
									} as React.CSSProperties
								}
							>
								<div className="animation-layer-vertical">
									<div className="stone-symbol kokiri icon-kokiri"></div>
								</div>
							</div>
							<div
								className={
									"stone-symbol-container " + (progress >= 33 ? "" : " hidden")
								}
								style={
									{
										"--color": Color("#ffffff")
											.mix(
												Color("#f22700"),
												clamp(map(progress, 33, 66, 0, 1), 0, 1) * 1
											)
											.hex()
									} as React.CSSProperties
								}
							>
								<div className="animation-layer-vertical">
									<div className="stone-symbol goron icon-goron"></div>
								</div>
							</div>
							<div
								className={
									"stone-symbol-container" + (progress >= 66 ? "" : " hidden")
								}
								style={
									{
										"--color": Color("#ffffff")
											.mix(
												Color("#007dcc"),
												clamp(map(progress, 66, 100, 0, 1), 0, 1) * 1
											)
											.hex()
									} as React.CSSProperties
								}
							>
								<div className="animation-layer-vertical">
									<div className="stone-symbol zora icon-zora"></div>
								</div>
							</div>
						</div>
						<div
							className={"progress-bar-container" + (progress < 100 ? "" : " hidden")}
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
							className={"triforce" + (progress < 100 ? " hidden" : "")}
							src="images/icons/triforce.svg"
							ref={triforceRef}
						/>
					</div>
				</div>
			</>
		)
	);
}
