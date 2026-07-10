declare module '@tourism/tokens/theme' {
  export const theme: {
    colors: {
      light: Record<string, string>;
      dark: Record<string, string>;
    };
    radius: { base: string };
  };
  export default theme;
}
