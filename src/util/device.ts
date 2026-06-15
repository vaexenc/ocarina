export function checkIfMobileDevice() {
	// True when the device's primary pointer is coarse (finger/stylus), i.e. a
	// touch device. Unlike `"ontouchstart" in window` or a width check, this does
	// not fire for touchscreen laptops driven by a mouse, or narrow desktop windows.
	return window.matchMedia("(pointer: coarse)").matches;
}
