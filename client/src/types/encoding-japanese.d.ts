declare module 'encoding-japanese' {
  export function decode(
    data: Uint8Array | number[],
    options?: { type?: string }
  ): string;
  
  export function encode(
    str: string,
    options?: { type?: string }
  ): Uint8Array;
  
  export function convert(
    data: Uint8Array | number[] | string,
    options?: { from?: string; to?: string }
  ): Uint8Array | string;
  
  export function detect(data: Uint8Array | number[] | string): string;
}
