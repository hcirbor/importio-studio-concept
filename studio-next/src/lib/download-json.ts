export function downloadJson(filename: string, value: unknown) {
  const contents = JSON.stringify(value, null, 2);
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
