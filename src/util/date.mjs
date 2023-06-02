export function formatDate(date) {
	const options = {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: true
	};
	return date.toLocaleString('pt-BR', options);
}
