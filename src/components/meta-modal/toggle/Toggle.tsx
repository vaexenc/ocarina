import clsx from "clsx";
import style from "./Toggle.module.scss";

export default function Toggle({isChecked}: {isChecked: boolean}) {
	return (
		// <label className={style.toggle}>
		// 	<input className="input" type="checkbox" defaultChecked={isChecked} />
		// 	<div className="slider"></div>
		// </label>

		<div className={clsx(style.toggle, {[style.checked]: isChecked})}></div>
	);
}
