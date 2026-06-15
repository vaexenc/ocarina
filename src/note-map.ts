import CUp from "/src/images/buttons/c-up.svg?react";
import CDown from "/src/images/buttons/c-down.svg?react";
import CLeft from "/src/images/buttons/c-left.svg?react";
import CRight from "/src/images/buttons/c-right.svg?react";
import A from "/src/images/buttons/a.svg?react";
import {NoteName, SvgComponent} from "/src/types";

const noteMap: Record<NoteName, {class: string; Image: SvgComponent}> = {
	u: {class: "note-up", Image: CUp},
	d: {class: "note-down", Image: CDown},
	l: {class: "note-left", Image: CLeft},
	r: {class: "note-right", Image: CRight},
	a: {class: "note-a", Image: A},
};

export {noteMap};
