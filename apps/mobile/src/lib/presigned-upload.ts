export async function readLocalFileBlob(uri: string) {
  return await new Promise<Blob>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onerror = () => reject(new Error("Unable to read the selected file."));
    request.onload = () => resolve(request.response as Blob);
    request.responseType = "blob";
    request.open("GET", uri, true);
    request.send();
  });
}

export async function uploadPresignedFile({
  uri,
  uploadUrl,
  headers
}: {
  uri: string;
  uploadUrl: string;
  headers?: Record<string, string>;
}) {
  const body = await readLocalFileBlob(uri);
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}.`);
  }
}
