import clsx from "clsx";

export default function Toggle({isChecked}: {isChecked: boolean}) {
	return (
		<div
			className={clsx(
				"relative block h-[16px] w-[38px] rounded-[99999px] transition-[background-color] duration-100",
				"before:absolute before:top-1/2 before:h-[20px] before:w-[20px] before:-translate-y-1/2 before:rounded-[99999px] before:content-[''] before:transition-[left,background-color,filter] before:duration-100",
				isChecked
					? "bg-[#3280fe] before:left-[18px] before:bg-[#eff5ff] before:[filter:drop-shadow(0_0_6px_#3280fe)]"
					: "bg-[#969aa1] before:left-0 before:bg-[#ebeef3]"
			)}
		></div>
	);
}
