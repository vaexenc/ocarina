import A from "/src/images/buttons/a.svg?react";
import CDown from "/src/images/buttons/c-down.svg?react";
import CLeft from "/src/images/buttons/c-left.svg?react";
import CRight from "/src/images/buttons/c-right.svg?react";
import CUp from "/src/images/buttons/c-up.svg?react";
import {NoteName, SvgComponent} from "/src/types";

// `class` is the Tailwind utility positioning the note vertically within its container
const noteMap: Record<NoteName, {class: string; Image: SvgComponent}> = {
	u: {class: "top-[15%]", Image: CUp},
	d: {class: "top-[85%]", Image: CDown},
	l: {class: "top-[35%]", Image: CLeft},
	r: {class: "top-[66%]", Image: CRight},
	a: {class: "top-[105%]", Image: A},
};

export {noteMap};
