import {NoteName} from "@/data/song-data";
import A from "@/images/buttons/a.svg?react";
import CDown from "@/images/buttons/c-down.svg?react";
import CLeft from "@/images/buttons/c-left.svg?react";
import CRight from "@/images/buttons/c-right.svg?react";
import CUp from "@/images/buttons/c-up.svg?react";
import {SvgComponent} from "@/util/svg";

// `class` is the Tailwind utility positioning the note vertically within its container
const noteMap: Record<NoteName, {class: string; Image: SvgComponent}> = {
	u: {class: "top-[15%]", Image: CUp},
	d: {class: "top-[85%]", Image: CDown},
	l: {class: "top-[35%]", Image: CLeft},
	r: {class: "top-[66%]", Image: CRight},
	a: {class: "top-[105%]", Image: A},
};

export {noteMap};
