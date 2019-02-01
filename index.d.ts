declare module 'json-stringify-pretty-compact' {
  const stringify: (object: any, options?: {
      indent?: number | string,
      maxLength?: number,
  }) => string;
  export = stringify;
}
