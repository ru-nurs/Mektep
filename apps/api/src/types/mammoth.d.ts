declare module "mammoth" {
  const mammoth: {
    extractRawText(input: { path: string }): Promise<{ value: string; messages: unknown[] }>;
  };

  export default mammoth;
}
