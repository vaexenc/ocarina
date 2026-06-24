import type {FunctionComponent, SVGProps} from "react";

// An SVG imported as a React component via vite-plugin-svgr's `?react` query.
export type SvgComponent = FunctionComponent<SVGProps<SVGSVGElement> & {title?: string}>;
