export function debounceFunction(fn: () => void, delay: number) {
	let timeoutId: number;
	return(() => {
		clearInterval(timeoutId);
		timeoutId = setTimeout(() => fn(), delay);
	});
}