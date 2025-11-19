export function encodeUint8ArraysToString(arr1: Uint8Array, arr2: Uint8Array): string {
  const lengthInfo = `${arr1.length},${arr2.length}|`;
  
  const combined = new Uint8Array(arr1.length + arr2.length);
  combined.set(arr1);
  combined.set(arr2, arr1.length);
  
  const base64 = btoa(String.fromCharCode(...combined));
  
  return lengthInfo + base64;
}

export function decodeStringToUint8Arrays(encodedString: string): [Uint8Array, Uint8Array] {
  const separatorIndex = encodedString.indexOf('|');
  if (separatorIndex === -1) {
    throw new Error('Invalid encoded string format');
  }
  
  const lengthInfo = encodedString.substring(0, separatorIndex);
  const base64Data = encodedString.substring(separatorIndex + 1);

  const lengths = lengthInfo.split(',');
  if (lengths.length !== 2) {
    throw new Error('Invalid length information');
  }
  
  const length1 = parseInt(lengths[0], 10);
  const length2 = parseInt(lengths[1], 10);
  
  // 解码 base64 数据
  const binaryString = atob(base64Data);
  const combined = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    combined[i] = binaryString.charCodeAt(i);
  }
  
  // 分离两个数组
  const arr1 = combined.slice(0, length1);
  const arr2 = combined.slice(length1, length1 + length2);
  
  return [arr1, arr2];
}